# AI Screening Upgrade (Tahap 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make AI screening judge candidates from CV *and* GitHub evidence in a balanced way, with a stable score and a verdict that can never contradict it.

**Architecture:** All scoring and prompt-assembly logic moves into a new pure module `backend/app/services/screening.py` (no HTTP, no DB, no env — same pattern as `skill_verification.py`). `recruiter.py` becomes a thin caller. Two hard guarantees live in code, not in the prompt: the score is clamped to `anchor ± 20`, and the verdict is derived from the clamped score.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy, `unittest` (stdlib). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-19-ai-screening-upgrade-design.md`

## Global Constraints

- **No new dependencies.** Use only what is already installed.
- **Do not modify `backend/app/services/matching.py`** or the Jaccard formula.
- **Do not change the meaning of `merged_skills`.**
- **Do not touch `githire-backend/`** — it is a stale deploy copy.
- **Output schema is frozen:** `match_score`, `recommendation`, `reasoning`, `strengths`, `weaknesses`. No frontend file may be modified in this plan.
- **Run all backend commands from the `backend/` directory.**
- Test runner: `python -m unittest discover -s . -p "test*.py"`. Existing suite is 53 tests and must stay green.
- Comments and user-facing strings in Bahasa Indonesia, matching surrounding code.

---

## File Structure

| File | Responsibility |
|---|---|
| `backend/app/services/screening.py` (create) | Pure scoring + prompt assembly. Constants, `clamp_score`, `derive_verdict`, block builders, `build_screening_prompt`. |
| `backend/test_screening.py` (create) | Unit tests for the above. |
| `backend/app/routers/recruiter.py` (modify) | Call the new module; add `PROMPT_VERSION` to fingerprint; apply clamp + verdict to both the AI path and the no-CV fallback. |

---

### Task 1: Verdict thresholds and score clamping

**Files:**
- Create: `backend/app/services/screening.py`
- Test: `backend/test_screening.py`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `MAX_DEVIATION: int = 20`
  - `INTERVIEW_THRESHOLD: int = 60`
  - `CONSIDER_THRESHOLD: int = 35`
  - `derive_verdict(score: int | float) -> str` → one of `"interview" | "consider" | "reject"`
  - `clamp_score(score: int | float, anchor: int | None) -> int` → `anchor is None` means "no clamping"

- [ ] **Step 1: Write the failing test**

Create `backend/test_screening.py`:

```python
"""Unit tests untuk penilaian dan perakitan prompt AI screening."""

import unittest

from app.services.screening import (
    CONSIDER_THRESHOLD,
    INTERVIEW_THRESHOLD,
    MAX_DEVIATION,
    clamp_score,
    derive_verdict,
)


class DeriveVerdictTests(unittest.TestCase):
    def test_at_and_above_interview_threshold(self):
        self.assertEqual(derive_verdict(INTERVIEW_THRESHOLD), "interview")
        self.assertEqual(derive_verdict(100), "interview")

    def test_consider_band(self):
        self.assertEqual(derive_verdict(INTERVIEW_THRESHOLD - 1), "consider")
        self.assertEqual(derive_verdict(CONSIDER_THRESHOLD), "consider")

    def test_below_consider_threshold_is_reject(self):
        self.assertEqual(derive_verdict(CONSIDER_THRESHOLD - 1), "reject")
        self.assertEqual(derive_verdict(0), "reject")

    def test_float_score_is_handled(self):
        self.assertEqual(derive_verdict(59.9), "consider")


class ClampScoreTests(unittest.TestCase):
    def test_score_inside_range_is_unchanged(self):
        self.assertEqual(clamp_score(45, 40), 45)

    def test_score_above_range_is_pulled_down(self):
        self.assertEqual(clamp_score(95, 40), 40 + MAX_DEVIATION)

    def test_score_below_range_is_pulled_up(self):
        self.assertEqual(clamp_score(5, 40), 40 - MAX_DEVIATION)

    def test_never_exceeds_100(self):
        self.assertEqual(clamp_score(100, 95), 100)

    def test_never_below_zero(self):
        self.assertEqual(clamp_score(0, 5), 0)

    def test_no_anchor_means_no_clamping(self):
        # Lowongan tanpa required_skills: anchor tidak bermakna
        self.assertEqual(clamp_score(88, None), 88)
        self.assertEqual(clamp_score(3, None), 3)

    def test_result_is_int(self):
        self.assertIsInstance(clamp_score(45.6, 40), int)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m unittest test_screening -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.screening'`

