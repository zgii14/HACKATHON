# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**GitHire** ("From Code to Career") — AI-powered recruitment platform for Indonesian developers. Built for Hackathon Digdaya 2026. Status: ~99% complete. All core features shipped; pending final end-to-end live verification on production.

## Repository Structure

```
backend/          FastAPI backend (Python 3.12)
linkify/          Next.js 14 frontend (TypeScript)
githire-backend/  Copy of backend for Hugging Face deploy — DO NOT EDIT THIS
docs/plans/       Task tracker (task.md) + design/implementation docs
docker-compose.yml PostgreSQL 16 local dev DB
```

## Development Commands

### Backend (FastAPI)

```bash
cd backend

# Activate venv
.venv\Scripts\activate          # Windows PowerShell
source .venv/bin/activate       # Linux/Mac

# Install deps
pip install -r requirements.txt

# Run dev server
uvicorn app.main:app --reload --port 8000

# Type check (no dedicated test suite)
python -m py_compile app/main.py
```

### Frontend (Next.js)

```bash
cd linkify

# Install (uses pnpm)
pnpm install

# Dev server
pnpm dev          # runs on http://localhost:3000

# Build
pnpm build

# Lint
pnpm lint


# TypeScript check
npx tsc --noEmit
```

### Local Database

```bash
# Start PostgreSQL 16
docker-compose up -d

# Default credentials: githire / githire / githire (user/pass/db), port 5432
```

## Environment Variables

### `backend/.env` (copy from `.env.example`)

```
DATABASE_URL=postgresql://githire:githire@localhost:5432/githire
GEMINI_API_KEY=
CLERK_JWKS_URL=https://YOUR_INSTANCE.clerk.accounts.dev/.well-known/jwks.json
CLERK_ISSUER=https://YOUR_INSTANCE.clerk.accounts.dev
CORS_ORIGINS=http://localhost:3000
ADMIN_SECRET=        # required for /admin/* endpoints
GITHUB_TOKEN=        # optional, raises GitHub API rate limit
RECRUITER_EMAILS=    # optional comma-separated, auto-assigns recruiter role
```

### `linkify/.env.local` (copy from `.env.example`)

