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


PDF = b"%PDF-1.4 fake"


class SyncMatrixTests(ConnectApiTests):
    def _sync(self, data=None, with_cv=True):
        files = {"cv": ("cv.pdf", PDF, "application/pdf")} if with_cv else None
        with patch("app.routers.profiles.extract_text_from_pdf", return_value="x" * 50), \
             patch("app.routers.profiles.extract_skills_from_cv_text", return_value=["SQL"]), \
             patch("app.routers.profiles.extract_cv_data_from_text", return_value={"summary": "s"}), \
             patch("app.routers.profiles.reserve_ai_generation"), \
             patch("app.routers.profiles._SYNC_COOLDOWN_SECONDS", 0), \
             patch("app.routers.profiles.github_client.fetch_github_signals", AsyncMock(return_value=SIGNALS)):
            return self.client.post("/profiles/sync", data=data or {}, files=files)

    def test_cv_only_without_github(self):
        res = self._sync()
        self.assertEqual(res.status_code, 200, res.text)
        self.assertIsNone(res.json()["github_username"])
        self.assertIsNone(self._one(CandidateProfile).github_signals)

    def test_github_only_reuses_existing_cv(self):
        db = self.Session()
        prof = db.query(CandidateProfile).one()
        prof.github_user_id = 1001
        prof.github_username = "octo"
        db.commit()
        db.close()
        res = self._sync(with_cv=False)
        self.assertEqual(res.status_code, 200, res.text)
        prof = self._one(CandidateProfile)
        self.assertEqual(prof.github_signals, SIGNALS)
        self.assertEqual(prof.cv_skills, ["SQL"])

    def test_nothing_returns_400(self):
        db = self.Session()
        prof = db.query(CandidateProfile).one()
        prof.cv_skills = None
        prof.cv_data = None
        db.commit()
        db.close()
        self.assertEqual(self._sync(with_cv=False).status_code, 400)

    def test_verified_username_wins_over_typed(self):
        db = self.Session()
        prof = db.query(CandidateProfile).one()
        prof.github_user_id = 1001
        prof.github_username = "octo"
        db.commit()
        db.close()
        res = self._sync({"github_url": "someone-else"})
        self.assertEqual(res.json()["github_username"], "octo")

    def test_legacy_username_not_replaced_by_typed(self):
        db = self.Session()
        prof = db.query(CandidateProfile).one()
        prof.github_username = "legacyuser"
        prof.github_legacy_grandfathered = True
        db.commit()
        db.close()
        res = self._sync({"github_url": "someone-else"})
        self.assertEqual(res.json()["github_username"], "legacyuser")

    def test_transition_typed_username_marks_legacy(self):
        res = self._sync({"github_url": "octo"})
        self.assertEqual(res.status_code, 200, res.text)
        prof = self._one(CandidateProfile)
        self.assertEqual(prof.github_username, "octo")
        self.assertTrue(prof.github_legacy_grandfathered)
        self.assertIsNone(prof.github_user_id)


class GatingAndFlagsTests(ConnectApiTests):
    def test_portfolio_generate_requires_github(self):
        res = self.client.post("/me/portfolio/generate", json={"language": "id", "repo_names": []})
        self.assertEqual(res.status_code, 409, res.text)
        self.assertEqual(res.json()["detail"]["code"], "GITHUB_REQUIRED")

    def test_public_portfolio_exposes_verified_flag(self):
        db = self.Session()
        prof = db.query(CandidateProfile).one()
        prof.github_user_id = 1001
        prof.github_username = "octo"
        db.add(Portfolio(
            user_id=self.user.id, public_id="pubflag", status="published",
            draft_content={}, published_content={"name": "A", "headline": "H", "bio": "B"},
        ))
        db.commit()
        db.close()
        res = self.client.get("/portfolios/pubflag")
        self.assertEqual(res.status_code, 200, res.text)
        self.assertTrue(res.json()["github_verified"])

    def test_recruiter_search_exposes_verified_flag(self):
        db = self.Session()
        legacy_user = User(id=uuid.uuid4(), clerk_user_id="user_l", email="l@example.com", role="candidate")
        db.add_all([legacy_user, CandidateProfile(user_id=legacy_user.id, github_username="legacy", github_legacy_grandfathered=True, merged_skills=["Go"])])
        prof = db.query(CandidateProfile).filter(CandidateProfile.user_id == self.user.id).one()
        prof.github_user_id = 1001
        prof.github_username = "octo"
        db.commit()
        db.close()
        recruiter = User(id=uuid.uuid4(), clerk_user_id="rec", email="recruiter@githire.com", role="recruiter")
        app.dependency_overrides[get_current_user] = lambda: recruiter
        res = self.client.get("/recruiter/candidates/search")
        self.assertEqual(res.status_code, 200, res.text)
        body = res.json()
        items = body if isinstance(body, list) else next(v for v in body.values() if isinstance(v, list))
        flags = {c["github"]: c["github_verified"] for c in items}
        self.assertEqual(flags, {"octo": True, "legacy": False})