- [ ] **Step 3: Write minimal implementation**

Create `backend/app/services/screening.py`:

```python
"""
Penilaian dan perakitan prompt untuk AI screening kandidat.

Modul murni: tanpa HTTP, database, atau environment. Dua jaminan keras hidup
di sini (bukan di prompt) karena instruksi ke model saja tidak cukup:
skor dijepit ke anchor +/- MAX_DEVIATION, dan verdict diturunkan dari skor.
"""

from __future__ import annotations

# Batas simpangan skor AI terhadap anchor algoritmik (Jaccard)
MAX_DEVIATION = 20
# Ambang verdict. Diturunkan dari skor supaya tidak pernah bertentangan.
INTERVIEW_THRESHOLD = 60
CONSIDER_THRESHOLD = 35


def derive_verdict(score: int | float) -> str:
    """Verdict dihitung dari skor, bukan dipilih model."""
    if score >= INTERVIEW_THRESHOLD:
        return "interview"
    if score >= CONSIDER_THRESHOLD:
        return "consider"
    return "reject"


def clamp_score(score: int | float, anchor: int | None) -> int:
    """
    Jepit skor ke rentang anchor +/- MAX_DEVIATION, selalu di dalam 0-100.

    anchor None berarti lowongan tidak punya required_skills sehingga anchor
    tidak bermakna — skor dibiarkan apa adanya.
    """
    value = int(round(score))
    if anchor is None:
        return max(0, min(100, value))
    low = max(0, anchor - MAX_DEVIATION)
    high = min(100, anchor + MAX_DEVIATION)
    return max(low, min(high, value))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m unittest test_screening -v`
Expected: PASS — `Ran 11 tests` … `OK`

- [ ] **Step 5: Commit**

```bash
git add app/services/screening.py test_screening.py
git commit -m "feat(screening): deterministic verdict bands and score clamping"
```

---

### Task 2: Prompt block builders

**Files:**
- Modify: `backend/app/services/screening.py`
- Test: `backend/test_screening.py`

**Interfaces:**
- Consumes: Task 1 constants
- Produces:
  - `TOOLING_SKILLS: frozenset[str]`
  - `MAX_PROVEN_SKILLS: int = 10`
  - `build_proven_block(verified_skills: list[dict]) -> str`
  - `build_unverifiable_block(merged_skills: list[str], verified_skills: list[dict]) -> str`
  - `build_activity_block(signals: dict | None) -> str`

`verified_skills` items have the shape produced by `app.services.skill_verification.verify_skills`: `{"skill": str, "level": str, "evidence": {"repos": int, "own_commits": int, "last_used": str | None, ...}}`.

- [ ] **Step 1: Write the failing test**

Append to `backend/test_screening.py` (above the `if __name__` block):

```python
from app.services.screening import (
    build_activity_block,
    build_proven_block,
    build_unverifiable_block,
)


def vskill(skill, level="mahir", repos=3, commits=40, last_used="2026-08"):
    return {
        "skill": skill,
        "level": level,
        "evidence": {"repos": repos, "own_commits": commits, "last_used": last_used},
    }


class ProvenBlockTests(unittest.TestCase):
    def test_lists_skill_with_evidence_numbers(self):
        out = build_proven_block([vskill("Python", repos=12, commits=302)])
        self.assertIn("Python", out)
        self.assertIn("mahir", out)
        self.assertIn("12 repo", out)
        self.assertIn("302 commit", out)
        self.assertIn("2026-08", out)

    def test_empty_list_states_absence_without_crashing(self):
        out = build_proven_block([])
        self.assertTrue(out.strip())
        self.assertIn("tidak ada", out.lower())

    def test_caps_at_max_proven_skills(self):
        out = build_proven_block([vskill(f"Lang{i}") for i in range(20)])
        self.assertEqual(out.count("\n") + 1, MAX_PROVEN_SKILLS)

    def test_missing_last_used_does_not_crash(self):
        out = build_proven_block([vskill("Go", last_used=None)])
        self.assertIn("Go", out)


class UnverifiableBlockTests(unittest.TestCase):
    def test_proven_skills_are_excluded(self):
        out = build_unverifiable_block(["Python", "React"], [vskill("Python")])
        self.assertNotIn("Python", out)
        self.assertIn("React", out)

    def test_matching_is_case_insensitive(self):
        out = build_unverifiable_block(["python"], [vskill("Python")])
        self.assertNotIn("python", out.lower().replace("tidak ada", ""))

    def test_tooling_is_filtered_out(self):
        out = build_unverifiable_block(["Git", "Docker", "React"], [])
        self.assertNotIn("Git", out)
        self.assertNotIn("Docker", out)
        self.assertIn("React", out)

    def test_tooling_filter_is_case_insensitive(self):
        out = build_unverifiable_block(["GIT", "docker"], [])
        self.assertIn("tidak ada", out.lower())

    def test_all_filtered_states_absence(self):
        out = build_unverifiable_block(["Git"], [])
        self.assertIn("tidak ada", out.lower())

    def test_empty_input_does_not_crash(self):
        self.assertIn("tidak ada", build_unverifiable_block([], []).lower())


class ActivityBlockTests(unittest.TestCase):
    def test_reports_key_numbers(self):
        out = build_activity_block(
            {"public_repos": 50, "repos_analyzed": 48, "commits": 422, "stars": 7}
        )
        for token in ("50", "48", "422", "7"):
            self.assertIn(token, out)

    def test_missing_fields_default_to_zero(self):
        self.assertIn("0", build_activity_block({}))

    def test_none_signals_does_not_crash(self):
        self.assertTrue(build_activity_block(None).strip())
```

