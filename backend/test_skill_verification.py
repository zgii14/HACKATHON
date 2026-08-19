"""Unit tests untuk verifikasi skill berbasis bukti commit GitHub."""

import unittest
from datetime import datetime, timedelta, timezone

from app.services.skill_verification import (
    MAHIR_MIN_REPOS,
    compute_repo_authenticity,
    verify_skills,
)

NOW = datetime(2026, 8, 1, tzinfo=timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def make_repo(
    name: str = "api-service",
    own_commits: int = 40,
    languages: dict | None = None,
    *,
    fork: bool = False,
    size: int = 1200,
    stars: int = 0,
    created_at: datetime | None = None,
    pushed_at: datetime | None = None,
    commit_source: str = "repo_commits",
    confidence: str = "high",
) -> dict:
    """Repo organik sebagai baseline; override per-test sesuai skenario."""
    pushed = pushed_at if pushed_at is not None else NOW - timedelta(days=30)
    created = created_at if created_at is not None else pushed - timedelta(days=400)
    return {
        "name": name,
        "html_url": f"https://github.com/user/{name}",
        "fork": fork,
        "own_commits": own_commits,
        "created_at": _iso(created),
        "pushed_at": _iso(pushed),
        "size": size,
        "stars": stars,
        "languages": languages if languages is not None else {"Python": 80000},
        "commit_source": commit_source,
        "confidence": confidence,
    }


def by_skill(result: list[dict]) -> dict[str, dict]:
    return {item["skill"]: item for item in result}


class RepoAuthenticityTests(unittest.TestCase):
    def test_organic_repo_has_high_weight(self):
        self.assertGreater(compute_repo_authenticity(make_repo()), 0.8)

    def test_fork_is_never_evidence(self):
        repo = make_repo(fork=True, own_commits=500, size=99999)
        self.assertEqual(compute_repo_authenticity(repo), 0.0)

    def test_dump_repo_without_own_commits_is_rejected(self):
        repo = make_repo(own_commits=0, size=50000)
        self.assertEqual(compute_repo_authenticity(repo), 0.0)

    def test_single_commit_repo_is_rejected(self):
        self.assertEqual(compute_repo_authenticity(make_repo(own_commits=1)), 0.0)

    def test_empty_repo_size_is_rejected(self):
        self.assertEqual(compute_repo_authenticity(make_repo(size=0)), 0.0)
        self.assertEqual(compute_repo_authenticity(make_repo(size=-10)), 0.0)

    def test_fallback_commit_source_is_rejected(self):
        repo = make_repo(own_commits=99, commit_source="fallback", confidence="low")
        self.assertEqual(compute_repo_authenticity(repo), 0.0)

    def test_pushed_before_created_gives_zero_span(self):
        pushed = NOW - timedelta(days=200)
        repo = make_repo(created_at=pushed + timedelta(days=10), pushed_at=pushed)
        # Hanya komponen volume yang tersisa (span = 0)
        self.assertLess(compute_repo_authenticity(repo), 0.61)
        self.assertGreater(compute_repo_authenticity(repo), 0.0)

    def test_invalid_dates_do_not_crash(self):
        repo = make_repo()
        repo["created_at"] = "not-a-date"
        repo["pushed_at"] = None
        self.assertGreaterEqual(compute_repo_authenticity(repo), 0.0)

    def test_non_dict_input(self):
        self.assertEqual(compute_repo_authenticity(None), 0.0)
        self.assertEqual(compute_repo_authenticity("repo"), 0.0)


class VerifySkillsTests(unittest.TestCase):
    def test_empty_signals(self):
        self.assertEqual(verify_skills(None, as_of=NOW), [])
        self.assertEqual(verify_skills({}, as_of=NOW), [])
        self.assertEqual(verify_skills({"repos_detail": []}, as_of=NOW), [])

    def test_missing_repos_detail_returns_empty(self):
        legacy = {"username": "octocat", "languages": {"Python": 90000}, "topics": ["react"]}
        self.assertEqual(verify_skills(legacy, as_of=NOW), [])

    def test_repos_detail_wrong_type_returns_empty(self):
        self.assertEqual(verify_skills({"repos_detail": "nope"}, as_of=NOW), [])

    def test_dump_repo_produces_no_verified_skill(self):
        signals = {"repos_detail": [make_repo(own_commits=0, size=90000)]}
        self.assertEqual(verify_skills(signals, as_of=NOW), [])

    def test_one_commit_repo_is_not_verified(self):
        signals = {"repos_detail": [make_repo(own_commits=1)]}
        self.assertEqual(verify_skills(signals, as_of=NOW), [])

    def test_fork_repo_is_not_counted(self):
        signals = {"repos_detail": [make_repo(fork=True, own_commits=200, size=50000)]}
        self.assertEqual(verify_skills(signals, as_of=NOW), [])

    def test_organic_repo_is_verified(self):
        signals = {"repos_detail": [make_repo(own_commits=30)]}
        result = verify_skills(signals, as_of=NOW)
        self.assertEqual(len(result), 1)
        item = result[0]
        self.assertEqual(item["skill"], "Python")
        self.assertTrue(item["verified"])
        self.assertGreater(item["score"], 0)
        self.assertEqual(item["evidence"]["own_commits"], 30)
        self.assertEqual(item["evidence"]["repos"], 1)
        self.assertEqual(item["evidence"]["confidence"], "high")
        self.assertIn("api-service", item["evidence"]["repo_names"])
        self.assertIn("https://github.com/user/api-service", item["evidence"]["repo_urls"])

    def test_three_repos_can_reach_mahir(self):
        signals = {
            "repos_detail": [
                make_repo(name=f"svc-{i}", own_commits=40, languages={"Python": 80000})
                for i in range(MAHIR_MIN_REPOS)
            ]
        }
        item = verify_skills(signals, as_of=NOW)[0]
        self.assertEqual(item["level"], "mahir")
        self.assertEqual(item["evidence"]["repos"], MAHIR_MIN_REPOS)

    def test_high_score_single_repo_cannot_be_mahir(self):
        signals = {"repos_detail": [make_repo(own_commits=50, languages={"Python": 5_000_000})]}
        item = verify_skills(signals, as_of=NOW)[0]
        self.assertNotEqual(item["level"], "mahir")

    def test_stale_usage_cannot_be_mahir(self):
        old = NOW - timedelta(days=800)
        signals = {
            "repos_detail": [
                make_repo(
                    name=f"svc-{i}",
                    own_commits=40,
                    languages={"Python": 400000},
                    pushed_at=old,
                    created_at=old - timedelta(days=400),
                )
                for i in range(MAHIR_MIN_REPOS)
            ]
        }
        item = verify_skills(signals, as_of=NOW)[0]
        self.assertNotEqual(item["level"], "mahir")

    def test_low_volume_stays_pemula(self):
        signals = {"repos_detail": [make_repo(own_commits=3, languages={"Python": 40})]}
        item = verify_skills(signals, as_of=NOW)[0]
        self.assertEqual(item["level"], "pemula")

    def test_time_decay_lowers_score_and_level(self):
        signals = {
            "repos_detail": [
                make_repo(name=f"svc-{i}", own_commits=40, languages={"Python": 80000})
                for i in range(MAHIR_MIN_REPOS)
            ]
        }
        fresh = verify_skills(signals, as_of=NOW)[0]
        later = verify_skills(signals, as_of=NOW + timedelta(days=730))[0]
        self.assertLess(later["score"], fresh["score"])
        self.assertEqual(fresh["level"], "mahir")
        self.assertNotEqual(later["level"], "mahir")

    def test_multiple_languages_tracked_separately(self):
        signals = {
            "repos_detail": [
                make_repo(name="api", own_commits=30, languages={"Python": 90000}),
                make_repo(name="web", own_commits=25, languages={"JavaScript": 45000}),
            ]
        }
        result = by_skill(verify_skills(signals, as_of=NOW))
        self.assertEqual(set(result), {"Python", "JavaScript"})
        self.assertEqual(result["Python"]["evidence"]["bytes"], 90000)
        self.assertEqual(result["JavaScript"]["evidence"]["bytes"], 45000)
        self.assertEqual(result["Python"]["evidence"]["repo_names"], ["api"])
        self.assertEqual(result["JavaScript"]["evidence"]["repo_names"], ["web"])

    def test_language_grouping_is_case_insensitive(self):
        signals = {
            "repos_detail": [
                make_repo(name="a", own_commits=30, languages={"Python": 50000}),
                make_repo(name="b", own_commits=30, languages={"python": 30000}),
            ]
        }
        result = verify_skills(signals, as_of=NOW)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["evidence"]["bytes"], 80000)
        self.assertEqual(result[0]["evidence"]["repos"], 2)

    def test_malformed_repo_data_does_not_crash(self):
        signals = {
            "repos_detail": [
                None,
                "junk",
                make_repo(name="no-langs", languages={}),
                {**make_repo(name="bad-langs"), "languages": ["Python"]},
                {**make_repo(name="str-bytes"), "languages": {"Python": "80000"}},
                {**make_repo(name="bool-bytes"), "languages": {"Python": True}},
                {**make_repo(name="neg-bytes"), "languages": {"Python": -5}},
                {**make_repo(name="bad-date"), "created_at": "???", "pushed_at": None},
                {**make_repo(name="neg-size"), "size": -1},
                {**make_repo(name="bool-commits"), "own_commits": True},
                make_repo(name="good", own_commits=30, languages={"Go": 60000}),
            ]
        }
        result = verify_skills(signals, as_of=NOW)
        skills = by_skill(result)
        self.assertIn("Go", skills)
        # Repo bertanggal rusak tetap boleh jadi bukti (span=0), tapi tidak crash
        for item in result:
            self.assertTrue(item["verified"])

    def test_commit_fallback_excluded_but_others_still_verified(self):
        signals = {
            "repos_detail": [
                make_repo(
                    name="unreachable",
                    own_commits=0,
                    languages={"Ruby": 70000},
                    commit_source="fallback",
                    confidence="low",
                ),
                make_repo(name="solid", own_commits=30, languages={"Python": 70000}),
            ]
        }
        skills = by_skill(verify_skills(signals, as_of=NOW))
        self.assertNotIn("Ruby", skills)
        self.assertIn("Python", skills)
        self.assertEqual(skills["Python"]["evidence"]["commit_source"], "repo_commits")

    def test_stars_alone_cannot_verify_a_repo(self):
        signals = {"repos_detail": [make_repo(own_commits=0, stars=5000, size=90000)]}
        self.assertEqual(verify_skills(signals, as_of=NOW), [])

    def test_naive_as_of_is_treated_as_utc(self):
        signals = {"repos_detail": [make_repo(own_commits=30)]}
        result = verify_skills(signals, as_of=datetime(2026, 8, 1))
        self.assertEqual(len(result), 1)

    def test_output_is_json_serializable(self):
        import json

        signals = {"repos_detail": [make_repo(own_commits=30)]}
        payload = verify_skills(signals, as_of=NOW)
        self.assertIsInstance(json.dumps(payload), str)

    def test_build_artifacts_are_filtered_out(self):
        signals = {
            "repos_detail": [
                make_repo(
                    own_commits=40,
                    languages={
                        "Python": 90000,
                        "Procfile": 120,
                        "Batchfile": 400,
                        "Makefile": 900,
                        "Hack": 3000,
                        "Roff": 200,
                    },
                )
            ]
        }
        skills = by_skill(verify_skills(signals, as_of=NOW))
        self.assertEqual(set(skills), {"Python"})

    def test_filter_is_case_insensitive(self):
        signals = {"repos_detail": [make_repo(own_commits=40, languages={"PROCFILE": 500})]}
        self.assertEqual(verify_skills(signals, as_of=NOW), [])

    def test_real_languages_are_kept(self):
        # Dockerfile/SCSS/Blade/Jupyter adalah bukti skill nyata — jangan ikut disaring
        signals = {
            "repos_detail": [
                make_repo(
                    own_commits=40,
                    languages={
                        "Dockerfile": 2000,
                        "SCSS": 15000,
                        "Blade": 12000,
                        "Jupyter Notebook": 40000,
                        "HTML": 9000,
                        "CSS": 8000,
                    },
                )
            ]
        }
        skills = set(by_skill(verify_skills(signals, as_of=NOW)))
        self.assertEqual(
            skills,
            {"Dockerfile", "SCSS", "Blade", "Jupyter Notebook", "HTML", "CSS"},
        )

    def test_results_sorted_by_score_desc(self):
        signals = {
            "repos_detail": [
                make_repo(name="small", own_commits=30, languages={"Go": 1000}),
                make_repo(name="big", own_commits=40, languages={"Python": 200000}),
            ]
        }
        result = verify_skills(signals, as_of=NOW)
        self.assertEqual([item["skill"] for item in result], ["Python", "Go"])


if __name__ == "__main__":
    unittest.main()
