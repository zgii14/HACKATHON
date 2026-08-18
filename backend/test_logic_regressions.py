import os
import unittest

os.environ.setdefault("GEMINI_API_KEY", "test-key")
os.environ.setdefault("RECRUITER_EMAILS", "trusted@example.com")

from app.auth import is_recruiter_email
from app.routers.applications import can_confirm_interview
from app.routers.profiles import has_usable_cv_data
from app.routers.recruiter import _escape_like, _extract_json_data, normalize_screening_result
from app.seed import DUMMY_JOBS, seed_jobs_if_empty
from app.services.matching import jaccard_score


class LogicRegressionTests(unittest.TestCase):
    def test_demo_job_does_not_block_static_seed(self):
        class Query:
            def count(self):
                return 1

            def filter(self, *_args):
                return self

            def first(self):
                return None

        class Session:
            def __init__(self):
                self.added = []

            def query(self, _model):
                return Query()

            def add(self, item):
                self.added.append(item)

            def commit(self):
                pass

        db = Session()
        seed_jobs_if_empty(db)
        self.assertEqual(len(db.added), len(DUMMY_JOBS))

    def test_only_whitelisted_email_can_be_recruiter(self):
        self.assertTrue(is_recruiter_email("trusted@example.com"))
        self.assertFalse(is_recruiter_email("candidate@example.com"))

    def test_empty_required_skills_do_not_produce_perfect_match(self):
        self.assertEqual(jaccard_score(["Python"], []), 0.0)

    def test_candidate_can_confirm_only_an_existing_interview(self):
        self.assertTrue(can_confirm_interview("interview", "interview_confirmed"))
        self.assertTrue(can_confirm_interview("interview_confirmed", "interview_confirmed"))
        self.assertFalse(can_confirm_interview("applied", "interview_confirmed"))

    def test_screening_result_requires_valid_score_and_fields(self):
        result = normalize_screening_result(
            {
                "match_score": 88,
                "recommendation": "interview",
                "reasoning": "Cocok.",
                "strengths": ["Python"],
                "weaknesses": ["Cloud"],
            }
        )
        self.assertEqual(result["match_score"], 88)
        self.assertIsNone(normalize_screening_result({"match_score": "high"}))

    def test_screening_json_parser_extracts_json_object(self):
        self.assertEqual(
            _extract_json_data('prefix {"match_score": 88} suffix'),
            {"match_score": 88},
        )

    def test_empty_structured_cv_data_is_not_usable(self):
        self.assertFalse(has_usable_cv_data({}))
        self.assertFalse(has_usable_cv_data({"education": []}))
        self.assertTrue(has_usable_cv_data({"summary": "Backend developer"}))

    def test_candidate_search_escapes_like_wildcards(self):
        self.assertEqual(_escape_like(r"100%_ready\dev"), r"100\%\_ready\\dev")


if __name__ == "__main__":
    unittest.main()
