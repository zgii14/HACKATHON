import os
import unittest
from dataclasses import dataclass, field

os.environ.setdefault("GEMINI_API_KEY", "test-key")

from app.services.market_scope import filter_by_categories, resolve_scope_from_jobs


@dataclass
class FakeJob:
    title: str = "Job"
    required_skills: list = field(default_factory=list)
    categories: list = field(default_factory=list)


class FilterTests(unittest.TestCase):
    def test_only_jobs_sharing_a_category_are_kept(self):
        jobs = [
            FakeJob("BE", categories=["backend"]),
            FakeJob("Data", categories=["data"]),
            FakeJob("FS", categories=["fullstack", "backend", "frontend"]),
        ]
        self.assertEqual([j.title for j in filter_by_categories(jobs, ["backend"])], ["BE", "FS"])

    def test_python_only_data_job_is_not_relevant_to_backend_interest(self):
        jobs = [FakeJob("Analyst", ["Python", "pandas"], ["data"])]
        self.assertEqual(filter_by_categories(jobs, ["backend"]), [])

    def test_uncategorized_jobs_never_match_an_interest(self):
        self.assertEqual(filter_by_categories([FakeJob("X", categories=[])], ["backend"]), [])

    def test_multiple_interests_union_without_duplicates(self):
        jobs = [
            FakeJob("FS", categories=["fullstack", "backend", "frontend"]),
            FakeJob("QA", categories=["qa"]),
        ]
        result = filter_by_categories(jobs, ["backend", "frontend"])
        self.assertEqual([j.title for j in result], ["FS"])

    def test_empty_interests_match_nothing(self):
        self.assertEqual(filter_by_categories([FakeJob("BE", categories=["backend"])], []), [])


class ResolveTests(unittest.TestCase):
    def setUp(self):
        self.jobs = [FakeJob("BE", categories=["backend"]), FakeJob("Data", categories=["data"])]

    def test_auto_with_interests_scopes_to_interests(self):
        scope = resolve_scope_from_jobs(self.jobs, ["backend"], "auto")
        self.assertEqual((scope.effective_mode, scope.fallback_reason), ("interests", None))
        self.assertEqual([j.title for j in scope.jobs], ["BE"])

    def test_auto_without_interests_falls_back_with_reason(self):
        scope = resolve_scope_from_jobs(self.jobs, [], "auto")
        self.assertEqual((scope.effective_mode, scope.fallback_reason), ("all", "no_interests"))
        self.assertEqual(len(scope.jobs), 2)

    def test_interest_without_matching_job_reports_fallback_reason(self):
        scope = resolve_scope_from_jobs(self.jobs, ["game"], "auto")
        self.assertEqual((scope.effective_mode, scope.fallback_reason), ("all", "no_matching_jobs"))
        self.assertEqual(len(scope.jobs), 2)

    def test_explicit_all_mode_never_reports_fallback(self):
        scope = resolve_scope_from_jobs(self.jobs, ["backend"], "all")
        self.assertEqual((scope.effective_mode, scope.fallback_reason), ("all", None))

    def test_requested_mode_is_preserved_for_ui(self):
        self.assertEqual(resolve_scope_from_jobs(self.jobs, [], "auto").requested_mode, "auto")

    def test_unknown_requested_mode_is_treated_as_auto(self):
        scope = resolve_scope_from_jobs(self.jobs, ["backend"], "sideways")
        self.assertEqual((scope.requested_mode, scope.effective_mode), ("auto", "interests"))

    def test_explicit_interests_mode_scopes_like_auto(self):
        scope = resolve_scope_from_jobs(self.jobs, ["data"], "interests")
        self.assertEqual((scope.effective_mode, scope.fallback_reason), ("interests", None))
        self.assertEqual([j.title for j in scope.jobs], ["Data"])


if __name__ == "__main__":
    unittest.main()
