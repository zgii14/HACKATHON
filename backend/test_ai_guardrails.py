import os
import unittest
import uuid
from datetime import datetime, timezone

os.environ.setdefault("GEMINI_API_KEY", "test-key")

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.database import Base
from app.models import User
from app.services.ai_guardrails import AiGenerationQuotaError, reserve_ai_generation
from app.services.gemini_service import classify_gemini_error


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

    def test_rate_limit_and_daily_quota_errors_are_distinguished(self):
        self.assertEqual(classify_gemini_error(RuntimeError("429 rate_limit_exceeded")), "rate_limit")
        self.assertEqual(classify_gemini_error(RuntimeError("429 quota_exceeded")), "quota")


if __name__ == "__main__":
    unittest.main()
