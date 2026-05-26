import json
import re
import time

from google import genai
from app.config import settings


if not settings.gemini_api_key:
    raise RuntimeError("GEMINI_API_KEY belum diset di environment")

client = genai.Client(api_key=settings.gemini_api_key)

# Model GA yang stabil (bukan preview)
GEMINI_MODEL = "gemini-3.1-flash-lite"

# Konfigurasi retry
MAX_RETRIES = 3
RETRY_DELAYS = [2, 5]  # detik jeda antar retry (index 0 = setelah attempt 1, dst)


# =========================
# 🔹 RETRY WRAPPER
# =========================
def _call_gemini_with_retry(contents: str) -> str:
    """
    Panggil Gemini dengan retry otomatis.
    - Retry maksimal MAX_RETRIES kali
    - Jeda antar retry: 2s, lalu 5s (exponential-ish backoff)
    - Hanya retry untuk error sementara (timeout, overload, network)
    - Langsung raise untuk error permanen (invalid API key, quota habis)
    """
    last_exc: Exception | None = None

    for attempt in range(MAX_RETRIES):
        try:
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=contents,
            )
            return (response.text or "").strip()

        except Exception as e:
            last_exc = e
            err_str = str(e).lower()

            # Error permanen — langsung gagal, tidak perlu retry
            PERMANENT_ERRORS = [
                "api_key", "api key", "invalid key",
                "quota", "billing", "permission",
                "not found", "not supported",
            ]
            if any(keyword in err_str for keyword in PERMANENT_ERRORS):
                raise RuntimeError(f"Gemini error permanen: {e}") from e

            # Masih ada retry tersisa
            if attempt < MAX_RETRIES - 1:
                delay = RETRY_DELAYS[attempt] if attempt < len(RETRY_DELAYS) else RETRY_DELAYS[-1]
                print(f"[Gemini] Attempt {attempt + 1} gagal ({type(e).__name__}). Retry dalam {delay}s...")
                time.sleep(delay)
            # else: sudah attempt terakhir, keluar loop → raise di bawah

    raise RuntimeError(
        f"Gemini tidak merespons setelah {MAX_RETRIES} percobaan. "
        f"Error terakhir: {last_exc}"
    )


# =========================
# 🔹 SKILL EXTRACTION
# =========================
def extract_skills_from_cv_text(cv_text: str) -> list[str]:
    prompt = """You extract technical skills from a resume/CV. Return ONLY valid JSON with this shape:
{"skills": ["skill1", "skill2", ...]}
Use concise English names (e.g. Python, React, PostgreSQL). Max 40 skills. No markdown."""

    try:
        text = _call_gemini_with_retry(
            f"{prompt}\n\n--- CV TEXT ---\n{cv_text[:12000]}"
        )
        return _parse_skills_json(text)

    except RuntimeError:
        raise
    except Exception as e:
        raise RuntimeError(f"Gemini gagal mengekstrak skill dari CV: {e}") from e


# =========================
# 🔹 ROADMAP GENERATION
# =========================
def generate_roadmap(gap_skills: list[str], merged_skills: list[str]) -> list[dict]:
    gap = ", ".join(gap_skills[:25]) or "software engineering umum"
    have = ", ".join(merged_skills[:25]) or "terbatas"

    prompt = f"""Kamu adalah career coach untuk fresh graduate IT Indonesia.
Pelajar sudah memiliki skill: {have}
Pelajar perlu meningkatkan: {gap}

Buatkan roadmap belajar 5-8 langkah dalam BAHASA INDONESIA.

PENTING - Return HANYA valid JSON ini (tanpa markdown, tanpa kode blok, tanpa tanda ** atau *):
{{"steps":[
  {{
    "title": "Judul langkah singkat dan jelas",
    "description": "Penjelasan 2-3 kalimat tentang apa yang harus dilakukan. Tulis dalam kalimat biasa tanpa simbol apapun.",
    "resources": ["Nama resource 1", "Nama resource 2"],
    "target": "Kemampuan konkret yang akan dicapai setelah langkah ini selesai"
  }}
]}}

Aturan ketat:
- JANGAN gunakan ** atau * atau # atau tanda markdown apapun
- description: kalimat biasa, maksimal 3 kalimat
- resources: array nama platform/buku/website (maks 3 item)
- target: 1 kalimat singkat tentang hasil yang dicapai
- Sesuaikan dengan kebutuhan fresh graduate Indonesia"""

    try:
        text = _call_gemini_with_retry(prompt)
        return _parse_roadmap_json(text)

    except RuntimeError:
        raise
    except Exception as e:
        raise RuntimeError(f"Gemini gagal membuat roadmap belajar: {e}") from e