Also extend the existing import from `app.services.screening` at the top of the file to include `MAX_PROVEN_SKILLS`.

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m unittest test_screening -v`
Expected: FAIL — `ImportError: cannot import name 'build_proven_block'`

- [ ] **Step 3: Write minimal implementation**

Append to `backend/app/services/screening.py`:

```python
# Maksimal baris bukti yang dikirim ke model
MAX_PROVEN_SKILLS = 10

# Skill yang tidak mungkin terlihat dari statistik bahasa GitHub. Disaring dari
# blok "di luar jangkauan" supaya model tidak punya bahan untuk menyebutnya
# kekurangan — statistik bahasa memang tidak bisa mengukurnya.
TOOLING_SKILLS = frozenset(
    {
        "git", "github", "gitlab", "docker", "kubernetes", "ci/cd", "cicd",
        "jenkins", "github actions", "jira", "figma", "postman", "linux",
        "bash", "shell", "agile", "scrum", "trello", "notion", "slack",
    }
)


def build_proven_block(verified_skills: list[dict]) -> str:
    """Baris bukti per bahasa, satu per baris."""
    rows = []
    for item in (verified_skills or [])[:MAX_PROVEN_SKILLS]:
        evidence = item.get("evidence") or {}
        last_used = evidence.get("last_used") or "tidak diketahui"
        rows.append(
            f"    - {item.get('skill')}: {item.get('level')} | "
            f"{evidence.get('repos', 0)} repo, "
            f"{evidence.get('own_commits', 0)} commit sendiri, "
            f"terakhir {last_used}"
        )
    if not rows:
        return "    (tidak ada bahasa dengan bukti commit publik)"
    return "\n".join(rows)


def build_unverifiable_block(
    merged_skills: list[str],
    verified_skills: list[dict],
) -> str:
    """Skill CV yang berada di luar jangkauan verifikasi bahasa."""
    proven = {
        str(item.get("skill", "")).strip().lower()
        for item in (verified_skills or [])
    }
    outside = [
        skill
        for skill in (merged_skills or [])
        if isinstance(skill, str)
        and skill.strip()
        and skill.strip().lower() not in proven
        and skill.strip().lower() not in TOOLING_SKILLS
    ]
    return ", ".join(outside) if outside else "tidak ada"


