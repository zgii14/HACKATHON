import base64
import hashlib
import hmac
import json
import time
import unittest
import uuid
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import CandidateProfile, User
from app.services.svix_verify import verify

SECRET_BYTES = b"supersecretkey-for-tests-123456"
SECRET = "whsec_" + base64.b64encode(SECRET_BYTES).decode()


def sign(body: bytes, ts: int, msg_id: str = "msg_1") -> dict:
    digest = hmac.new(SECRET_BYTES, f"{msg_id}.{ts}.".encode() + body, hashlib.sha256).digest()
    return {"svix-id": msg_id, "svix-timestamp": str(ts), "svix-signature": "v1," + base64.b64encode(digest).decode()}


class SvixTests(unittest.TestCase):
    def test_valid(self):
        body = b'{"type":"user.updated"}'
        ts = int(time.time())
        self.assertTrue(verify(SECRET, sign(body, ts), body, now=ts))

    def test_tampered_body(self):
        ts = int(time.time())
        self.assertFalse(verify(SECRET, sign(b"{}", ts), b'{"x":1}', now=ts))

    def test_wrong_secret(self):
        body = b"{}"
        ts = int(time.time())
        other = "whsec_" + base64.b64encode(b"another-secret-value-0000000").decode()
        self.assertFalse(verify(other, sign(body, ts), body, now=ts))

    def test_stale_timestamp(self):
        body = b"{}"
        ts = int(time.time()) - 3600
        self.assertFalse(verify(SECRET, sign(body, ts), body, now=ts + 3600))

    def test_missing_headers_or_secret(self):
        body = b"{}"
        ts = int(time.time())
        self.assertFalse(verify(SECRET, {}, body, now=ts))
        self.assertFalse(verify("", sign(body, ts), body, now=ts))

    def test_multiple_signatures_one_valid(self):
        body = b"{}"
        ts = int(time.time())
        headers = sign(body, ts)
        headers["svix-signature"] = "v1,AAAA " + headers["svix-signature"]
        self.assertTrue(verify(SECRET, headers, body, now=ts))


def github_account(gh_id: int) -> dict:
    return {"provider": "oauth_github", "provider_user_id": str(gh_id), "verification": {"status": "verified"}}


class ClerkWebhookApiTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, expire_on_commit=False)
        db = self.Session()
        self.user = User(id=uuid.uuid4(), clerk_user_id="user_a", email="a@example.com", role="candidate")
        db.add_all([
            self.user,
            CandidateProfile(
                user_id=self.user.id,
                github_user_id=1001,
                github_username="octo",
                github_signals={"languages": {"Python": 1}},
                cv_skills=["SQL"],
                merged_skills=["Python", "SQL"],
            ),
        ])
        db.commit()
        db.close()

        def override_db():
            session = self.Session()
            try:
                yield session
            finally:
                session.close()

        app.dependency_overrides[get_db] = override_db
        self.client = TestClient(app)
        self.secret_patch = patch("app.routers.webhooks.settings.clerk_webhook_secret", SECRET)
        self.secret_patch.start()

    def tearDown(self):
        self.secret_patch.stop()
        self.client.close()
        app.dependency_overrides.clear()

    def _post(self, event: dict, signed: bool = True):
        body = json.dumps(event).encode()
        headers = {"content-type": "application/json"}
        if signed:
            headers.update(sign(body, int(time.time())))
        return self.client.post("/webhooks/clerk", content=body, headers=headers)

    def _profile(self) -> CandidateProfile:
        db = self.Session()
        try:
            return db.query(CandidateProfile).one()
        finally:
            db.close()

    def test_unsigned_rejected(self):
        res = self._post({"type": "user.updated", "data": {"id": "user_a"}}, signed=False)
        self.assertEqual(res.status_code, 401)
        self.assertEqual(self._profile().github_user_id, 1001)

    def test_disconnected_github_revokes(self):
        res = self._post({"type": "user.updated", "data": {"id": "user_a", "external_accounts": []}})
        self.assertEqual(res.status_code, 200, res.text)
        prof = self._profile()
        self.assertIsNone(prof.github_user_id)
        self.assertEqual(prof.merged_skills, ["SQL"])

    def test_same_github_keeps_profile(self):
        res = self._post({"type": "user.updated", "data": {"id": "user_a", "external_accounts": [github_account(1001)]}})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(self._profile().github_user_id, 1001)

    def test_other_events_ignored(self):
        res = self._post({"type": "user.created", "data": {"id": "user_a", "external_accounts": []}})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(self._profile().github_user_id, 1001)

    def test_unknown_user_ok(self):
        res = self._post({"type": "user.updated", "data": {"id": "user_zzz", "external_accounts": []}})
        self.assertEqual(res.status_code, 200)
