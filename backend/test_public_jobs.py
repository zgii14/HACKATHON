import unittest
from datetime import datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import Job


def make_job(title: str, minutes_ago: int, closed: bool = False) -> Job:
    return Job(
        title=title,
        company="Contoh Corp",
        description="desc",
        required_skills=["Python"],
        location="Jakarta",
        is_remote=False,
        work_type="Hybrid",
        is_closed=closed,
        created_at=datetime(2026, 10, 14, 12, 0) - timedelta(minutes=minutes_ago),
    )


class PublicJobsTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        db = self.Session()
        db.add_all([
            make_job("Lama", 30),
            make_job("Terbaru", 1),
            make_job("Tengah", 10),
            make_job("Tutup", 0, closed=True),
        ])
        db.commit()
        db.close()

        def override_db():
            session = self.Session()
            try:
                yield session
            finally:
                session.close()

        # Tanpa override get_current_user: endpoint harus publik.
        app.dependency_overrides[get_db] = override_db
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()

    def test_lists_open_jobs_newest_first(self):
        res = self.client.get("/public/jobs?limit=2")
        self.assertEqual(res.status_code, 200, res.text)
        body = res.json()
        self.assertEqual(body["total"], 3)
        self.assertEqual([item["title"] for item in body["items"]], ["Terbaru", "Tengah"])
        self.assertEqual(set(body["items"][0]), {"id", "title", "company", "location", "work_type", "is_remote"})
        self.assertEqual(res.headers.get("cache-control"), "public, max-age=300")

    def test_limit_is_clamped(self):
        self.assertEqual(len(self.client.get("/public/jobs?limit=50").json()["items"]), 3)
        self.assertEqual(len(self.client.get("/public/jobs?limit=0").json()["items"]), 1)