def build_activity_block(signals: dict | None) -> str:
    """Ringkasan angka aktivitas GitHub — menggantikan dump JSON mentah."""
    data = signals if isinstance(signals, dict) else {}
    return (
        f"repo publik {data.get('public_repos', 0)}, "
        f"dianalisis {data.get('repos_analyzed', 0)}, "
        f"total commit {data.get('commits', 0)}, "
        f"stars {data.get('stars', 0)}"
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m unittest test_screening -v`
Expected: PASS — `Ran 24 tests` … `OK`

- [ ] **Step 5: Commit**

```bash
git add app/services/screening.py test_screening.py
git commit -m "feat(screening): evidence block builders with tooling filter"
```

---

### Task 3: Full prompt assembly

**Files:**
- Modify: `backend/app/services/screening.py`
- Test: `backend/test_screening.py`

**Interfaces:**
- Consumes: Tasks 1–2
- Produces:
  - `CV_DATA_CHAR_CAP: int = 2500`
  - `PROMPT_VERSION: str = "v2"`
  - `build_screening_prompt(*, job_title: str, job_company: str, job_description: str, required_skills: list[str], cv_json: str, verified_skills: list[dict], merged_skills: list[str], signals: dict | None, anchor: int | None, matched_note: str, missing_note: str) -> str`

All parameters are keyword-only.

- [ ] **Step 1: Write the failing test**

Append to `backend/test_screening.py`:

```python
from app.services.screening import CV_DATA_CHAR_CAP, PROMPT_VERSION, build_screening_prompt


def make_prompt(**overrides):
    kwargs = dict(
        job_title="Frontend Developer (React)",
        job_company="Nusantara Apps",
        job_description="Implement responsive UIs with React.",
        required_skills=["React", "TypeScript"],
        cv_json='{"skills": ["React"]}',
        verified_skills=[vskill("TypeScript", level="menengah", repos=1, commits=82)],
        merged_skills=["React", "TypeScript", "Git"],
        signals={"public_repos": 50, "repos_analyzed": 48, "commits": 422, "stars": 0},
        anchor=40,
        matched_note="Skill yang cocok: typescript",
        missing_note="React",
    )
    kwargs.update(overrides)
    return build_screening_prompt(**kwargs)


class BuildPromptTests(unittest.TestCase):
    def test_contains_all_required_blocks(self):
        p = make_prompt()
        for block in (
            "--- JOB ---",
            "--- CV KANDIDAT ---",
            "--- BAHASA YANG TERBUKTI DARI COMMIT PUBLIK ---",
            "--- DI LUAR JANGKAUAN VERIFIKASI ---",
            "--- AKTIVITAS GITHUB ---",
            "--- RULES ---",
        ):
            self.assertIn(block, p)

    def test_includes_job_and_evidence_details(self):
        p = make_prompt()
        self.assertIn("Frontend Developer (React)", p)
        self.assertIn("Nusantara Apps", p)
        self.assertIn("82 commit sendiri", p)

    def test_tooling_absent_from_prompt_body(self):
        p = make_prompt(merged_skills=["Git", "React"])
        self.assertIn("React", p)
        # "Git" hanya boleh muncul dalam kalimat instruksi, bukan sebagai data
        self.assertNotIn("DI LUAR JANGKAUAN VERIFIKASI ---\n    Git", p)

    def test_anchor_block_states_allowed_range(self):
        p = make_prompt(anchor=40)
        self.assertIn("DETERMINISTIC ANCHOR", p)
        self.assertIn("40", p)
        self.assertIn("20", p)   # batas bawah 40-20
        self.assertIn("60", p)   # batas atas 40+20

    def test_no_anchor_block_when_anchor_is_none(self):
        p = make_prompt(anchor=None)
        self.assertNotIn("DETERMINISTIC ANCHOR", p)

    def test_cv_json_is_capped(self):
        long_cv = "x" * (CV_DATA_CHAR_CAP + 5000)
        p = make_prompt(cv_json=long_cv)
        self.assertLessEqual(p.count("x"), CV_DATA_CHAR_CAP)

    def test_instructs_model_not_to_accuse(self):
        p = make_prompt().lower()
        self.assertIn("ketiadaan bukti", p)

    def test_prompt_version_is_set(self):
        self.assertTrue(PROMPT_VERSION)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m unittest test_screening -v`
Expected: FAIL — `ImportError: cannot import name 'build_screening_prompt'`

- [ ] **Step 3: Write minimal implementation**

Append to `backend/app/services/screening.py`:

```python
# Batas panjang CV yang dikirim ke model
CV_DATA_CHAR_CAP = 2500
# Dimasukkan ke fingerprint cache. Naikkan setiap kali prompt berubah agar
# hasil lama tidak tercampur dengan hasil prompt baru.
PROMPT_VERSION = "v2"


def build_screening_prompt(
    *,
    job_title: str,
    job_company: str,
    job_description: str,
    required_skills: list[str],
    cv_json: str,
    verified_skills: list[dict],
    merged_skills: list[str],
    signals: dict | None,
    anchor: int | None,
    matched_note: str,
    missing_note: str,
) -> str:
    """Rakit prompt screening. CV dan GitHub dinilai berimbang."""
    anchor_block = ""
    if anchor is not None:
        low = max(0, anchor - MAX_DEVIATION)
        high = min(100, anchor + MAX_DEVIATION)
        anchor_block = f"""
    --- DETERMINISTIC ANCHOR ---
    Algorithmic skill-match = {anchor}% (matched: {matched_note}; missing: {missing_note}).
    match_score WAJIB berada di rentang {low}-{high}. Anchor adalah titik awal:
    naik hanya bila ada bukti pendukung, turun bila ada risiko nyata.
"""

    return f"""
    You are an expert AI Recruiting screener. Assess how well this candidate fits the job.
    Nilai kandidat dari CV DAN GitHub secara berimbang.

    --- JOB ---
    Title: {job_title}
    Company: {job_company}
    Requirements: {job_description}
    Required Skills: {", ".join(required_skills or []) or "tidak disebutkan"}

    --- CV KANDIDAT ---
    {cv_json[:CV_DATA_CHAR_CAP]}

    --- BAHASA YANG TERBUKTI DARI COMMIT PUBLIK ---
{build_proven_block(verified_skills)}

    --- DI LUAR JANGKAUAN VERIFIKASI ---
    {build_unverifiable_block(merged_skills, verified_skills)}

    PENTING: sistem HANYA bisa memverifikasi BAHASA PEMROGRAMAN dari commit di
    repo publik. Framework, styling, layanan cloud, tooling, dan skill non-kode
    TIDAK MUNGKIN terdeteksi - begitu juga seluruh pekerjaan di repo privat atau
    repo perusahaan.
    - JANGAN menyebut skill mana pun "tidak terbukti" atau "diragukan" hanya
      karena tidak muncul di daftar bahasa. Ketiadaan bukti BUKAN bukti ketiadaan.
    - JANGAN membahas tooling (Git, Docker, CI/CD) sebagai kekurangan.
    - Nilai skill tersebut dari CV dan pengalaman kerja seperti biasa.
    - Kamu BOLEH menilai kewajaran klaim lewat bahasa dasarnya (klaim React lebih
      masuk akal bila TypeScript/JavaScript terbukti).

    --- AKTIVITAS GITHUB ---
    {build_activity_block(signals)}
{anchor_block}
    --- RULES ---
    - Sebutkan angka bukti (repo/commit) saat memuji skill yang memang terbukti.
    - Jangan mengarang. Kalau tidak ada datanya, tulis "tidak disebutkan".
    - Respond in Bahasa Indonesia.

    Return ONLY valid JSON matching this exact structure (no markdown, no code blocks):
    {{
      "match_score": 55,
      "recommendation": "consider",
      "reasoning": "...",
      "strengths": ["..."],
      "weaknesses": ["..."]
    }}
    `recommendation` must be exactly one of: "interview", "consider", "reject".
"""
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m unittest test_screening -v`
Expected: PASS — `Ran 32 tests` … `OK`

- [ ] **Step 5: Commit**

```bash
git add app/services/screening.py test_screening.py
git commit -m "feat(screening): balanced CV+GitHub prompt assembly"
```

---

### Task 4: Wire the endpoint and invalidate stale cache

**Files:**
- Modify: `backend/app/routers/recruiter.py` — `_screening_fingerprint` (line ~52), `ai_candidate_screening` (line ~300)
- Test: `backend/test_screening.py`

**Interfaces:**
- Consumes: everything from Tasks 1–3
- Produces: no new public functions

- [ ] **Step 1: Write the failing test**

Append to `backend/test_screening.py`:

```python
class FingerprintVersionTests(unittest.TestCase):
    def test_prompt_version_is_part_of_fingerprint(self):
        """Prompt berubah -> cache lama harus otomatis dihitung ulang."""
        import inspect

        from app.routers import recruiter

        src = inspect.getsource(recruiter._screening_fingerprint)
        self.assertIn("PROMPT_VERSION", src)


class EndpointWiringTests(unittest.TestCase):
    def test_endpoint_uses_shared_screening_module(self):
        import inspect

        from app.routers import recruiter

        src = inspect.getsource(recruiter.ai_candidate_screening)
        self.assertIn("build_screening_prompt", src)
        self.assertIn("clamp_score", src)
        self.assertIn("derive_verdict", src)

    def test_endpoint_no_longer_dumps_raw_github_signals(self):
        import inspect

        from app.routers import recruiter

        src = inspect.getsource(recruiter.ai_candidate_screening)
        self.assertNotIn("[:1500]", src)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m unittest test_screening -v`
Expected: FAIL — `AssertionError: 'PROMPT_VERSION' not found` and `'build_screening_prompt' not found`

- [ ] **Step 3: Write minimal implementation**

3a. Add the import near the other service imports at the top of `backend/app/routers/recruiter.py`:

```python
from app.services.screening import (
    PROMPT_VERSION,
    build_screening_prompt,
    clamp_score,
    derive_verdict,
)
from app.services.skill_verification import verify_skills
```

3b. In `_screening_fingerprint`, add one entry to the `payload` dict (keep every existing key):

```python
        "github_signals": profile.github_signals or {},
        "prompt_version": PROMPT_VERSION,
    }
