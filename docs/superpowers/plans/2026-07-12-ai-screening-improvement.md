# AI Screening Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make recruiter AI screening persistent (cached, deterministic), evidence-rich (GitHub signals + structured job fields), anchored to the algorithmic score, hallucination-guarded, and decision-oriented (verdict + reasoning).

**Architecture:** Add two columns to `job_applications` to cache the screening result keyed by an input fingerprint. Rewrite the screening endpoint to (a) return the cache on a fingerprint hit, (b) otherwise build an enriched prompt — GitHub signals, structured job fields, and an algorithmic Jaccard anchor with a hallucination guard — call Gemini, validate a new verdict-bearing schema, persist, and return. Extend the recruiter frontend to render the verdict/reasoning and a "re-analyze" action.

**Tech Stack:** FastAPI + SQLAlchemy (Python 3.12), PostgreSQL (idempotent DDL in lifespan — no Alembic), Gemini via `_call_gemini_with_retry`, Next.js 14 + TypeScript + react-query.

## Global Constraints

- **No Alembic** — all schema changes are idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` inside `main.py` `lifespan()`.
- **Never edit `githire-backend/`** — it is the Hugging Face deploy copy; synced manually later, out of scope here.
- **No new dependencies** — use stdlib `hashlib`/`json` and existing services only.
- **Theme + colours locked** on the frontend (GitHire violet); this recruiter file already uses literal `emerald`/`amber`/`rose`/`violet` Tailwind classes — match that local palette, do not introduce new tokens.
- **Response language:** Bahasa Indonesia (unchanged).
- **No test suite in this repo.** Verification per project convention = `python -m py_compile <files>` for backend, `npx tsc --noEmit` for frontend, plus a manual runtime check. There is no pytest harness; do not invent one.
- **Commit after each task.** Do not push. Do not commit unrelated pre-existing working-tree changes — stage only the files named in each task.

---

### Task 1: DB columns + migration

**Files:**
- Modify: `backend/app/models.py` (class `JobApplication`, after `cover_letter` ~line 125)
- Modify: `backend/app/main.py` (lifespan DDL block, after the `cover_letter` migration ~line 144)

**Interfaces:**
- Produces: `JobApplication.ai_screening: dict | None` (JSON column) and `JobApplication.screening_fingerprint: str | None` (VARCHAR 64), populated/read by Task 2.

- [ ] **Step 1: Add columns to the model**

In `backend/app/models.py`, inside `class JobApplication`, immediately after the `cover_letter` line:

```python
    cover_letter: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_screening: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    screening_fingerprint: Mapped[str | None] = mapped_column(String(64), nullable=True)
