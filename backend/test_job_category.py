import os
import unittest

os.environ.setdefault("GEMINI_API_KEY", "test-key")

from app.services.job_category import (
    VALID_CATEGORIES,
    backfill_job_categories,
    classify_job_categories,
    sanitize_categories,
)


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


class BackfillTests(unittest.TestCase):
    """Backfill dijalankan tiap startup, jadi harus idempoten."""

    def setUp(self):
        import uuid

        from sqlalchemy import create_engine
        from sqlalchemy.orm import Session

        from app.database import Base
        from app.models import Job

        self.engine = create_engine("sqlite://")
        Base.metadata.create_all(bind=self.engine, tables=[Job.__table__])
        self.session = Session(bind=self.engine)
        self.Job = Job
        self.uuid = uuid

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    def _add(self, title, skills, categories):
        self.session.add(
            self.Job(
                id=self.uuid.uuid4(),
                title=title,
                company="ACME",
                description="d",
                required_skills=skills,
                categories=categories,
            )
        )
        self.session.commit()

    def test_null_and_empty_rows_get_classified(self):
        self._add("Junior Backend Developer", ["Python", "FastAPI"], None)
        self._add("Frontend Developer (React)", ["React", "Tailwind CSS"], [])
        touched = backfill_job_categories(self.session)
        self.assertEqual(touched, 2)
        rows = {j.title: j.categories for j in self.session.query(self.Job).all()}
        self.assertEqual(rows["Junior Backend Developer"], ["backend"])
        self.assertEqual(rows["Frontend Developer (React)"], ["frontend"])

    def test_existing_categories_are_not_overwritten(self):
        self._add("Junior Backend Developer", ["Python"], ["data"])
        self.assertEqual(backfill_job_categories(self.session), 0)
        self.assertEqual(self.session.query(self.Job).one().categories, ["data"])

    def test_invalid_legacy_values_are_reclassified(self):
        self._add("Junior Backend Developer", ["Python", "FastAPI"], ["wizardry"])
        self.assertEqual(backfill_job_categories(self.session), 1)
        self.assertEqual(self.session.query(self.Job).one().categories, ["backend"])

    def test_second_run_is_a_noop_for_classifiable_rows(self):
        self._add("Cloud Engineer (AWS)", ["AWS", "Terraform"], None)
        self.assertEqual(backfill_job_categories(self.session), 1)
        self.assertEqual(backfill_job_categories(self.session), 0)

    def test_unclassifiable_row_stays_empty_and_is_retried(self):
        self._add("Software Engineer (Generalist)", ["Python", "Git"], None)
        self.assertEqual(backfill_job_categories(self.session), 1)
        self.assertEqual(self.session.query(self.Job).one().categories, [])
        # Tetap kosong -> ikut dicoba lagi di startup berikutnya. Itu disengaja:
        # begitu classifier diperbaiki, baris ini otomatis dapat kategori.
        self.assertEqual(backfill_job_categories(self.session), 1)


if __name__ == "__main__":
    unittest.main()
