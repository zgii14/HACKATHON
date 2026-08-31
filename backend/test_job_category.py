import os
import unittest

os.environ.setdefault("GEMINI_API_KEY", "test-key")

from app.services.job_category import VALID_CATEGORIES, classify_job_categories, sanitize_categories


class ClassifyTests(unittest.TestCase):
    def test_title_rule_wins_over_generic_skills(self):
        self.assertEqual(
            classify_job_categories("Junior Backend Developer", ["Python", "Git", "Docker"]),
            ["backend"],
        )

    def test_fullstack_title_maps_to_three_categories(self):
        self.assertEqual(
            classify_job_categories("Full Stack Engineer (Django + React)", ["Python", "React"]),
            ["backend", "frontend", "fullstack"],
        )

    def test_mlops_title_is_both_ai_and_devops(self):
        self.assertEqual(
            classify_job_categories("MLOps Engineer", ["Python", "Kubernetes"]),
            ["ai_ml", "devops"],
        )

    def test_data_analyst_not_classified_as_backend_despite_python(self):
        self.assertEqual(
            classify_job_categories("Junior Data Analyst", ["Python", "pandas", "SQL"]),
            ["data"],
        )

    def test_skill_vote_used_when_title_has_no_rule(self):
        self.assertEqual(
            classify_job_categories("Platform Software Engineer", ["Go", "Kafka", "PostgreSQL", "Git"]),
            ["backend"],
        )

    def test_generic_only_skills_yield_no_category(self):
        self.assertEqual(
            classify_job_categories("Software Engineer (Generalist)", ["Python", "Git", "SQL", "Docker"]),
            [],
        )

    def test_result_is_sorted_and_deduplicated(self):
        result = classify_job_categories("Mobile Developer (Flutter)", ["Flutter", "Dart", "Firebase"])
        self.assertEqual(result, sorted(set(result)))

    def test_every_produced_category_is_valid(self):
        for title, skills in [
            ("QA Automation Engineer", ["Playwright", "Postman"]),
            ("Blockchain Developer", ["Solidity", "Hardhat"]),
            ("Embedded Software Engineer", ["C", "C++"]),
            ("Cloud Engineer (AWS)", ["AWS", "Terraform"]),
        ]:
            for cat in classify_job_categories(title, skills):
                self.assertIn(cat, VALID_CATEGORIES)


class SanitizeTests(unittest.TestCase):
    def test_unknown_and_duplicate_values_dropped(self):
        self.assertEqual(sanitize_categories(["backend", "backend", "wizardry", None, 3]), ["backend"])

    def test_none_becomes_empty_list(self):
        self.assertEqual(sanitize_categories(None), [])


if __name__ == "__main__":
    unittest.main()
