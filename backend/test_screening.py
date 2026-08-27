"""Unit tests untuk penilaian dan perakitan prompt AI screening."""

import unittest

from app.services.screening import (
    CONSIDER_THRESHOLD,
    INTERVIEW_THRESHOLD,
    MAX_DEVIATION,
    CV_DATA_CHAR_CAP,
    MAX_PROVEN_SKILLS,
    PROMPT_VERSION,
    build_activity_block,
    build_proven_block,
    build_screening_prompt,
    build_unverifiable_block,
    clamp_score,
    derive_verdict,
)


def vskill(skill, level="mahir", repos=3, commits=40, last_used="2026-08"):
    """Bentuk item seperti keluaran skill_verification.verify_skills()."""
    return {
        "skill": skill,
        "level": level,
        "evidence": {"repos": repos, "own_commits": commits, "last_used": last_used},
    }


class DeriveVerdictTests(unittest.TestCase):
    def test_at_and_above_interview_threshold(self):
        self.assertEqual(derive_verdict(INTERVIEW_THRESHOLD), "interview")
        self.assertEqual(derive_verdict(100), "interview")

    def test_consider_band(self):
        self.assertEqual(derive_verdict(INTERVIEW_THRESHOLD - 1), "consider")
        self.assertEqual(derive_verdict(CONSIDER_THRESHOLD), "consider")

    def test_below_consider_threshold_is_reject(self):
        self.assertEqual(derive_verdict(CONSIDER_THRESHOLD - 1), "reject")
        self.assertEqual(derive_verdict(0), "reject")

    def test_float_score_is_handled(self):
        self.assertEqual(derive_verdict(59.9), "consider")


class ClampScoreTests(unittest.TestCase):
    def test_score_inside_range_is_unchanged(self):
        self.assertEqual(clamp_score(45, 40), 45)

    def test_score_above_range_is_pulled_down(self):
        self.assertEqual(clamp_score(95, 40), 40 + MAX_DEVIATION)

    def test_score_below_range_is_pulled_up(self):
        self.assertEqual(clamp_score(5, 40), 40 - MAX_DEVIATION)

    def test_never_exceeds_100(self):
        self.assertEqual(clamp_score(100, 95), 100)

    def test_never_below_zero(self):
        self.assertEqual(clamp_score(0, 5), 0)

    def test_no_anchor_means_no_clamping(self):
        # Lowongan tanpa required_skills: anchor tidak bermakna
        self.assertEqual(clamp_score(88, None), 88)
        self.assertEqual(clamp_score(3, None), 3)

    def test_result_is_int(self):
        self.assertIsInstance(clamp_score(45.6, 40), int)


class ProvenBlockTests(unittest.TestCase):
    def test_lists_skill_with_evidence_numbers(self):
        out = build_proven_block([vskill("Python", repos=12, commits=302)])
        self.assertIn("Python", out)
        self.assertIn("mahir", out)
        self.assertIn("12 repo", out)
        self.assertIn("302 commit", out)
        self.assertIn("2026-08", out)

    def test_empty_list_states_absence_without_crashing(self):
        out = build_proven_block([])
        self.assertTrue(out.strip())
        self.assertIn("tidak ada", out.lower())

    def test_caps_at_max_proven_skills(self):
        out = build_proven_block([vskill(f"Lang{i}") for i in range(20)])
        self.assertEqual(out.count("\n") + 1, MAX_PROVEN_SKILLS)

    def test_missing_last_used_does_not_crash(self):
        out = build_proven_block([vskill("Go", last_used=None)])
        self.assertIn("Go", out)


class UnverifiableBlockTests(unittest.TestCase):
    def test_proven_skills_are_excluded(self):
        out = build_unverifiable_block(["Python", "React"], [vskill("Python")])
        self.assertNotIn("Python", out)
        self.assertIn("React", out)

    def test_matching_is_case_insensitive(self):
        out = build_unverifiable_block(["python"], [vskill("Python")])
        self.assertIn("tidak ada", out.lower())

    def test_tooling_is_filtered_out(self):
        out = build_unverifiable_block(["Git", "Docker", "React"], [])
        self.assertNotIn("Git", out)
        self.assertNotIn("Docker", out)
        self.assertIn("React", out)

    def test_tooling_filter_is_case_insensitive(self):
        out = build_unverifiable_block(["GIT", "docker"], [])
        self.assertIn("tidak ada", out.lower())

    def test_all_filtered_states_absence(self):
        out = build_unverifiable_block(["Git"], [])
        self.assertIn("tidak ada", out.lower())

    def test_empty_input_does_not_crash(self):
        self.assertIn("tidak ada", build_unverifiable_block([], []).lower())


class ActivityBlockTests(unittest.TestCase):
    def test_reports_key_numbers(self):
        out = build_activity_block(
            {"public_repos": 50, "repos_analyzed": 48, "commits": 422, "stars": 7}
        )
        for token in ("50", "48", "422", "7"):
            self.assertIn(token, out)

    def test_missing_fields_default_to_zero(self):
        self.assertIn("0", build_activity_block({}))

    def test_none_signals_does_not_crash(self):
        self.assertTrue(build_activity_block(None).strip())


