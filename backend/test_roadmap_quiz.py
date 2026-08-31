import os
import unittest
from datetime import datetime, timedelta, timezone

os.environ.setdefault("GEMINI_API_KEY", "test-key")

from app.services.quiz import (
    MAX_ATTEMPTS,
    QUIZ_SIZE,
    authorize_step_completion,
    grade_quiz,
    is_quiz_expired,
    normalize_quiz,
    public_quiz,
    quiz_token,
)

USER_A = "11111111-1111-1111-1111-111111111111"
USER_B = "22222222-2222-2222-2222-222222222222"
NOW = datetime(2026, 8, 31, 12, 0, 0, tzinfo=timezone.utc)


def sample_quiz(n=QUIZ_SIZE):
    return [
        {"question": f"Soal {i+1}", "options": [f"A{i}", "B", "C", "D"], "correct_index": 0}
        for i in range(n)
    ]


class NormalizeQuizTests(unittest.TestCase):
    def test_five_valid_items_kept(self):
        self.assertEqual(len(normalize_quiz(sample_quiz(5))), 5)

    def test_boolean_correct_index_is_dropped(self):
        # bool adalah subclass int → True==1 lolos isintance. Wajib tolak eksplisit.
        bad = {"question": "Q", "options": ["a", "b", "c", "d"], "correct_index": True}
        self.assertEqual(normalize_quiz([bad]), [])

    def test_fewer_than_four_options_dropped(self):
        bad = {"question": "Q", "options": ["a", "b", "c"], "correct_index": 0}
        self.assertEqual(normalize_quiz([bad]), [])

    def test_more_than_five_items_capped(self):
        self.assertEqual(len(normalize_quiz(sample_quiz(7))), QUIZ_SIZE)

    def test_out_of_range_correct_index_dropped(self):
        bad = {"question": "Q", "options": ["a", "b", "c", "d"], "correct_index": 4}
        self.assertEqual(normalize_quiz([bad]), [])

    def test_non_dict_item_ignored(self):
        self.assertEqual(normalize_quiz(["x", None, 3]), [])

    def test_empty_input(self):
        self.assertEqual(normalize_quiz(None), [])


class PublicQuizTests(unittest.TestCase):
    def test_correct_index_never_leaks_at_any_level(self):
        quiz = sample_quiz()
        for q in public_quiz(quiz):
            self.assertNotIn("correct_index", q)
            self.assertEqual(sorted(q.keys()), ["options", "question"])

    def test_option_order_preserved(self):
        quiz = [{"question": "Q", "options": ["X", "Y", "Z", "W"], "correct_index": 2}]
        self.assertEqual(public_quiz(quiz)[0]["options"], ["X", "Y", "Z", "W"])


class GradeQuizTests(unittest.TestCase):
    def test_five_of_five_passes(self):
        r = grade_quiz(sample_quiz(5), [0, 0, 0, 0, 0])
        self.assertTrue(r.passed)
        self.assertEqual((r.score, r.total), (5, 5))

    def test_four_of_five_does_not_pass(self):
        r = grade_quiz(sample_quiz(5), [0, 0, 0, 0, 1])
        self.assertFalse(r.passed)
        self.assertEqual((r.score, r.total), (4, 5))

    def test_empty_quiz_never_passes(self):
        r = grade_quiz([], [])
        self.assertFalse(r.passed)
        self.assertEqual((r.score, r.total), (0, 0))

    def test_wrong_answer_count_is_rejected(self):
        self.assertFalse(grade_quiz(sample_quiz(5), [0, 0, 0]).passed)
        self.assertFalse(grade_quiz(sample_quiz(5), [0] * 6).passed)

    def test_boolean_answer_counts_as_wrong(self):
        # True == 1; harus dihitung salah, bukan benar.
        quiz = [{"question": "Q", "options": ["a", "b", "c", "d"], "correct_index": 1}]
        self.assertFalse(grade_quiz(quiz, [True]).passed)

    def test_none_and_out_of_range_answer_count_wrong_but_no_crash(self):
        quiz = [{"question": "Q", "options": ["a", "b", "c", "d"], "correct_index": 0}]
        r = grade_quiz(quiz, [None])
        self.assertEqual(r.score, 0)
        r2 = grade_quiz(quiz, [7])
        self.assertEqual(r2.score, 0)


class QuizTokenTests(unittest.TestCase):
    def test_identical_inputs_produce_same_token(self):
        t1 = quiz_token(sample_quiz(), USER_A, "_generic", 2, NOW)
        t2 = quiz_token(sample_quiz(), USER_A, "_generic", 2, NOW)
        self.assertEqual(t1, t2)

    def test_token_changes_when_answer_key_changes(self):
        q1 = sample_quiz()
        q2 = sample_quiz()
        q2[0]["correct_index"] = 1
        self.assertNotEqual(quiz_token(q1, USER_A, "_generic", 2, NOW), quiz_token(q2, USER_A, "_generic", 2, NOW))

    def test_token_changes_when_user_changes(self):
        self.assertNotEqual(
            quiz_token(sample_quiz(), USER_A, "_generic", 2, NOW),
            quiz_token(sample_quiz(), USER_B, "_generic", 2, NOW),
        )

    def test_token_changes_when_step_or_key_changes(self):
        base = quiz_token(sample_quiz(), USER_A, "_generic", 2, NOW)
        self.assertNotEqual(base, quiz_token(sample_quiz(), USER_A, "_generic", 3, NOW))
        self.assertNotEqual(base, quiz_token(sample_quiz(), USER_A, "job-uuid", 2, NOW))


class QuizExpiryTests(unittest.TestCase):
    def test_younger_than_ttl_not_expired(self):
        self.assertFalse(is_quiz_expired(NOW, NOW + timedelta(minutes=29, seconds=59)))

    def test_exactly_at_ttl_not_expired(self):
        self.assertFalse(is_quiz_expired(NOW, NOW + timedelta(minutes=30)))

    def test_past_ttl_expired(self):
        self.assertTrue(is_quiz_expired(NOW, NOW + timedelta(minutes=30, seconds=1)))

    def test_naive_datetime_handled(self):
        naive = datetime(2026, 8, 31, 12, 0, 0)
        self.assertFalse(is_quiz_expired(naive, NOW))

    def test_missing_timestamps_expired(self):
        self.assertTrue(is_quiz_expired(None, NOW))


class AuthorizeStepCompletionTests(unittest.TestCase):
    def test_complete_requires_quiz_passed(self):
        self.assertTrue(authorize_step_completion(True, quiz_passed=True))
        self.assertFalse(authorize_step_completion(True, quiz_passed=False))

    def test_uncomplete_always_allowed(self):
        self.assertTrue(authorize_step_completion(False, quiz_passed=False))
        self.assertTrue(authorize_step_completion(False, quiz_passed=True))


class ConstantsTests(unittest.TestCase):
    def test_quiz_has_five_questions(self):
        self.assertEqual(QUIZ_SIZE, 5)

    def test_max_attempts_defined(self):
        self.assertGreater(MAX_ATTEMPTS, 0)


if __name__ == "__main__":
    unittest.main()