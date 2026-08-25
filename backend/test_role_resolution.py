"""
Regresi penentuan role.

Bug yang dicegah: recruiter diam-diam diturunkan jadi candidate karena
RECRUITER_EMAILS kosong, tanpa ada sinyal apa pun ke user.
"""

import unittest
from unittest.mock import patch

from app import auth
from app.auth import (
    describe_recruiter_allowlist,
    is_recruiter_email,
    resolve_effective_role,
)


def with_allowlist(value: str):
    """Ganti RECRUITER_EMAILS sementara tanpa menyentuh .env asli."""
    return patch.object(auth.settings, "recruiter_emails", value)


class RecruiterAllowlistTests(unittest.TestCase):
    def test_demo_account_always_allowed(self):
        with with_allowlist(""):
            self.assertTrue(is_recruiter_email("recruiter@githire.com"))

    def test_email_not_in_allowlist_is_rejected(self):
        with with_allowlist(""):
            self.assertFalse(is_recruiter_email("orang@gmail.com"))

    def test_allowlist_entry_is_accepted(self):
        with with_allowlist("hrd@perusahaan.com"):
            self.assertTrue(is_recruiter_email("hrd@perusahaan.com"))

    def test_matching_ignores_case_and_spaces(self):
        with with_allowlist("  HRD@Perusahaan.com , lain@x.com "):
            self.assertTrue(is_recruiter_email("hrd@perusahaan.com"))
            self.assertTrue(is_recruiter_email("  LAIN@X.COM  "))

    def test_missing_email_is_never_recruiter(self):
        with with_allowlist("hrd@perusahaan.com"):
            self.assertFalse(is_recruiter_email(None))
            self.assertFalse(is_recruiter_email(""))

    def test_empty_allowlist_entries_do_not_match_empty_email(self):
        with with_allowlist(",, ,"):
            self.assertFalse(is_recruiter_email(""))
            self.assertFalse(is_recruiter_email(" "))


class EffectiveRoleTests(unittest.TestCase):
    def test_allowlisted_email_is_recruiter_even_if_db_says_candidate(self):
        with with_allowlist("hrd@perusahaan.com"):
            role, denied = resolve_effective_role("candidate", "hrd@perusahaan.com")
        self.assertEqual(role, "recruiter")
        self.assertFalse(denied)

    def test_allowlisted_email_is_recruiter_even_if_db_role_is_null(self):
        with with_allowlist("hrd@perusahaan.com"):
            role, denied = resolve_effective_role(None, "hrd@perusahaan.com")
        self.assertEqual(role, "recruiter")
        self.assertFalse(denied)

    def test_non_allowlisted_recruiter_is_demoted_and_flagged(self):
        # Inti bug: dulu diturunkan tanpa sinyal apa pun
        with with_allowlist(""):
            role, denied = resolve_effective_role("recruiter", "orang@gmail.com")
        self.assertEqual(role, "candidate")
        self.assertTrue(denied, "penurunan role wajib ditandai, tidak boleh senyap")

    def test_plain_candidate_is_untouched_and_not_flagged(self):
        with with_allowlist(""):
            role, denied = resolve_effective_role("candidate", "orang@gmail.com")
        self.assertEqual(role, "candidate")
        self.assertFalse(denied)

    def test_null_role_stays_null_for_new_user(self):
        # Role null menandakan user baru → frontend yang auto-assign candidate
        with with_allowlist(""):
            role, denied = resolve_effective_role(None, "orang@gmail.com")
        self.assertIsNone(role)
        self.assertFalse(denied)

    def test_resolution_is_idempotent(self):
        # get_current_user memanggil ini di SETIAP request
        with with_allowlist("hrd@perusahaan.com"):
            role, _ = resolve_effective_role("recruiter", "hrd@perusahaan.com")
            for _ in range(3):
                role, denied = resolve_effective_role(role, "hrd@perusahaan.com")
        self.assertEqual(role, "recruiter")
        self.assertFalse(denied)

    def test_removing_email_from_allowlist_revokes_access(self):
        with with_allowlist("hrd@perusahaan.com"):
            self.assertEqual(resolve_effective_role("recruiter", "hrd@perusahaan.com")[0], "recruiter")
        with with_allowlist(""):
            role, denied = resolve_effective_role("recruiter", "hrd@perusahaan.com")
        self.assertEqual(role, "candidate")
        self.assertTrue(denied)


class AllowlistDiagnosticTests(unittest.TestCase):
    """Log startup harus bisa membedakan 'env tidak sampai' dari 'tidak cocok'."""

    def test_empty_env_shows_only_hardcoded_entry(self):
        with with_allowlist(""):
            out = describe_recruiter_allowlist()
        self.assertIn("0 char", out)
        self.assertIn("1 entri", out)

    def test_filled_env_is_counted(self):
        with with_allowlist("hrd@perusahaan.com"):
            out = describe_recruiter_allowlist()
        self.assertIn("2 entri", out)

    def test_full_address_is_never_logged(self):
        with with_allowlist("hrd@perusahaan.com"):
            out = describe_recruiter_allowlist()
        self.assertNotIn("hrd@perusahaan.com", out)
        self.assertIn("@perusahaan.com", out)  # domain tetap terlihat untuk dicocokkan

    def test_diagnostic_agrees_with_actual_check(self):
        # Log yang menghitung himpunannya sendiri bisa berbohong — pastikan sama
        with with_allowlist("hrd@perusahaan.com"):
            self.assertIn("2 entri", describe_recruiter_allowlist())
            self.assertTrue(is_recruiter_email("hrd@perusahaan.com"))
        with with_allowlist(""):
            self.assertIn("1 entri", describe_recruiter_allowlist())
            self.assertFalse(is_recruiter_email("hrd@perusahaan.com"))


if __name__ == "__main__":
    unittest.main()
