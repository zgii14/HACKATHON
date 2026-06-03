# B2B Candidate Search Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implement a comprehensive candidate search page for recruiters to source tech talents based on skills, location, and GitHub keaktifan.

**Architecture:** A new backend REST endpoint will query PostgreSQL using GIN indexing for fast skill array matching and ILIKE search for bio details. The Next.js frontend will render a dedicated page with parametric filters and direct invite triggers.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, FastAPI, PostgreSQL, SQLAlchemy, TanStack Query.

---

### Task 1: Database Indexing for Sourcing Performance

**Files:**
- Modify: `backend/app/main.py:37-60` (Add indexing migration statement on startup)

**Step 1: Write SQL indices migration query**

Modify the database startup migration block in `backend/app/main.py` (inside the `lifespan` block) to run the following statements:
```python
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_candidate_profiles_skills 
            ON candidate_profiles USING gin (merged_skills);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_candidate_profiles_name 
            ON candidate_profiles (bio_full_name);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_candidate_profiles_address 
            ON candidate_profiles (bio_address);
        """))
```

**Step 2: Run startup file compilation check**

Run: `python -m py_compile backend/app/main.py`
Expected: Output is clean (0 compile errors).

**Step 3: Commit migration**

```bash
git add backend/app/main.py
git commit -m "migration: add PostgreSQL indexes for candidate search performance"
```

---

### Task 2: Backend Candidate Search API Route

**Files:**
- Modify: `backend/app/routers/recruiter.py` (Add `/candidates/search` endpoint)

**Step 1: Implement search endpoint**

Add the endpoint `@router.get("/candidates/search")` inside `backend/app/routers/recruiter.py`:
- Parameters:
  - `q: str | None = None`
  - `skills: list[str] = Query([])`
  - `location: str | None = None`
  - `min_commits: int | None = None`
  - `limit: int = 20`
  - `offset: int = 0`
- Logic:
  - Validate that `user.role == "recruiter"`.
  - Base query: `db.query(CandidateProfile, User).join(User, CandidateProfile.user_id == User.id)`
  - If `q` is provided, filter name or address: `CandidateProfile.bio_full_name.ilike(f"%{q}%") | CandidateProfile.bio_address.ilike(f"%{q}%")`
  - If `skills` is provided, normalize them via `normalize_skill` and query: `CandidateProfile.merged_skills.contains(normalized_skills)`
  - If `location` is provided, filter: `CandidateProfile.bio_address.ilike(f"%{location}%")`
  - If `min_commits` is provided, parse JSON structure `github_signals -> 'commits'` and filter.
  - Return: list of profiles including unmasked full name, email, phone, github, and skills.

**Step 2: Verify Python compilation**

Run: `python -m py_compile backend/app/routers/recruiter.py`
Expected: Output is clean (0 compile errors).

**Step 3: Commit search API**

```bash
git add backend/app/routers/recruiter.py
git commit -m "feat: add B2B candidate search API endpoint"
```

---

### Task 3: Frontend Candidate Search Page & Direct Invite UI

**Files:**
- Create: `linkify/src/app/(main)/dashboard/recruiter/candidates/page.tsx`
- Modify: `linkify/src/components/recruiter-nav.tsx` (or sidebar navigation component to add candidates lookup link)

**Step 1: Code the candidate sourcing page**

Create `linkify/src/app/(main)/dashboard/recruiter/candidates/page.tsx` with:
- State hooks for `q`, `skills`, `location`, `minCommits`.
- A query hook using TanStack Query fetching `/recruiter/candidates/search?q=...`.
- Split Layout: Left sidebar filters, right search results grid.
- Candidate cards rendering: full name, email, phone, github username link, address, and skills tags.
- Direct invite button launching interview scheduling dialog modal and dispatching state mutations on success.

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit` inside `linkify`
Expected: 0 type errors.

**Step 3: Commit frontend page**

```bash
git add linkify/src/app/(main)/dashboard/recruiter/candidates/page.tsx
git commit -m "feat: add B2B candidate search and invite page on frontend"
```