# =========================
# 🔹 STEP QUIZ GENERATION
# =========================
def generate_step_quiz(step_title: str, step_description: str) -> list[dict]:
    prompt = f"""Kamu adalah instruktur pemrograman IT di Indonesia.
Buatkan 3 soal kuis pilihan ganda singkat dan interaktif untuk materi belajar ini:
Judul Langkah: {step_title}
Deskripsi: {step_description}

Kuis harus ditulis dalam Bahasa Indonesia. Soal harus relevan, mendidik, dan menguji konsep dasar materi tersebut.

PENTING - Return HANYA valid JSON dengan format ini (tanpa markdown, tanpa kode blok, tanpa tanda ** atau *):
{{"quiz":[
  {{
    "question": "Pertanyaan kuis singkat",
    "options": ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"],
    "correct_index": 0
  }}
]}}

Aturan ketat:
- correct_index: harus berupa angka integer 0 sampai 3 yang merujuk pada index opsi yang benar.
- options: harus tepat 4 pilihan jawaban yang masuk akal dan menantang.
- question: ajukan pertanyaan singkat yang konkret.
"""
    try:
        text = _call_gemini_with_retry(prompt)
        data = _extract_json(text)
        if not data or not isinstance(data.get("quiz"), list):
            return []
        
        quiz: list[dict] = []
        for item in data["quiz"]:
            if not isinstance(item, dict):
                continue
            question = item.get("question")
            options = item.get("options")
            correct_index = item.get("correct_index")
            if (isinstance(question, str) and 
                isinstance(options, list) and len(options) == 4 and 
                isinstance(correct_index, int) and 0 <= correct_index <= 3):
                quiz.append({
                    "question": question.strip(),
                    "options": [str(o).strip() for o in options],
                    "correct_index": correct_index
                })
        return quiz[:3]
    except Exception as e:
        print(f"[Gemini] Gagal membuat kuis: {e}")
        return []


def extract_cv_data_from_text(cv_text: str) -> dict:
    prompt = """
    You are an expert ATS CV parser. Read the text of this CV and convert it into a valid JSON object matching this exact shape:
    {
      "summary": "Brief professional summary of the candidate...",
      "education": [
        {
          "institution": "University Bengkulu",
          "location": "Bengkulu, Indonesia",
          "major": "Informatics",
          "degree": "Bachelor Degree",
          "period": "Aug 2022 - Present",
          "gpa": "3.86/4.00"
        }
      ],
      "work_experience": [
        {
          "company": "Coding Camp 2026",
          "role": "Facilitator",
          "location": "Bengkulu, Indonesia (Remote)",
          "period": "Jan 2026 - Present",
          "bullets": [
            "Monitor learning progress of students",
            "Hold weekly consultation sessions"
          ]
        }
      ],
      "org_experience": [
        {
          "organization": "HIMATIF",
          "role": "Staff of Public Relations",
          "location": "Bengkulu, Indonesia",
          "period": "Nov 2023 - Dec 2024",
          "bullets": [
            "Designed and printed pamphlets for faculty activities"
          ]
        }
      ],
      "training": [
        {
          "title": "Machine Learning Cohort",
          "provider": "Dicoding / DBS Coding Camp",
          "location": "Remote",
          "period": "Feb 2025 - Jun 2025",
          "bullets": [
            "Developed MoodMate emotion detection NLP model"
          ]
        }
      ],
      "skills": {
        "soft_skills": ["Time Management", "Effective Communication"],
        "hard_skills": ["Python", "TensorFlow", "Figma"],
        "languages": ["Bahasa Indonesia (Native)", "English (Intermediate)"]
      },
      "certifications": [
        "Introduction to Git and GitHub (Dicoding)",
        "Applied Machine Learning (Dicoding)"
      ]
    }
    Return ONLY valid JSON. Keep all descriptions/bullets in the same language as found in the text.
    """
    try:
        text = _call_gemini_with_retry(f"{prompt}\n\n--- CV TEXT ---\n{cv_text[:12000]}")
        data = _extract_json(text)
        if data and isinstance(data, dict):
            return data
        return {}
    except Exception as e:
        print(f"[Gemini] Gagal mengekstrak CV data: {e}")
        return {}


# =========================
# 🔹 PARSING UTILITIES
# =========================
def _parse_skills_json(text: str) -> list[str]:
    data = _extract_json(text)
    if not data:
        return []

    skills = data.get("skills") if isinstance(data, dict) else None
    if not isinstance(skills, list):
        return []

    out: list[str] = []
    for s in skills:
        if isinstance(s, str) and s.strip():
            out.append(s.strip())

    return _normalize_unique(out)


def _parse_roadmap_json(text: str) -> list[dict]:
    data = _extract_json(text)

    if not data or not isinstance(data.get("steps"), list):
        return []

    steps: list[dict] = []
    for item in data["steps"]:
        if not isinstance(item, dict):
            continue

        title = item.get("title") or item.get("step")
        if not isinstance(title, str) or not title.strip():
            continue

        desc = item.get("description") or ""
        if not isinstance(desc, str):
            desc = str(desc)

        steps.append({
            "title": title.strip(),
            "description": desc.strip(),
            "resources": item.get("resources") or [],
            "target": item.get("target") or "",
        })

    return steps


def _extract_json(text: str) -> dict | None:
    text = text.strip()
    match = re.search(r"\{[\s\S]*\}", text)

    if not match:
        return None

    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


def _normalize_unique(skills: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []

    for s in skills:
        key = s.lower()
        if key not in seen:
            seen.add(key)
            out.append(s)

    return out