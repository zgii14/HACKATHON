import unittest
from datetime import datetime, timezone

from app.models import CandidateProfile
from app.services.github_identity import connection_state


class ConnectionStateTests(unittest.TestCase):
    def test_states(self):
        self.assertEqual(connection_state(None), "none")
        self.assertEqual(connection_state(CandidateProfile()), "none")
        self.assertEqual(
            connection_state(CandidateProfile(github_user_id=42, github_verified_at=datetime.now(timezone.utc))),
            "verified",
        )
        self.assertEqual(
            connection_state(CandidateProfile(github_username="octo", github_legacy_grandfathered=True)),
            "legacy_unverified",
        )
        # Penanda legacy tanpa username bukan legacy.
        self.assertEqual(connection_state(CandidateProfile(github_legacy_grandfathered=True)), "none")


from app.services.clerk_client import verified_github_id


class ClerkParsingTests(unittest.TestCase):
    def test_picks_verified_github(self):
        user = {"external_accounts": [
            {"provider": "oauth_google", "provider_user_id": "g1", "verification": {"status": "verified"}},
            {"provider": "oauth_github", "provider_user_id": "583231", "verification": {"status": "verified"}},
        ]}
        self.assertEqual(verified_github_id(user), 583231)

    def test_ignores_unverified_missing_and_malformed(self):
        self.assertIsNone(verified_github_id({}))
        self.assertIsNone(verified_github_id({"external_accounts": None}))
        self.assertIsNone(verified_github_id({"external_accounts": [
            {"provider": "oauth_github", "provider_user_id": "1", "verification": {"status": "unverified"}},
        ]}))
        self.assertIsNone(verified_github_id({"external_accounts": [
            {"provider": "oauth_github", "provider_user_id": "abc", "verification": {"status": "verified"}},
        ]}))


import uuid
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth import get_current_user
from app.database import Base, get_db
from app.main import app
from app.models import Portfolio, User
from app.services import github_identity

SIGNALS = {"languages": {"Python": 100}, "topics": ["fastapi"], "repos_detail": []}


class ConnectApiTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, expire_on_commit=False)
        db = self.Session()
        self.user = User(id=uuid.uuid4(), clerk_user_id="user_a", email="a@example.com", role="candidate")
        self.profile = CandidateProfile(user_id=self.user.id, cv_skills=["SQL"], merged_skills=["SQL"], cv_data={"summary": "s"})
        db.add_all([self.user, self.profile])
        db.commit()
        db.close()

        def override_db():
            session = self.Session()
            try:
                yield session
            finally:
                session.close()

        app.dependency_overrides[get_db] = override_db
        app.dependency_overrides[get_current_user] = lambda: self.user
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()

    def _patches(self, gh_id=1001, login="octo"):
        return (
            patch("app.services.github_identity.fetch_verified_github_id", AsyncMock(return_value=gh_id)),
            patch("app.services.github_identity.fetch_login_by_id", AsyncMock(return_value=login)),
            patch("app.services.github_identity.fetch_github_signals", AsyncMock(return_value=SIGNALS)),
        )

    def _one(self, model):
        db = self.Session()
        try:
            return db.query(model).one()
        finally:
            db.close()

    def test_connect_success_sets_identity_and_merges_skills(self):
        p1, p2, p3 = self._patches()
        with p1, p2, p3:
            res = self.client.post("/profiles/github/connect")
        self.assertEqual(res.status_code, 200, res.text)
        self.assertEqual(res.json()["github_username"], "octo")
        prof = self._one(CandidateProfile)
        self.assertEqual(prof.github_user_id, 1001)
        self.assertIsNotNone(prof.github_verified_at)
        self.assertFalse(prof.github_legacy_grandfathered)
        self.assertIn("Python", prof.merged_skills)
        self.assertIn("SQL", prof.merged_skills)

    def test_not_connected_in_clerk(self):
        p1, p2, p3 = self._patches(gh_id=None)
        with p1, p2, p3:
            res = self.client.post("/profiles/github/connect")
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.json()["detail"]["code"], "GITHUB_NOT_CONNECTED")

    def test_duplicate_github_rejected_without_leaking_owner(self):
        db = self.Session()
        other = User(id=uuid.uuid4(), clerk_user_id="user_b", email="b@example.com", role="candidate")
        db.add_all([other, CandidateProfile(user_id=other.id, github_user_id=1001, github_username="octo")])
        db.commit()
        db.close()
        p1, p2, p3 = self._patches()
        with p1, p2, p3:
            res = self.client.post("/profiles/github/connect")
        self.assertEqual(res.status_code, 409)
        self.assertNotIn("b@example.com", res.text)

    def test_account_change_unpublishes_portfolio(self):
        db = self.Session()
        prof = db.query(CandidateProfile).one()
        prof.github_user_id = 7
        prof.github_username = "old"
        db.add(Portfolio(user_id=self.user.id, public_id="pub1", status="published", draft_content={}, published_content={}))
        db.commit()
        db.close()
        p1, p2, p3 = self._patches(gh_id=1001)
        with p1, p2, p3:
            self.assertEqual(self.client.post("/profiles/github/connect").status_code, 200)
        self.assertEqual(self._one(Portfolio).status, "draft")
        self.assertEqual(self._one(CandidateProfile).github_user_id, 1001)

    def test_reconnect_same_account_keeps_portfolio_published(self):
        db = self.Session()
        prof = db.query(CandidateProfile).one()
        prof.github_user_id = 1001
        prof.github_username = "octo"
        db.add(Portfolio(user_id=self.user.id, public_id="pub3", status="published", draft_content={}, published_content={}))
        db.commit()
        db.close()
        p1, p2, p3 = self._patches(gh_id=1001)
        with p1, p2, p3:
            self.assertEqual(self.client.post("/profiles/github/connect").status_code, 200)
        self.assertEqual(self._one(Portfolio).status, "published")

    def test_revoke_clears_github_data(self):
        db = self.Session()
        prof = db.query(CandidateProfile).one()
        prof.github_user_id = 1001
        prof.github_username = "octo"
        prof.github_signals = SIGNALS
        prof.verified_skills = [{"skill": "Python"}]
        prof.merged_skills = ["Python", "SQL"]
        db.add(Portfolio(user_id=self.user.id, public_id="pub2", status="published", draft_content={}, published_content={}))
        db.commit()
        github_identity.revoke_github(db, prof)
        db.refresh(prof)
        self.assertIsNone(prof.github_user_id)
        self.assertIsNone(prof.github_signals)
        self.assertEqual(prof.verified_skills, [])
        self.assertEqual(prof.merged_skills, ["SQL"])
        self.assertEqual(db.query(Portfolio).one().status, "draft")
        db.close()