```
NEXT_PUBLIC_APP_NAME=GitHire
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

## Architecture

### Auth Flow

Clerk issues JWTs → backend validates via JWKS (`auth.py:decode_clerk_token`) → auto-creates/syncs `User` row on first request. Role (`candidate` | `recruiter`) is determined by email whitelist in `auth.py` (env `RECRUITER_EMAILS` + hardcoded `recruiter@githire.com`), not stored role.

### Database Migrations

**No Alembic.** All DDL migrations run as idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements inside FastAPI's `lifespan()` in `main.py`. Adding new columns: append to the lifespan block. Schema is defined in `app/models.py`.

### Skill Matching

Jaccard similarity between `candidate_profiles.merged_skills` (JSON array) and `jobs.required_skills` (JSON array). 100+ skill aliases live in `backend/app/services/matching.py`. Scores are cached in `job_matches` table.

### Roadmap System

`roadmap_progress.roadmap_key` = `"_generic"` for general roadmap, or a job UUID string for per-job roadmap. Gemini generates roadmap steps; quiz per step via `gemini_service.py`.

### Frontend API Pattern

All API calls go through `useApi().withAuth(path, init)` (in `linkify/src/hooks/use-api.ts`). This hook waits for Clerk token readiness and injects the `Authorization: Bearer <token>` header automatically. Use `enabled: authReady` in React Query calls.

### Recruiter vs Candidate

Role is determined per-request in `get_current_user()` — email match overrides whatever is in the DB. Recruiter routes live under `/recruiter/*` on both backend (`app/routers/recruiter.py`) and frontend (`/dashboard/recruiter/*`).

### AI Screening (Recruiter)

Endpoint `POST /recruiter/applications/{id}/screen` — fingerprint-cached AI analysis of a candidate against a job.

- **Fingerprint cache**: sha256 of `{required_skills, description, min_experience, min_education, work_type, salary, merged_skills, cv_data, github_signals}`. If cached + fingerprint matches → returns instantly with `cached: true`. Pass `?refresh=true` to force recompute.
- **Prompt enrichment**: structured `--- JOB ---` + `--- CANDIDATE ---` blocks with github_signals (repos, languages, stars) + `--- DETERMINISTIC ANCHOR ---` (jaccard score + explain_match reasons/missing) to reduce hallucination.
- **Verdict output**: `recommendation` ∈ `{interview, consider, reject}` + `reasoning` string. Invalid recommendation coerced to `"consider"`.
- **DB columns**: `job_applications.ai_screening` (JSON), `job_applications.screening_fingerprint` (VARCHAR 64) — added as idempotent migrations in `main.py` lifespan.
- **Frontend**: `linkify/src/app/(main)/dashboard/recruiter/jobs/[id]/page.tsx` shows verdict badge (emerald/amber/rose) + reasoning + "Analisis ulang" button.

### Frontend Design System (Workbench)

All dashboard pages follow **Workbench (app-surface)** aesthetic — modern-minimal, data-dense, hairline borders, no cards/gradients/score-rings.

**Shared primitives** live in `linkify/src/components/dashboard/ui.tsx`:
- `Reveal` — fade+slide-up via framer-motion, respects `prefers-reduced-motion`
- `JobListRow` — stagger-animated list row with expandable detail, `index` prop controls delay
- `Spotlight` — hover-follow radial gradient + lift (-translate-y-0.5), wraps any block
- `CountUp` — number count-up animation on mount
- `BarFill` — animated progress bar (tones: `primary` / `warning` / `success`)
- `PageHeader`, `Crumb`, `SecTitle`, `EmptyState`, `MatchCell`, `ActionLink`

**Motion constants**: `EASE_OUT = [0.16, 1, 0.3, 1]`. All animation via `framer-motion` (v11.9.0, already installed — do NOT add new animation deps).

**Theme**: GitHire violet — LOCKED. Never change `--primary` or color tokens.

### Admin Endpoints

- `POST /admin/reseed-jobs` — reset + reseed static job data (requires `X-Admin-Secret` header)
- `POST /admin/scrape-jobs` — Selenium scrape from Glints (requires `X-Admin-Secret`, needs ChromeDriver, takes 2–10 min)

## Deployment

| Layer    | Service              | Notes                                          |
|----------|----------------------|------------------------------------------------|
| DB       | Neon (serverless PG) | Connection string in `DATABASE_URL`            |
| Backend  | Hugging Face Spaces  | Docker, port 7860 (`PORT` env var)             |
| Frontend | Vercel               | Root dir: `/linkify`                           |

The `githire-backend/` directory is the backend copy pushed to the HF Space repo. Sync changes from `backend/` → `githire-backend/` before deploying. Never edit `githire-backend/` directly.

## Key Files

| File | Purpose |
|------|---------|
| `backend/app/auth.py` | Clerk JWT validation + User auto-create/sync + role logic |
| `backend/app/main.py` | FastAPI app + all DDL migrations in lifespan() |
| `backend/app/models.py` | SQLAlchemy models — source of truth for schema |
| `backend/app/services/matching.py` | Jaccard matching + skill alias table + `explain_match()` |
| `backend/app/services/gemini_service.py` | All Gemini AI calls (roadmap, quiz, CV parse, screening) |
| `backend/app/routers/recruiter.py` | Recruiter endpoints incl. AI screening with fingerprint cache |
| `linkify/src/components/dashboard/ui.tsx` | Shared Workbench UI primitives (Reveal, Spotlight, CountUp, BarFill, JobListRow, etc.) |
| `linkify/src/hooks/use-api.ts` | Auth-aware fetch wrapper used by all pages |
| `docs/plans/task.md` | Master task tracker |
