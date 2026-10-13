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
