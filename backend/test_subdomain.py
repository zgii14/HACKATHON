import unittest
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth import get_current_user
from app.config import settings
from app.database import Base, get_db
from app.main import app
from app.models import CandidateProfile, Portfolio, SubdomainHold, User
from app.services import subdomain as sd


class NameRulesTests(unittest.TestCase):
    def test_normalize_trims_and_lowercases(self):
        self.assertEqual(sd.normalize("  RoZagi "), "rozagi")
        self.assertEqual(sd.normalize(None), "")

    def test_valid_names(self):
        for name in ["abc", "rozagi-dev", "a1b", "x" * 30, "123"]:
            self.assertIsNone(sd.invalid_reason(name), name)

    def test_invalid_names(self):
        for name in ["", "ab", "x" * 31, "-abc", "abc-", "ab--c", "ab_c", "ab.c", "ab c", "Rozagi"]:
            self.assertEqual(sd.invalid_reason(name), "invalid", name)

    def test_reserved_names(self):
        for name in ["www", "api", "clerk", "accounts", "clkmail", "admin", "dashboard"]:
            self.assertEqual(sd.invalid_reason(name), "reserved", name)

    def test_next_change_at(self):
        now = datetime(2026, 10, 15, 12, 0, tzinfo=timezone.utc)
        self.assertIsNone(sd.next_change_at(None, now))
        self.assertIsNone(sd.next_change_at(now - timedelta(days=31), now))
        self.assertEqual(sd.next_change_at(now - timedelta(days=29), now), now + timedelta(days=1))

    def test_next_change_at_accepts_naive_datetimes_from_sqlite(self):
        now = datetime(2026, 10, 15, 12, 0, tzinfo=timezone.utc)
        naive = (now - timedelta(days=29)).replace(tzinfo=None)
        self.assertEqual(sd.next_change_at(naive, now), now + timedelta(days=1))


class SubdomainApiTestCase(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, expire_on_commit=False)
        db = self.Session()
        self.u1 = User(id=uuid.uuid4(), clerk_user_id="u1", email="u1@example.com", role="candidate")
        self.u2 = User(id=uuid.uuid4(), clerk_user_id="u2", email="u2@example.com", role="candidate")
        self.u3 = User(id=uuid.uuid4(), clerk_user_id="u3", email="u3@example.com", role="candidate")
        self.p1 = Portfolio(
            id=uuid.uuid4(), user_id=self.u1.id, public_id="pub1", status="published",
            published_content={"name": "Satu", "headline": "Dev", "bio": ""},
        )
        self.p2 = Portfolio(id=uuid.uuid4(), user_id=self.u2.id, public_id="pub2", status="draft")
        db.add_all([
            self.u1, self.u2, self.u3, self.p1, self.p2,
            CandidateProfile(user_id=self.u1.id, github_legacy_grandfathered=True),
        ])
        db.commit()
        db.close()

        def override_db():
            session = self.Session()
            try:
                yield session
            finally:
                session.close()

        self.current = self.u1
        app.dependency_overrides[get_db] = override_db
        app.dependency_overrides[get_current_user] = lambda: self.current
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()

    def claim(self, name):
        return self.client.put("/me/portfolio/subdomain", json={"name": name})

    def check(self, name):
        return self.client.get("/me/portfolio/subdomain/check", params={"name": name}).json()

    def backdate_change(self, portfolio_id, days):
        db = self.Session()
        portfolio = db.get(Portfolio, portfolio_id)
        portfolio.subdomain_changed_at = datetime.now(timezone.utc) - timedelta(days=days)
        db.commit()
        db.close()

    def hold(self, name):
        db = self.Session()
        try:
            return db.get(SubdomainHold, name)
        finally:
            db.close()


class SubdomainClaimTests(SubdomainApiTestCase):
    def test_check_reports_availability_and_reasons(self):
        self.assertEqual(self.check(" Rozagi "), {"name": "rozagi", "available": True, "reason": None})
        self.assertEqual(self.check("www")["reason"], "reserved")
        self.assertEqual(self.check("a")["reason"], "invalid")

    def test_first_claim_sets_name_without_switching_public_url(self):
        res = self.claim("Rozagi")
        self.assertEqual(res.status_code, 200, res.text)
        body = res.json()
        self.assertEqual(body["subdomain"], "rozagi")
        self.assertEqual(body["subdomain_url"], "https://rozagi.githire.my.id")
        self.assertFalse(body["subdomain_live"])
        self.assertEqual(body["public_url"], "/p/pub1")
        self.assertIsNotNone(body["subdomain_changed_at"])

    def test_public_url_uses_subdomain_when_live(self):
        with patch.object(settings, "portfolio_subdomains_live", True):
            body = self.claim("rozagi").json()
        self.assertTrue(body["subdomain_live"])
        self.assertEqual(body["public_url"], "https://rozagi.githire.my.id")

    def test_taken_name_is_rejected(self):
        self.assertEqual(self.claim("rozagi").status_code, 200)
        self.current = self.u2
        res = self.claim("rozagi")
        self.assertEqual(res.status_code, 409, res.text)
        self.assertEqual(self.check("rozagi")["reason"], "taken")

    def test_invalid_and_reserved_names_are_rejected(self):
        self.assertEqual(self.claim("a").status_code, 422)
        self.assertEqual(self.claim("admin").status_code, 422)

    def test_claiming_current_name_again_is_a_noop(self):
        first = self.claim("rozagi").json()
        second = self.claim("ROZAGI")
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.json()["subdomain_changed_at"], first["subdomain_changed_at"])

    def test_change_within_30_days_is_rejected(self):
        self.claim("satu")
        res = self.claim("dua")
        self.assertEqual(res.status_code, 429, res.text)

    def test_change_after_cooldown_holds_old_name(self):
        self.claim("satu")
        self.backdate_change(self.p1.id, 31)
        self.assertEqual(self.claim("dua").status_code, 200)
        hold = self.hold("satu")
        self.assertIsNotNone(hold)
        self.assertEqual(hold.portfolio_id, self.p1.id)
        self.current = self.u2
        self.assertEqual(self.claim("satu").status_code, 409)

    def test_owner_can_reclaim_held_name(self):
        self.claim("satu")
        self.backdate_change(self.p1.id, 31)
        self.claim("dua")
        self.backdate_change(self.p1.id, 31)
        res = self.claim("satu")
        self.assertEqual(res.status_code, 200, res.text)
        self.assertIsNone(self.hold("satu"))
        self.assertIsNotNone(self.hold("dua"))

    def test_expired_hold_is_free_for_others(self):
        db = self.Session()
        db.add(SubdomainHold(name="lama", portfolio_id=self.p1.id, expires_at=datetime.now(timezone.utc) - timedelta(days=1)))
        db.commit()
        db.close()
        self.current = self.u2
        self.assertEqual(self.claim("lama").status_code, 200)

    def test_user_without_portfolio_gets_404(self):
        self.current = self.u3
        self.assertEqual(self.claim("tigaa").status_code, 404)


if __name__ == "__main__":
    unittest.main()
