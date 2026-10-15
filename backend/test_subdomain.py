import unittest
from datetime import datetime, timedelta, timezone

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


if __name__ == "__main__":
    unittest.main()
