"""Logika kuis roadmap murni — tanpa DB, tanpa Gemini, mudah dites.

Syarat inti: sebuah langkah roadmap HANYA bisa lulus bila SEMUA soal kuis
dijawab benar. Jawaban benar TIDAK pernah keluar server; grading terjadi di sini.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timezone

QUIZ_SIZE = 5
QUIZ_TTL_MINUTES = 30
MAX_ATTEMPTS = 10


def _as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def normalize_quiz(raw) -> list[dict]:
    """Validasi ketat daftar soal → [{question, options[4], correct_index}].

    - boolean `correct_index` ditolak eksplisit (bool adalah subclass int)
    - opsi wajib tepat 4
    - lebih dari QUIZ_SIZE dipotong
    """
    if not isinstance(raw, list):
        return []
    out: list[dict] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        question = item.get("question")
        options = item.get("options")
        correct_index = item.get("correct_index")
        if not isinstance(question, str) or not question.strip():
            continue
        if not isinstance(options, list) or len(options) != 4:
            continue
        if (
            isinstance(correct_index, bool)
            or not isinstance(correct_index, int)
            or not 0 <= correct_index <= 3
        ):
            continue
        out.append(
            {
                "question": question.strip(),
                "options": [str(o).strip() for o in options],
                "correct_index": correct_index,
            }
        )
    return out[:QUIZ_SIZE]


def public_quiz(quiz: list[dict]) -> list[dict]:
    """Buang kunci jawaban di SEMUA level — jangan pernah dikirim ke client."""
    return [
        {"question": q["question"], "options": list(q["options"])}
        for q in quiz
    ]


def quiz_token(
    quiz: list[dict],
    user_id,
    roadmap_key: str,
    step_index: int,
    issued_at: datetime | None,
) -> str:
    """Token terikat ke quiz spesifik + konteks user/roadmap/step + waktu terbit.

    issued_at dinormalisasi ke UTC agar token tetap sama walau DB menyimpan
    datetime tanpa timezone (SQLite) vs timezone-aware (Postgres).
    """
    issued = _as_utc(issued_at)
    payload = json.dumps(
        {
            "quiz": quiz,
            "user_id": str(user_id),
            "roadmap_key": roadmap_key,
            "step_index": step_index,
            "issued_at": issued.isoformat() if issued else None,
        },
        sort_keys=True,
        default=str,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:32]


def is_quiz_expired(issued_at: datetime | None, now: datetime | None, ttl_minutes: int = QUIZ_TTL_MINUTES) -> bool:
    issued = _as_utc(issued_at)
    now_u = _as_utc(now)
    if issued is None or now_u is None:
        return True
    return (now_u - issued).total_seconds() > ttl_minutes * 60


@dataclass(frozen=True)
class QuizResult:
    score: int
    total: int
    passed: bool


def grade_quiz(quiz: list[dict], answers) -> QuizResult:
    """Nilai jawaban. Lulus HANYA jika semua benar dan total > 0."""
    total = len(quiz)
    if total == 0:
        return QuizResult(0, 0, False)
    if not isinstance(answers, list) or len(answers) != total:
        return QuizResult(0, total, False)
    score = 0
    for q, ans in zip(quiz, answers):
        if isinstance(ans, bool) or not isinstance(ans, int):
            continue
        if q["correct_index"] == ans:
            score += 1
    return QuizResult(score, total, score == total)


def authorize_step_completion(requested: bool, quiz_passed: bool) -> bool:
    """Gerbang PATCH steps: selesai hanya bila quiz benar-benar lulus."""
    if not requested:
        return True
    return quiz_passed