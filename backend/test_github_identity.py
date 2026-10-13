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
