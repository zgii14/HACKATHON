"""Regresi end-to-end alur kuis roadmap + XP (tanpa FastAPI TestClient).

Memanggil fungsi router langsung dengan SQLite in-memory dan mock generate_step_quiz.
Inti yang dibuktikan:
- langkah TIDAK bisa diselesaikan tanpa kuis lulus penuh
- kunci jawaban tidak pernah keluar ke client
- XP hanya didapat sekali per (roadmap, step, fingerprint) — anti-farm
- bonus XP saat seluruh roadmap selesai
"""

import os
import unittest
from datetime import datetime, timedelta, timezone
from unittest import mock

os.environ.setdefault("GEMINI_API_KEY", "test-key")

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.database import Base
from app.models import CandidateProfile, RoadmapProgress, User, XpEarning
from app.routers.me import get_roadmap_step_quiz, get_xp, patch_roadmap_step, submit_roadmap_quiz
from app.schemas import QuizSubmitIn, RoadmapStepPatch
from app.services.xp import XP_REWARD_ROADMAP, XP_REWARD_STEP


def sample_quiz(n=5):
    return [
        {"question": f"Soal {i+1}", "options": [f"A{i}", "B", "C", "D"], "correct_index": 0}
        for i in range(n)
    ]


class QuizFlowTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")
        Base.metadata.create_all(bind=self.engine)
        self.session = Session(bind=self.engine)
        self.user = User(id=__import__("uuid").uuid4(), clerk_user_id="c1", email="u@x.com")
        self.session.add(self.user)
        self.profile = CandidateProfile(
            user_id=self.user.id,
            merged_skills=["Python"],
            roadmap_cached={
                "_generic": {
                    "steps": [{"title": f"Langkah {i}", "description": "d"} for i in range(5)],
                    "fp": "fp1",
                }
            },
        )
        self.session.add(self.profile)
        self.session.commit()
        self.mock_quiz = mock.patch(
            "app.services.gemini_service.generate_step_quiz", return_value=sample_quiz()
        )
        self.mock_quiz.start()

    def tearDown(self):
        self.mock_quiz.stop()
        self.session.close()
        self.engine.dispose()

    def issue(self, step=0):
        out = get_roadmap_step_quiz(step_index=step, job_id=None, user=self.user, db=self.session)
        return out

    def submit(self, token, answers):
        return submit_roadmap_quiz(
            body=QuizSubmitIn(quiz_token=token, answers=answers),
            job_id=None,
            user=self.user,
            db=self.session,
        )

    def _row(self, step=0):
        return (
            self.session.query(RoadmapProgress)
            .filter(RoadmapProgress.user_id == self.user.id, RoadmapProgress.step_index == step)
            .one()
        )

    def _xp(self):
        return self.session.query(CandidateProfile).one().total_xp or 0

    def test_issue_never_leaks_correct_index(self):
        out = self.issue()
        self.assertEqual(out.total, 5)
        for q in out.quiz:
            self.assertNotIn("correct_index", q)
        self.assertTrue(out.quiz_token)

    def test_submit_all_wrong_does_not_complete(self):
        out = self.issue()
        res = self.submit(out.quiz_token, [1, 1, 1, 1, 1])
        self.assertFalse(res.passed)
        self.assertFalse(self._row().completed)
        self.assertFalse(self._row().quiz_passed)
        self.assertEqual(self._xp(), 0)

    def _patch(self, step, completed):
        # job_id=None eksplisit: default Query(...) bukan None saat panggil langsung.
        return patch_roadmap_step(step, RoadmapStepPatch(completed=completed), self.user, self.session, job_id=None)

    def test_patch_complete_without_quiz_is_rejected(self):
        self.issue()
        with self.assertRaises(Exception) as ctx:
            self._patch(0, True)
        self.assertIn("403", str(ctx.exception) or type(ctx.exception).__name__)
        self.assertFalse(self._row().completed)

    def test_submit_all_correct_completes_and_grants_step_xp(self):
        out = self.issue()
        res = self.submit(out.quiz_token, [0, 0, 0, 0, 0])
        self.assertTrue(res.passed)
        self.assertEqual((res.score, res.total), (5, 5))
        self.assertTrue(self._row().completed)
        self.assertTrue(self._row().quiz_passed)
        self.assertEqual(self._xp(), XP_REWARD_STEP)
        self.assertEqual(self.session.query(XpEarning).count(), 1)

    def test_submit_after_pass_is_rejected_and_xp_not_doubled(self):
        out = self.issue()
        self.submit(out.quiz_token, [0, 0, 0, 0, 0])
        with self.assertRaises(Exception):
            self.submit(out.quiz_token, [0, 0, 0, 0, 0])
        self.assertEqual(self._xp(), XP_REWARD_STEP)

    def test_tampered_token_is_rejected(self):
        out = self.issue()
        with self.assertRaises(Exception):
            self.submit(out.quiz_token + "x", [0, 0, 0, 0, 0])
        self.assertFalse(self._row().completed)

    def test_expired_quiz_is_rejected(self):
        out = self.issue()
        row = self._row()
        row.quiz_issued_at = datetime.now(timezone.utc) - timedelta(minutes=31)
        self.session.commit()
        with self.assertRaises(Exception):
            self.submit(out.quiz_token, [0, 0, 0, 0, 0])
        self.assertFalse(self._row().completed)

    def test_uncheck_resets_quiz_state(self):
        out = self.issue()
        self.submit(out.quiz_token, [0, 0, 0, 0, 0])
        updated = self._patch(0, False)
        self.assertFalse(updated.completed)
        self.assertFalse(updated.quiz_passed)
        row = self._row()
        self.assertIsNone(row.quiz_payload)
        self.assertFalse(row.quiz_passed)

    def test_uncheck_then_repass_does_not_double_xp(self):
        out = self.issue()
        self.submit(out.quiz_token, [0, 0, 0, 0, 0])
        self._patch(0, False)
        out2 = self.issue()
        self.submit(out2.quiz_token, [0, 0, 0, 0, 0])
        self.assertEqual(self._xp(), XP_REWARD_STEP)
        self.assertEqual(self.session.query(XpEarning).count(), 1)

    def test_roadmap_completion_grants_bonus_xp(self):
        total = XP_REWARD_STEP * 5
        for step in range(5):
            out = self.issue(step)
            self.submit(out.quiz_token, [0, 0, 0, 0, 0])
            total += 0  # already counted
        # bonus hanya sekali
        expected = XP_REWARD_STEP * 5 + XP_REWARD_ROADMAP
        self.assertEqual(self._xp(), expected)

    def test_get_xp_shape(self):
        out = get_xp(self.user, self.session)
        self.assertEqual(out.total_xp, 0)
        self.assertEqual(out.level, 1)
        self.assertEqual(out.tier, "Pemula")
        self.assertEqual(out.next_threshold, 250)

    def test_cannot_access_step_out_of_order(self):
        # Step 1 tidak bisa diakses sebelum step 0 selesai
        with self.assertRaises(Exception) as ctx:
            self.issue(1)
        self.assertIn("403", str(ctx.exception) or type(ctx.exception).__name__)

        # Selesaikan step 0
        out0 = self.issue(0)
        self.submit(out0.quiz_token, [0, 0, 0, 0, 0])

        # Sekarang step 1 bisa diakses
        out1 = self.issue(1)
        self.assertEqual(out1.total, 5)

if __name__ == "__main__":
    unittest.main()