import os
import tempfile
import unittest
import uuid
from datetime import datetime, timezone
from pathlib import Path

os.environ.setdefault("GEMINI_API_KEY", "test-key")

from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import Session

from app.database import Base
from app.models import AiUsageEvent, User
from app.services.ai_guardrails import AiGenerationQuotaError, reserve_ai_generation
from app.services.gemini_service import classify_gemini_error


class NoDatabaseAccessSession:
    """Sentinel untuk memastikan cabang guardrail nonaktif tidak menyentuh DB."""

    def __init__(self):
        self.calls: list[str] = []

    def _unexpected_access(self, name: str):
        self.calls.append(name)
        raise AssertionError(f"disabled guardrail accessed session.{name}")

    def get_bind(self):
        return self._unexpected_access("get_bind")

    def query(self, *args, **kwargs):
        return self._unexpected_access("query")

    def add(self, *args, **kwargs):
        return self._unexpected_access("add")

    def commit(self):
        return self._unexpected_access("commit")

    def rollback(self):
        return self._unexpected_access("rollback")


class ProviderCodeError(RuntimeError):
    def __init__(self, message: str, code):
        super().__init__(message)
        self._code = code

    @property
    def code(self):
        return self._code


class AiGuardrailTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")
        Base.metadata.create_all(bind=self.engine)
        self.session = Session(bind=self.engine)
        self.user = User(id=uuid.uuid4(), clerk_user_id="ai-guardrail-user")
        self.session.add(self.user)
        self.session.commit()

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    def _mark_caller_change_pending(self, email: str) -> None:
        self.user.email = email
        self.assertIn(self.user, self.session.dirty)
        self.assertTrue(self.session.is_modified(self.user))
        self.assertTrue(self.session.in_transaction())

    def _assert_caller_change_is_still_pending(self, email: str) -> None:
        self.assertIn(self.user, self.session.dirty)
        self.assertTrue(self.session.is_modified(self.user))
        self.assertEqual(self.user.email, email)
        self.assertTrue(self.session.in_transaction())

    def test_disabled_limits_create_no_event_or_flush_dirty_caller_session(self):
        user_id = self.user.id
        pending_email = "disabled-limits-pending@example.com"
        self._mark_caller_change_pending(pending_email)

        no_database_access_session = NoDatabaseAccessSession()
        reserve_ai_generation(
            no_database_access_session,
            user_id=user_id,
            feature="cv_parse",
            user_daily_limit=0,
            global_rpm_limit=0,
        )
        self.assertEqual(no_database_access_session.calls, [])

        reserve_ai_generation(
            self.session,
            user_id=user_id,
            feature="cv_parse",
            user_daily_limit=0,
            global_rpm_limit=0,
        )

        with self.subTest("does not flush or commit caller changes"):
            self._assert_caller_change_is_still_pending(pending_email)
        with self.subTest("does not create a usage event"):
            self.assertFalse(
                any(isinstance(instance, AiUsageEvent) for instance in self.session.new)
            )
            with self.session.no_autoflush:
                self.assertEqual(self.session.query(AiUsageEvent).count(), 0)

    def test_successful_reservation_does_not_commit_or_flush_dirty_caller_session(self):
        now = datetime(2026, 9, 10, tzinfo=timezone.utc)
        pending_email = "successful-reservation-pending@example.com"
        database_handle, database_filename = tempfile.mkstemp(
            dir=Path.cwd(), prefix="ai-guardrails-", suffix=".sqlite3"
        )
        os.close(database_handle)
        database_path = Path(database_filename)
        isolated_engine = create_engine(URL.create("sqlite", database=str(database_path)))
        caller_session = None
        reader_session = None
        try:
            Base.metadata.create_all(bind=isolated_engine)
            caller_session = Session(bind=isolated_engine, expire_on_commit=False)
            caller_user = User(
                id=uuid.uuid4(), clerk_user_id="ai-guardrail-successful-reservation-user"
            )
            caller_session.add(caller_user)
            caller_session.commit()
            user_id = caller_user.id
            caller_connection = caller_session.connection()
            caller_user.email = pending_email
            self.assertIn(caller_user, caller_session.dirty)
            self.assertTrue(caller_session.is_modified(caller_user))
            self.assertTrue(caller_session.in_transaction())

            reserve_ai_generation(
                caller_session,
                user_id=user_id,
                feature="cv_parse",
                user_daily_limit=2,
                global_rpm_limit=20,
                now=now,
            )

            self.assertIn(caller_user, caller_session.dirty)
            self.assertTrue(caller_session.is_modified(caller_user))
            self.assertEqual(caller_user.email, pending_email)
            self.assertTrue(caller_session.in_transaction())

            reader_session = Session(bind=isolated_engine)
            reader_connection = reader_session.connection()
            self.assertIsNot(
                caller_connection.connection.driver_connection,
                reader_connection.connection.driver_connection,
            )
            self.assertEqual(
                reader_session.query(AiUsageEvent)
                .filter(
                    AiUsageEvent.user_id == user_id,
                    AiUsageEvent.feature == "cv_parse",
                    AiUsageEvent.created_at == now,
                )
                .count(),
                1,
            )
            self.assertIn(caller_user, caller_session.dirty)
            self.assertTrue(caller_session.is_modified(caller_user))
        finally:
            if reader_session is not None:
                reader_session.close()
            if caller_session is not None:
                caller_session.close()
            isolated_engine.dispose()
            os.unlink(database_path)

    def test_daily_quota_rejection_does_not_rollback_dirty_caller_session(self):
        user_id = self.user.id
        now = datetime(2026, 9, 10, tzinfo=timezone.utc)
        self.session.add(
            AiUsageEvent(
                user_id=user_id,
                feature="cv_parse",
                units=1,
                created_at=now,
            )
        )
        self.session.commit()
        pending_email = "quota-rejection-pending@example.com"
        self._mark_caller_change_pending(pending_email)

        with self.assertRaises(AiGenerationQuotaError) as ctx:
            reserve_ai_generation(
                self.session,
                user_id=user_id,
                feature="cv_parse",
                user_daily_limit=1,
                global_rpm_limit=20,
                now=now,
            )

        self.assertEqual(ctx.exception.scope, "user")
        self._assert_caller_change_is_still_pending(pending_email)

    def test_global_rpm_rejection_does_not_rollback_dirty_caller_session(self):
        user_id = self.user.id
        now = datetime(2026, 9, 10, tzinfo=timezone.utc)
        other_user = User(id=uuid.uuid4(), clerk_user_id="ai-guardrail-global-user")
        self.session.add_all(
            [
                other_user,
                AiUsageEvent(
                    user_id=other_user.id,
                    feature="portfolio_generate",
                    units=2,
                    created_at=now,
                ),
            ]
        )
        self.session.commit()
        pending_email = "global-rpm-rejection-pending@example.com"
        self._mark_caller_change_pending(pending_email)

        with self.assertRaises(AiGenerationQuotaError) as ctx:
            reserve_ai_generation(
                self.session,
                user_id=user_id,
                feature="cv_parse",
                user_daily_limit=5,
                global_rpm_limit=2,
                now=now,
            )

        self.assertEqual(ctx.exception.scope, "global")
        self.assertEqual(ctx.exception.retry_after_seconds, 60)
        self._assert_caller_change_is_still_pending(pending_email)

    def test_daily_quota_blocks_a_second_uncached_generation(self):
        now = datetime(2026, 9, 10, tzinfo=timezone.utc)
        reserve_ai_generation(
            self.session,
            user_id=self.user.id,
            feature="cv_parse",
            user_daily_limit=1,
            global_rpm_limit=20,
            units=2,
            now=now,
        )

        with self.assertRaises(AiGenerationQuotaError) as ctx:
            reserve_ai_generation(
                self.session,
                user_id=self.user.id,
                feature="cv_parse",
                user_daily_limit=1,
                global_rpm_limit=20,
                units=2,
                now=now,
            )

        self.assertEqual(ctx.exception.scope, "user")
        self.assertEqual(ctx.exception.retry_after_seconds, 24 * 60 * 60)

    def test_global_rpm_counts_request_units_from_all_users(self):
        now = datetime(2026, 9, 10, tzinfo=timezone.utc)
        reserve_ai_generation(
            self.session,
            user_id=self.user.id,
            feature="cv_parse",
            user_daily_limit=5,
            global_rpm_limit=3,
            units=2,
            now=now,
        )
        second_user = User(id=uuid.uuid4(), clerk_user_id="ai-guardrail-second-user")
        self.session.add(second_user)
        self.session.commit()

        with self.assertRaises(AiGenerationQuotaError) as ctx:
            reserve_ai_generation(
                self.session,
                user_id=second_user.id,
                feature="portfolio_generate",
                user_daily_limit=5,
                global_rpm_limit=3,
                units=2,
                now=now,
            )

        self.assertEqual(ctx.exception.scope, "global")
        self.assertEqual(ctx.exception.retry_after_seconds, 60)

    def test_gemini_quota_phrases_take_precedence_over_status_codes(self):
        for message in (
            "You exceeded your current quota",
            "quota_exceeded",
            "daily quota reached",
        ):
            with self.subTest(message=message):
                self.assertEqual(classify_gemini_error(RuntimeError(message)), "quota")

        self.assertEqual(
            classify_gemini_error(ProviderCodeError("You exceeded your current quota", 429)),
            "quota",
        )

    def test_gemini_official_rate_limit_markers_are_retryable(self):
        for marker in (
            "rate_limit_exceeded",
            "too_many_requests",
            "resource_exhausted",
            "too many requests",
            "overload",
        ):
            with self.subTest(marker=marker):
                self.assertEqual(classify_gemini_error(RuntimeError(marker)), "rate_limit")

    def test_gemini_raw_status_digits_in_messages_are_not_rate_limits(self):
        self.assertEqual(
            classify_gemini_error(RuntimeError("The user entered error reference 503.")),
            "other",
        )

    def test_gemini_numeric_provider_codes_classify_as_rate_limits(self):
        self.assertEqual(
            classify_gemini_error(ProviderCodeError("provider unavailable", 429)),
            "rate_limit",
        )
        self.assertEqual(
            classify_gemini_error(ProviderCodeError("provider unavailable", 503)),
            "rate_limit",
        )
        self.assertEqual(
            classify_gemini_error(ProviderCodeError("provider unavailable", lambda: 429)),
            "rate_limit",
        )


if __name__ == "__main__":
    unittest.main()