```

(`JSON`, `String`, `Text` are already imported at the top of the file.)

- [ ] **Step 2: Add the idempotent migration**

In `backend/app/main.py`, right after the `cover_letter` migration block (the one ending `conn.commit()` at ~line 144) and before `db = Session(bind=engine)`:

```python
    # DDL Migration: tambah kolom cache AI screening ke job_applications
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE job_applications
            ADD COLUMN IF NOT EXISTS ai_screening JSON NULL
        """))
        conn.execute(text("""
            ALTER TABLE job_applications
            ADD COLUMN IF NOT EXISTS screening_fingerprint VARCHAR(64) NULL
        """))
        conn.commit()
```

- [ ] **Step 3: Verify backend compiles**

Run: `cd backend && python -m py_compile app/models.py app/main.py`
Expected: no output, exit 0.

- [ ] **Step 4: Verify migration applies (manual, if a DB is reachable)**

Run: `cd backend && uvicorn app.main:app --port 8000` — watch startup logs complete without a DDL error, then Ctrl-C. (If no DB is configured locally, skip; the DDL is idempotent and will run on deploy.)
Expected: server starts, no `ProgrammingError` on the new `ALTER TABLE`.

- [ ] **Step 5: Commit**

```bash
git add backend/app/models.py backend/app/main.py
git commit -m "feat(screening): add ai_screening + fingerprint cache columns"
```

---

### Task 2: Fingerprint helper + cache-aware endpoint

**Files:**
- Modify: `backend/app/routers/recruiter.py` (imports ~line 1-13; `ai_candidate_screening` ~line 194-258)

**Interfaces:**
- Consumes: `JobApplication.ai_screening`, `JobApplication.screening_fingerprint` (Task 1).
- Produces: `_screening_fingerprint(job: Job, profile: CandidateProfile) -> str`; endpoint now accepts `refresh: bool = False` query param and returns the result dict with a `cached: bool` key. Task 3 replaces the prompt/output body between fingerprint check and persist.

- [ ] **Step 1: Add `hashlib` import**

In `backend/app/routers/recruiter.py`, change the top import line:

```python
import hashlib
import json
import re
import uuid
```

- [ ] **Step 2: Add the fingerprint helper**

Add near the other module-level helpers (e.g. just above `_extract_json_data` at ~line 44):

```python
def _screening_fingerprint(job: "Job", profile: "CandidateProfile") -> str:
    """Hash semua input yang mempengaruhi hasil screening. Fingerprint sama → cache boleh dipakai."""
    payload = {
        "required_skills": sorted(job.required_skills or []),
        "description": job.description or "",
        "min_experience": job.min_experience or "",
        "min_education": job.min_education or "",
        "work_type": job.work_type or "",
        "salary": job.salary or "",
        "merged_skills": sorted(profile.merged_skills or []),
        "cv_data": profile.cv_data or {},
        "github_signals": profile.github_signals or {},
    }
    blob = json.dumps(payload, sort_keys=True, ensure_ascii=False, default=str)
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()
```

- [ ] **Step 3: Add the `refresh` param and cache read**

Change the endpoint signature to add `refresh`:

```python
@router.post("/applications/{application_id}/ai-screening")
def ai_candidate_screening(
    application_id: uuid.UUID,
    refresh: bool = False,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
```

Then, immediately after the `profile` no-CV fallback block (after the `return {... "weaknesses": [...]}` for the missing-CV case) and before `# Bangun prompt untuk Gemini AI`, insert the cache read:

```python
    fingerprint = _screening_fingerprint(job, profile)
    if not refresh and app.ai_screening and app.screening_fingerprint == fingerprint:
        cached = dict(app.ai_screening)
        cached["cached"] = True
        return cached
```

- [ ] **Step 4: Persist on the recompute path**

Replace the current tail of the endpoint:

```python
    res_json = _extract_json_data(text)
    if not res_json or "match_score" not in res_json:
        raise HTTPException(502, "Hasil analisis AI tidak valid. Silakan coba lagi.")
    # Tandai bahwa skor ini dari AI (berbeda metodologi dari skor algoritma di job list)
    res_json["score_source"] = "ai"
    return res_json
```

with:

```python
    res_json = _extract_json_data(text)
    if not res_json or "match_score" not in res_json:
        raise HTTPException(502, "Hasil analisis AI tidak valid. Silakan coba lagi.")
    # Tandai bahwa skor ini dari AI (berbeda metodologi dari skor algoritma di job list)
    res_json["score_source"] = "ai"
    res_json["cached"] = False
    app.ai_screening = res_json
    app.screening_fingerprint = fingerprint
    db.commit()
    return res_json
```

- [ ] **Step 5: Verify backend compiles**

Run: `cd backend && python -m py_compile app/routers/recruiter.py`
Expected: no output, exit 0.

- [ ] **Step 6: Manual cache check (if DB + Gemini reachable)**

With the server running and a recruiter token: POST the endpoint twice for the same application. Expected: first response `"cached": false`, second `"cached": true` with an identical `match_score`. Then POST with `?refresh=true` → `"cached": false` again. (Skip if no live DB/Gemini; logic is covered by compile + review.)

- [ ] **Step 7: Commit**

```bash
git add backend/app/routers/recruiter.py
git commit -m "feat(screening): cache result by input fingerprint with refresh override"
```

---

### Task 3: Enriched prompt + verdict output

**Files:**
- Modify: `backend/app/routers/recruiter.py` (`ai_candidate_screening` prompt block ~line 221-246; validation after `_extract_json_data`)

**Interfaces:**
- Consumes: `jaccard_score`, `explain_match` from `app.services.matching`; `refresh`/`fingerprint`/persist scaffolding from Task 2.
- Produces: response JSON with new keys `recommendation: "interview"|"consider"|"reject"` and `reasoning: str`, plus existing `match_score`, `strengths`, `weaknesses`, `score_source`, `cached`. Consumed by Task 4.

- [ ] **Step 1: Import the matching helpers**

At the top of `backend/app/routers/recruiter.py`, add to the existing service import:

```python
from app.services.gemini_service import _call_gemini_with_retry
from app.services.matching import jaccard_score, explain_match
```

- [ ] **Step 2: Add a recommendation whitelist constant**

Near the top of the module (after the imports / alongside other module constants):

```python
VALID_RECOMMENDATIONS = {"interview", "consider", "reject"}
```

- [ ] **Step 3: Compute the algorithmic anchor before the prompt**

In `ai_candidate_screening`, just before `# Bangun prompt untuk Gemini AI` (after the cache-read block from Task 2):

```python
    algo_score = round(jaccard_score(profile.merged_skills or [], job.required_skills or []) * 100)
    reasons, missing = explain_match(profile.merged_skills or [], job.required_skills or [])
    matched_note = "; ".join(reasons) if reasons else "tidak ada skill yang cocok terdeteksi"
    missing_note = ", ".join(missing[:8]) if missing else "tidak ada"
    gh_summary = json.dumps(profile.github_signals or {}, ensure_ascii=False, default=str)[:1500]
```

- [ ] **Step 4: Replace the prompt with the enriched version**

Replace the whole `prompt = f"""..."""` block with:

```python
    prompt = f"""
    You are an expert AI Recruiting screener. Assess how well this candidate fits the job.

    --- JOB ---
    Title: {job.title}
    Company: {job.company}
    Requirements: {job.description}
    Required Skills: {", ".join(job.required_skills or [])}
    Min Experience: {job.min_experience or "tidak disebutkan"}
    Min Education: {job.min_education or "tidak disebutkan"}
    Work Type: {job.work_type or "tidak disebutkan"}
    Salary: {job.salary or "tidak disebutkan"}

    --- CANDIDATE ---
    Skills (GitHub + CV, merged): {", ".join(profile.merged_skills or [])}
    GitHub signals (verified activity — commits, languages, repos): {gh_summary}
    CV History: {json.dumps(profile.cv_data, ensure_ascii=False)}

    --- DETERMINISTIC ANCHOR ---
    Algorithmic skill-match = {algo_score}% (matched: {matched_note}; missing: {missing_note}).
    Use this as your anchor. Only deviate from it when the CV or GitHub evidence justifies it,
    and if you do, explain why in `reasoning`.

    --- RULES ---
    - Only cite evidence that is actually present in the data above. Prefer verified GitHub signals over unproven CV claims.
    - If information is missing, write "tidak disebutkan" — never invent experience, skills, or numbers.
    - Give a clear hiring recommendation.
    - Respond in Bahasa Indonesia.

    Return ONLY valid JSON matching this exact structure (no markdown, no code blocks):
    {{
      "match_score": 85,
      "recommendation": "interview",
      "reasoning": "Kandidat memenuhi mayoritas skill inti dan aktivitas GitHub-nya konsisten dengan klaim CV.",
      "strengths": ["Pengalaman React 2 tahun terbukti di GitHub", "Menguasai TypeScript"],
      "weaknesses": ["Belum ada pengalaman deployment cloud (AWS/GCP)"]
    }}
    `recommendation` must be exactly one of: "interview", "consider", "reject".
    """
```

- [ ] **Step 5: Validate the verdict before persisting**

In the validation tail (from Task 2), between the `match_score` check and `res_json["score_source"] = "ai"`, add:

```python
    if res_json.get("recommendation") not in VALID_RECOMMENDATIONS:
        res_json["recommendation"] = "consider"
    if not isinstance(res_json.get("reasoning"), str):
        res_json["reasoning"] = ""
    res_json.setdefault("strengths", [])
    res_json.setdefault("weaknesses", [])
```

- [ ] **Step 6: Give the no-CV fallback a verdict (UI consistency)**

Update the early no-CV fallback `return` so it carries the new keys:

```python
        return {
            "match_score": 10,
            "recommendation": "consider",
            "reasoning": "Profil kandidat belum lengkap sehingga penilaian terbatas.",
            "strengths": ["Profil kandidat belum disinkronkan sepenuhnya."],
            "weaknesses": ["Kandidat belum mengunggah CV / portofolio."],
            "score_source": "ai",
            "cached": False,
        }
```

- [ ] **Step 7: Verify backend compiles**

Run: `cd backend && python -m py_compile app/routers/recruiter.py`
Expected: no output, exit 0.

- [ ] **Step 8: Manual output check (if DB + Gemini reachable)**

POST the endpoint for a candidate with a CV. Expected keys present: `match_score`, `recommendation` ∈ {interview,consider,reject}, `reasoning` (non-empty string), `strengths`, `weaknesses`, `score_source:"ai"`, `cached`. (Skip if no live Gemini.)

- [ ] **Step 9: Commit**

```bash
git add backend/app/routers/recruiter.py
git commit -m "feat(screening): enrich prompt with github signals + algo anchor, add verdict output"
```

---

### Task 4: Frontend verdict + re-analyze

**Files:**
- Modify: `linkify/src/app/(main)/dashboard/recruiter/jobs/[id]/page.tsx` (type ~line 72; query ~line 100; AI panel ~line 807-876)

**Interfaces:**
- Consumes: endpoint response `{ match_score, recommendation?, reasoning?, strengths, weaknesses, cached? }` (Task 3).

- [ ] **Step 1: Extend the result type**

Replace the `AIScreeningResult` type (~line 72):

```typescript
type AIScreeningResult = {
    match_score: number;
    recommendation?: "interview" | "consider" | "reject";
    reasoning?: string;
    strengths: string[];
    weaknesses: string[];
    cached?: boolean;
};
```

- [ ] **Step 2: Add a re-analyze mutation**

Immediately after the `aiResult` `useQuery` block (~line 105), add:

```typescript
    // Paksa analisis ulang (bypass cache backend via ?refresh=true)
    const refreshScreening = useMutation({
        mutationFn: () =>
            withAuth<AIScreeningResult>(`/recruiter/applications/${selectedApp?.id}/ai-screening?refresh=true`, { method: "POST" }),
        onSuccess: (data) => {
            qc.setQueryData(["ai-screening", selectedApp?.id], data);
            toast.success("Analisis diperbarui.");
        },
        onError: () => toast.error("Gagal menganalisis ulang."),
    });
```

(`useMutation`, `qc`, `toast`, `withAuth` are already in scope in this file.)

- [ ] **Step 3: Add a verdict config map**

Above the component's `return` (near other local consts), add:

```typescript
    const VERDICT: Record<string, { label: string; cls: string }> = {
        interview: { label: "Rekomendasi: Interview", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
        consider: { label: "Rekomendasi: Pertimbangkan", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
        reject: { label: "Rekomendasi: Tolak", cls: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
    };
```

- [ ] **Step 4: Render verdict badge + reasoning + re-analyze button**

In the AI panel header row (~line 811-820), replace the static "Dianalisis secara real-time" span with a re-analyze button:

```tsx
                                    <button
                                        onClick={() => refreshScreening.mutate()}
                                        disabled={refreshScreening.isPending || !selectedApp?.id}
                                        className="text-[10px] font-semibold flex items-center gap-1 text-violet-300 hover:text-violet-200 disabled:opacity-50"
                                    >
                                        <Sparkles className="w-3 h-3 text-amber-400" />
                                        {refreshScreening.isPending ? "Menganalisis…" : "Analisis ulang"}
                                    </button>
```

Then, inside the `aiResult ?` branch, immediately before the `grid grid-cols-1 md:grid-cols-12` div (~line 828), insert the verdict + reasoning block:

```tsx
                                    {aiResult.recommendation && (
                                        <div className="mb-4 space-y-2">
                                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${VERDICT[aiResult.recommendation]?.cls ?? ""}`}>
                                                {VERDICT[aiResult.recommendation]?.label ?? aiResult.recommendation}
                                            </span>
                                            {aiResult.reasoning && (
                                                <p className="text-xs text-muted-foreground leading-relaxed">{aiResult.reasoning}</p>
                                            )}
                                        </div>
                                    )}
```

Note: the verdict block and the existing score-grid are sibling elements — wrap them if the `aiResult ?` branch currently returns a single element. Change:

```tsx
                                ) : aiResult ? (
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
```

to:

```tsx
                                ) : aiResult ? (
                                    <div>
                                    {aiResult.recommendation && (
                                        <div className="mb-4 space-y-2">
                                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${VERDICT[aiResult.recommendation]?.cls ?? ""}`}>
                                                {VERDICT[aiResult.recommendation]?.label ?? aiResult.recommendation}
                                            </span>
                                            {aiResult.reasoning && (
                                                <p className="text-xs text-muted-foreground leading-relaxed">{aiResult.reasoning}</p>
                                            )}
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
```

and add the matching extra closing `</div>` after the grid's closing `</div>` (before the `) : (` for the run-screening fallback).

- [ ] **Step 5: Verify frontend type-checks**

Run: `cd linkify && npx tsc --noEmit`
Expected: exit 0, no errors.

- [ ] **Step 6: Manual UI check (if app runs)**

`pnpm dev` → open a recruiter job → select an applicant. Expected: verdict badge (colour by verdict) + reasoning line above the score ring; "Analisis ulang" recomputes and toasts. (Skip if not running locally.)

- [ ] **Step 7: Commit**

```bash
git add "linkify/src/app/(main)/dashboard/recruiter/jobs/[id]/page.tsx"
git commit -m "feat(screening): show verdict + reasoning and add re-analyze button"
```

---

## Self-Review

**Spec coverage:**
- #1 cache/persist → Task 1 (columns) + Task 2 (fingerprint, cache read/write, refresh). ✓
- #2 github_signals in prompt → Task 3 Step 3-4 (`gh_summary`). ✓
- #3 algorithmic anchor → Task 3 Step 3-4 (`algo_score`, matched/missing). ✓
- #4 hallucination guard → Task 3 Step 4 (RULES block). ✓
- #5 verdict output → Task 3 Step 4-6 + Task 4 (badge/reasoning). ✓
- #6 structured job fields → Task 3 Step 4 (min_experience/education/work_type/salary). ✓
- Frontend re-analyze → Task 4 Step 2, 4. ✓
- Backward compat (strengths/weaknesses retained) → Task 3 keeps both; fallback updated. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code. ✓

**Type consistency:** `_screening_fingerprint(job, profile)` defined once, called once (Task 2). `recommendation` enum identical in backend `VALID_RECOMMENDATIONS`, prompt, and frontend `VERDICT` map / TS union. Response keys (`match_score`, `recommendation`, `reasoning`, `strengths`, `weaknesses`, `score_source`, `cached`) consistent across Task 3 producer and Task 4 consumer. ✓
