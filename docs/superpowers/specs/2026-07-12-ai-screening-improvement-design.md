# AI Screening Improvement — Design Spec

**Date:** 2026-07-12
**Area:** Recruiter AI candidate screening (`POST /recruiter/applications/{id}/ai-screening`)
**Status:** Approved, ready for implementation plan

## Problem

The recruiter AI screening endpoint has six weaknesses:

1. **No persistence / cache.** Every time a recruiter opens an applicant, Gemini is called again. This wastes tokens, is slow, and produces a *different score each time* (nondeterministic). `JobApplication` has no column to store the result.
2. **`github_signals` ignored.** The strongest, verified signal (real commits, languages, repo activity) is never passed to the prompt — only `merged_skills` + `cv_data`. Screening loses GitHire's key differentiator.
3. **AI score has no anchor.** A deterministic algorithmic score (`jaccard_score`) already exists but the AI is not told it, so the two numbers can diverge wildly and confuse recruiters.
4. **No hallucination guard.** The prompt does not forbid inventing experience absent from the CV.
5. **Output is thin for decisions.** Only 2 strengths + 1 weakness. No verdict (interview / consider / reject) — recruiters want a recommendation, not just a number.
6. **Structured job fields unused.** `min_experience`, `min_education`, `work_type`, `salary` exist in the DB but never reach the prompt.

## Current Behaviour (baseline)

`backend/app/routers/recruiter.py` `ai_candidate_screening()`:
- Auth: recruiter role + owns the job.
- Loads `CandidateProfile`; if no `cv_data`, returns a hardcoded fallback `{match_score:10, strengths:[...], weaknesses:[...]}`.
- Builds a prompt with job title/company/description/required_skills + candidate merged_skills + cv_data.
- Calls `_call_gemini_with_retry`, parses via `_extract_json_data`, requires `match_score`.
- Adds `score_source:"ai"`. **Does not persist.**

Frontend `linkify/src/app/(main)/dashboard/recruiter/jobs/[id]/page.tsx`:
- react-query `["ai-screening", selectedApp?.id]` → POST endpoint when an applicant is selected.
- Renders a score ring (`aiResult.match_score`) + strengths/weaknesses.

## Design

### 1. Persistence + cache (DB)

Add two columns to `job_applications` (via idempotent DDL in `main.py` lifespan — no Alembic, matches existing pattern):

- `ai_screening` — `JSON`, nullable — the last screening result.
- `screening_fingerprint` — `VARCHAR(64)`, nullable — hash of the inputs that produced it.

Add the columns to `JobApplication` in `models.py` too.

**Fingerprint** = `sha256` hex digest of a canonical (sorted-key) JSON of the screening inputs:
- job: `required_skills`, `description`, `min_experience`, `min_education`, `work_type`, `salary`
- candidate: `merged_skills`, `cv_data`, `github_signals`

Stored as the full 64-char hex string.

**Endpoint flow:**
1. Load application, job (ownership check), profile — unchanged.
2. Keep the no-CV fallback (do not cache it).
3. Compute `current_fp`.
4. If `app.ai_screening` exists AND `app.screening_fingerprint == current_fp` AND `refresh` is not set → return the cached result with `cached: true`.
5. Otherwise build the prompt, call Gemini, validate, persist `ai_screening` + `screening_fingerprint`, commit, return with `cached: false`.

**Refresh:** accept `refresh: bool = False` query param to force recompute (used by a frontend "Analisis ulang" button).

### 2 + 6. Richer prompt inputs

Extend the prompt with:
- **`github_signals`** — passed compactly (commits, top languages, repo count — whatever keys exist in the dict).
- **Structured job fields** — `min_experience`, `min_education`, `work_type`, `salary`.

### 3. Algorithmic anchor

Before the Gemini call:
- `algo = round(jaccard_score(profile.merged_skills, job.required_skills) * 100)`
- `reasons, missing = explain_match(profile.merged_skills, job.required_skills)` — for matched / missing skills.

Feed into the prompt as an anchor: *"Algorithmic skill-match = {algo}% (matched: …, missing: …). Use this as your anchor; only deviate with justification grounded in the CV/GitHub evidence."*

### 4. Hallucination guard

Add explicit instruction: *only cite evidence present in the provided data; if information is missing, state "tidak disebutkan"; do not invent experience or skills.*

### 5. Verdict output

New response schema (backward-compatible — `strengths`/`weaknesses` retained):

```json
{
  "match_score": 85,
  "recommendation": "interview",
  "reasoning": "1-2 kalimat alasan singkat",
  "strengths": ["...", "..."],
  "weaknesses": ["..."],
  "score_source": "ai",
  "cached": false
}
```

- `recommendation` enum: `"interview" | "consider" | "reject"`.
- Server validates the enum; if the model returns something invalid, default to `"consider"`.
- `strengths`: 2–3 items; `weaknesses`: 1–2 items.
- Response is in Bahasa Indonesia (unchanged).

### Frontend (`recruiter/jobs/[id]/page.tsx`)

- Render a **recommendation badge** with a distinct colour per verdict (interview = success/green, consider = warning/amber, reject = muted/red) + a `reasoning` line, above the existing score ring.
- Add an **"Analisis ulang"** button that re-invokes the query with `refresh=true` (react-query refetch / mutation).
- Keep the score ring and strengths/weaknesses lists.
- Optionally show a subtle "tersimpan" indicator when `cached === true`.
- Theme + colours locked (GitHire violet); reuse existing tokens (`success`/`warning`).

## Error Handling

- Gemini failure → `502 "Layanan AI sedang tidak tersedia."` (unchanged).
- Invalid/missing `match_score` in AI JSON → `502 "Hasil analisis AI tidak valid."` (unchanged).
- Invalid `recommendation` → coerce to `"consider"` rather than failing.
- No-CV fallback is not cached and gets no `recommendation` change beyond existing behaviour (may include a neutral `recommendation:"consider"` for UI consistency).

## Out of Scope

- Editing `githire-backend/` (deploy copy — synced manually later).
- Changing the algorithmic Jaccard scoring itself.
- Batch/bulk screening of all applicants at once.

## Files Touched

| File | Change |
|------|--------|
| `backend/app/models.py` | Add `ai_screening`, `screening_fingerprint` to `JobApplication` |
| `backend/app/main.py` | Idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` in lifespan |
| `backend/app/routers/recruiter.py` | Fingerprint helper, cache logic, enriched prompt, verdict validation, `refresh` param |
| `linkify/src/app/(main)/dashboard/recruiter/jobs/[id]/page.tsx` | Recommendation badge + reasoning + "Analisis ulang" button |

## Verification

- Backend: `python -m py_compile app/main.py app/routers/recruiter.py app/models.py`.
- Frontend: `npx tsc --noEmit` (EXIT 0).
- Manual: recruiter opens applicant → screening runs once, second open returns cached (same score); "Analisis ulang" recomputes; result shows verdict + reasoning.