def make_prompt(**overrides):
    kwargs = dict(
        job_title="Frontend Developer (React)",
        job_company="Nusantara Apps",
        job_description="Implement responsive UIs with React.",
        required_skills=["React", "TypeScript"],
        min_experience="1 - 3 tahun pengalaman",
        min_education="Minimal Sarjana (S1)",
        work_type="Hybrid",
        salary="Rp 8 jt - 12 jt",
        cv_json='{"skills": ["React"]}',
        verified_skills=[vskill("TypeScript", level="menengah", repos=1, commits=82)],
        merged_skills=["React", "TypeScript", "Git"],
        signals={"public_repos": 50, "repos_analyzed": 48, "commits": 422, "stars": 0},
        anchor=40,
        matched_note="Skill yang cocok: typescript",
        missing_note="React",
    )
    kwargs.update(overrides)
    return build_screening_prompt(**kwargs)


class BuildPromptTests(unittest.TestCase):
    def test_contains_all_required_blocks(self):
        p = make_prompt()
        for block in (
            "--- JOB ---",
            "--- CV KANDIDAT ---",
            "--- BAHASA YANG TERBUKTI DARI COMMIT PUBLIK ---",
            "--- DI LUAR JANGKAUAN VERIFIKASI ---",
            "--- AKTIVITAS GITHUB ---",
            "--- RULES ---",
        ):
            self.assertIn(block, p)

    def test_includes_job_and_evidence_details(self):
        p = make_prompt()
        self.assertIn("Frontend Developer (React)", p)
        self.assertIn("Nusantara Apps", p)
        self.assertIn("82 commit sendiri", p)

    def test_includes_job_requirement_details(self):
        # Pengalaman/pendidikan/tipe kerja/gaji ikut menentukan kecocokan
        # dan sudah lama jadi bagian fingerprint — jangan sampai hilang.
        p = make_prompt(
            min_experience="1 - 3 tahun pengalaman",
            min_education="Minimal Sarjana (S1)",
            work_type="Hybrid",
            salary="Rp 8 jt - 12 jt",
        )
        self.assertIn("1 - 3 tahun pengalaman", p)
        self.assertIn("Minimal Sarjana (S1)", p)
        self.assertIn("Hybrid", p)
        self.assertIn("Rp 8 jt - 12 jt", p)

    def test_missing_job_details_fall_back_to_placeholder(self):
        p = make_prompt(min_experience="", min_education="", work_type="", salary="")
        self.assertIn("tidak disebutkan", p)

    def test_tooling_absent_from_prompt_body(self):
        p = make_prompt(merged_skills=["Git", "React"])
        self.assertIn("React", p)
        # "Git" hanya boleh muncul dalam kalimat instruksi, bukan sebagai data
        self.assertNotIn("DI LUAR JANGKAUAN VERIFIKASI ---\n    Git", p)

    def test_anchor_block_states_allowed_range(self):
        p = make_prompt(anchor=40)
        self.assertIn("DETERMINISTIC ANCHOR", p)
        self.assertIn("40", p)
        self.assertIn("20", p)   # batas bawah 40-20
        self.assertIn("60", p)   # batas atas 40+20

    def test_no_anchor_block_when_anchor_is_none(self):
        p = make_prompt(anchor=None)
        self.assertNotIn("DETERMINISTIC ANCHOR", p)

    def test_cv_json_is_capped(self):
        # Awal CV harus tetap terkirim, ekornya terpotong
        long_cv = "KEPALA_CV" + "z" * CV_DATA_CHAR_CAP + "EKOR_YANG_HARUS_TERPOTONG"
        p = make_prompt(cv_json=long_cv)
        self.assertIn("KEPALA_CV", p)
        self.assertNotIn("EKOR_YANG_HARUS_TERPOTONG", p)

    def test_cv_shorter_than_cap_is_untouched(self):
        p = make_prompt(cv_json='{"skills": ["React"]}')
        self.assertIn('{"skills": ["React"]}', p)

    def test_instructs_model_not_to_accuse(self):
        p = make_prompt().lower()
        self.assertIn("ketiadaan bukti", p)

    def test_prompt_version_is_set(self):
        self.assertTrue(PROMPT_VERSION)


class FingerprintVersionTests(unittest.TestCase):
    def test_prompt_version_is_part_of_fingerprint(self):
        """Prompt berubah -> cache lama harus otomatis dihitung ulang."""
        import inspect

        from app.routers import recruiter

        src = inspect.getsource(recruiter._screening_fingerprint)
        self.assertIn("PROMPT_VERSION", src)


class EndpointWiringTests(unittest.TestCase):
    def test_endpoint_uses_shared_screening_module(self):
        import inspect

        from app.routers import recruiter

        src = inspect.getsource(recruiter.ai_candidate_screening)
        self.assertIn("build_screening_prompt", src)
        self.assertIn("clamp_score", src)
        self.assertIn("derive_verdict", src)

    def test_endpoint_no_longer_dumps_raw_github_signals(self):
        import inspect

        from app.routers import recruiter

        src = inspect.getsource(recruiter.ai_candidate_screening)
        self.assertNotIn("[:1500]", src)


if __name__ == "__main__":
    unittest.main()
