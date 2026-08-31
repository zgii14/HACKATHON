import os
import unittest
from dataclasses import dataclass, field

os.environ.setdefault("GEMINI_API_KEY", "test-key")

from app.services.skill_gap import (
    aggregate_demand,
    canonical_set,
    compute_readiness,
    job_coverage,
    split_gap,
)


@dataclass
class FakeJob:
    required_skills: list = field(default_factory=list)
    categories: list = field(default_factory=list)
    is_closed: bool = False


class AggregateDemandTests(unittest.TestCase):
    def test_alias_variants_merge_into_one_canonical_entry(self):
        jobs = [FakeJob(["Node.js"]), FakeJob(["nodejs"]), FakeJob(["node js"])]
        demand = aggregate_demand(jobs)
        self.assertEqual(list(demand.keys()), ["node.js"])
        self.assertEqual(demand["node.js"].job_count, 3)

    def test_duplicate_alias_inside_one_job_counts_once(self):
        demand = aggregate_demand([FakeJob(["React", "React.js", "reactjs"])])
        self.assertEqual(demand["react"].job_count, 1)

    def test_label_uses_most_common_raw_form(self):
        jobs = [FakeJob(["PostgreSQL"]), FakeJob(["PostgreSQL"]), FakeJob(["postgres"])]
        self.assertEqual(aggregate_demand(jobs)["postgresql"].label, "PostgreSQL")

    def test_blank_and_non_string_entries_ignored(self):
        demand = aggregate_demand([FakeJob(["Go", "", "   ", None, 7])])
        self.assertEqual(list(demand.keys()), ["go"])


class JobCoverageTests(unittest.TestCase):
    def test_coverage_is_ratio_of_satisfied_requirements(self):
        self.assertAlmostEqual(job_coverage({"python", "git"}, ["Python", "Git", "Docker", "Go"]), 0.5)

    def test_alias_in_profile_satisfies_requirement(self):
        self.assertAlmostEqual(job_coverage(canonical_set(["JS"]), ["JavaScript"]), 1.0)

    def test_job_without_requirements_has_no_signal(self):
        self.assertIsNone(job_coverage({"python"}, []))

    def test_extra_candidate_skills_do_not_reduce_coverage(self):
        user = canonical_set(["Python", "Git", "Rust", "Swift", "Unity"])
        self.assertAlmostEqual(job_coverage(user, ["Python", "Git"]), 1.0)


class ReadinessTests(unittest.TestCase):
    def test_counts_jobs_at_or_above_threshold(self):
        user = canonical_set(["Python", "FastAPI", "PostgreSQL", "Git", "Docker"])
        jobs = [
            FakeJob(["Python", "FastAPI", "PostgreSQL", "Git", "Docker"]),   # 1.00 ready
            FakeJob(["Python", "Django", "PostgreSQL", "Redis", "Git"]),      # 0.60
            FakeJob(["Swift", "iOS", "Xcode", "REST API", "Git"]),            # 0.20
        ]
        r = compute_readiness(user, jobs)
        self.assertEqual((r.ready_jobs, r.relevant_jobs, r.threshold_pct), (1, 3, 70))
        self.assertEqual(r.median_coverage_pct, 60)

    def test_jobs_without_requirements_excluded_from_stats(self):
        r = compute_readiness(canonical_set(["Python"]), [FakeJob([]), FakeJob(["Python"])])
        self.assertEqual((r.ready_jobs, r.relevant_jobs), (1, 1))

    def test_empty_scope_returns_zeroed_readiness(self):
        r = compute_readiness(canonical_set(["Python"]), [])
        self.assertEqual((r.ready_jobs, r.relevant_jobs, r.median_coverage_pct), (0, 0, 0))


class SplitGapTests(unittest.TestCase):
    def test_missing_and_unproven_are_disjoint_and_demand_sorted(self):
        demand = aggregate_demand([
            FakeJob(["Python", "Kafka"]),
            FakeJob(["Python", "Kafka"]),
            FakeJob(["Python", "Go"]),
        ])
        missing, unproven = split_gap(
            user_canon=canonical_set(["Python"]),
            github_canon=canonical_set([]),
            demand=demand,
        )
        self.assertEqual([m.canonical for m in missing], ["kafka", "go"])
        self.assertEqual([u.canonical for u in unproven], ["python"])
        self.assertFalse({m.canonical for m in missing} & {u.canonical for u in unproven})

    def test_skill_with_github_evidence_is_neither_missing_nor_unproven(self):
        demand = aggregate_demand([FakeJob(["Python"])])
        missing, unproven = split_gap(canonical_set(["Python"]), canonical_set(["Python"]), demand)
        self.assertEqual((missing, unproven), ([], []))


if __name__ == "__main__":
    unittest.main()