```

3c. In `ai_candidate_screening`, replace the no-CV fallback block so its verdict comes from the same rule as the main path. Replace:

```python
        return {
            "match_score": score,
            "recommendation": "consider",
```

with:

```python
        return {
            "match_score": score,
            "recommendation": derive_verdict(score),
```

3d. Replace the anchor computation and the whole inline `prompt = f"""..."""` literal with:

```python
    required = job.required_skills or []
    algo_score = round(jaccard_score(profile.merged_skills or [], required) * 100)
    # Lowongan tanpa required_skills -> anchor tidak bermakna, jangan menjepit
    anchor = algo_score if required else None
    reasons, missing = explain_match(profile.merged_skills or [], required)
    matched_note = "; ".join(reasons) if reasons else "tidak ada skill yang cocok terdeteksi"
    missing_note = ", ".join(missing[:8]) if missing else "tidak ada"

    prompt = build_screening_prompt(
        job_title=job.title,
        job_company=job.company,
        job_description=job.description or "",
        required_skills=required,
        cv_json=json.dumps(profile.cv_data, ensure_ascii=False),
        verified_skills=profile.verified_skills or [],
        merged_skills=profile.merged_skills or [],
        signals=profile.github_signals or {},
        anchor=anchor,
        matched_note=matched_note,
        missing_note=missing_note,
    )
```

Delete the now-unused `gh_summary = json.dumps(...)[:1500]` line.

3e. After `normalize_screening_result` succeeds, apply both guarantees before caching. Replace:

```python
    res_json["score_source"] = "ai"
    res_json["cached"] = False
```

with:

```python
    # Dua jaminan keras: skor dijepit ke anchor, verdict diturunkan dari skor.
    # Instruksi di prompt saja tidak cukup — model bisa mengabaikannya.
    res_json["match_score"] = clamp_score(res_json["match_score"], anchor)
    res_json["recommendation"] = derive_verdict(res_json["match_score"])
    res_json["score_source"] = "ai"
    res_json["cached"] = False
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m unittest test_screening -v`
Expected: PASS — `Ran 35 tests` … `OK`

Then verify the module still imports cleanly:

Run: `python -m py_compile app/routers/recruiter.py app/services/screening.py`
Expected: no output, exit 0

- [ ] **Step 5: Commit**

```bash
git add app/routers/recruiter.py test_screening.py
git commit -m "feat(screening): wire balanced prompt, clamp score, version cache"
```

---

### Task 5: Full verification

**Files:**
- Modify: none (verification only)

**Interfaces:**
- Consumes: Tasks 1–4
- Produces: nothing

- [ ] **Step 1: Run the whole backend suite**

Run: `python -m unittest discover -s . -p "test*.py"`
Expected: `Ran 88 tests` … `OK` (53 existing + 35 new). If any pre-existing test fails, stop and report — do not modify existing tests.

- [ ] **Step 2: Compile every touched module**

Run:
```bash
python -m py_compile app/main.py app/routers/recruiter.py app/services/screening.py app/services/skill_verification.py
```
Expected: no output, exit 0

- [ ] **Step 3: Confirm forbidden files are untouched**

Run:
```bash
cd .. && git status --short -- backend/app/services/matching.py githire-backend/ linkify/
```
Expected: empty output. Any line here means a global constraint was violated — revert that file.

- [ ] **Step 4: Confirm no new dependencies**

Run: `cd .. && git diff --stat -- backend/requirements.txt linkify/package.json`
Expected: empty output.

- [ ] **Step 5: Commit any remaining changes**

```bash
git status --short
```
Expected: clean tree. If not, inspect before committing.

---

## Manual smoke test (after Task 5, optional but recommended)

Requires a valid `GEMINI_API_KEY` and `GITHUB_TOKEN` in `backend/.env`. Confirms the live model honours the guardrails:

1. Start the backend: `uvicorn app.main:app --reload --port 8000`
2. As a recruiter, open an applicant with a synced profile.
3. Verify: `match_score` sits within `anchor ± 20`, and the verdict matches its band (≥60 interview, 35–59 consider, <35 reject).
4. Click "Analisis ulang" twice — the score may move a few points but the verdict should stay put unless a band boundary is crossed.
