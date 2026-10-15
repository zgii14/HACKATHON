# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**GitHire** ("From Code to Career") — AI-powered portfolio + recruitment platform for Indonesian developers. Started at Hackathon Digdaya 2026; now a **production product** (design for startup scale, not a demo). Candidates publish a portfolio at `nama.githire.my.id`. Candidate flow verified live on production; recruiter flow still pending live verification.

## Repository Structure

```
backend/          FastAPI backend (Python 3.12); tests are backend/test_*.py (unittest)
linkify/          Next.js 14 frontend (TypeScript); helper tests in linkify/tests/*.test.mts
docs/plans/       Task tracker (task.md) + design/implementation docs
docs/superpowers/ Specs + implementation plans per feature
docs/runbooks/    Ops runbooks (DNS migration)
docs/prompts/     Prompts for other AIs (new portfolio theme)
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

# Tests (unittest, ~310 tests; pytest is not installed)
python -m unittest discover -p "test_*.py"

# Single test file
python -m unittest test_portfolio
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

# Helper tests (node:test, Node 24 strips types)
node --test tests/*.test.mts
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

Clerk issues JWTs → backend validates via JWKS (`auth.py:decode_clerk_token`) → auto-creates/syncs `User` row on first request.

### Roles — read this before touching anything role-related

**`auth.py:resolve_effective_role(db_role, email)` is the ONLY place role is decided.** It is pure and unit-tested (`test_role_resolution.py`). Never re-derive role anywhere else.

| DB role | Email in allowlist? | Effective role | `recruiter_access_denied` |
|---------|--------------------|----------------|---------------------------|
| anything | yes | `recruiter` | `false` |
| `recruiter` | no | `candidate` | **`true`** |
| `candidate` | no | `candidate` | `false` |
| `NULL` | no | `NULL` → frontend auto-assigns `candidate` | `false` |

- Allowlist = env **`RECRUITER_EMAILS`** (comma-separated, case-insensitive) + hardcoded `recruiter@githire.com`. **Must be set in Railway too** — an empty allowlist silently makes every recruiter a candidate.
- Stored `users.role` is NOT authoritative; it is overridden per-request.
- Demotions are never silent: `/me/profile` returns `recruiter_access_denied`, and the shell shows a toast explaining why.

**Route protection:** `linkify/src/utils/constants/roles.ts` owns the route→role map. Any `/dashboard/*` path that isn't listed as recruiter-only or shared defaults to candidate-only, so new pages are guarded automatically. `dashboard-shell.tsx` calls `redirectForRole()` — do NOT add per-page `if (pathname === ...)` checks.

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

**Typography tokens** (`tailwind.config.ts` → `fontSize`): `text-micro` 10.5px, `text-meta` 11.5px (mono labels/metadata), `text-body` 14px, `text-read` 15px. Use these instead of ad-hoc `text-[11px]`-style sizes.

**Theme**: GitHire violet — LOCKED. Never change `--primary` or color tokens. Light theme is forced on `/`, `/dashboard*`, `/auth*`. Fonts (Plus Jakarta Sans, JetBrains Mono) are imported only in `app/layout.tsx` from `utils/constants/fonts` — never re-export them from the `@/utils` barrel (the font CSS then drops off the root layout).

The custom text sizes are registered with tailwind-merge in `utils/functions/cn.ts`, so `cn("text-meta", "text-primary")` keeps both.

### Portfolio + subdomains

- Public portfolio: `/p/[publicId]` (`?theme=`, `embed=1` for the landing iframe). Themes live in `components/portfolio/` and are registered in several places (frontend + `backend/app/services/portfolio.py` `PORTFOLIO_THEMES` + `schemas.py`); see `docs/prompts/portfolio-theme-prompt.md` before adding one — several registrations fail silently.
- Subdomains: `middleware.ts` rewrites `nama.githire.my.id/` → `/s/[name]`, which resolves via `GET /public/subdomains/{name}`. Claim/check in `routers/portfolio.py`, rules in `services/subdomain.py` (30-day change cooldown, old name held 30 days). `PORTFOLIO_SUBDOMAINS_LIVE` (Railway) switches `public_url` to the subdomain.
- Editor: `components/portfolio/editor/` — sidebar sections (`?bagian=`), autosave via a single-flight queue, localStorage backup.

### Admin Endpoints

- `POST /admin/reseed-jobs` — reset + reseed static job data (requires `X-Admin-Secret` header)
- `POST /admin/scrape-jobs` — Selenium scrape from Glints (requires `X-Admin-Secret`, needs ChromeDriver, takes 2–10 min)

## Deployment

| Layer    | Service              | Notes                                          |
|----------|----------------------|------------------------------------------------|
| DB       | Neon (serverless PG) | Connection string in `DATABASE_URL`            |
| Backend  | Railway              | `https://githire.up.railway.app` — root `/backend`, `backend/Dockerfile`, healthcheck `/health` |
| Frontend | Vercel               | `https://www.githire.my.id` — root dir `/linkify` |

Both auto-deploy on push to `master` of `zgii14/HACKATHON` (Vercel ~15s, Railway a few minutes). Check with the GitHub commit status API (`/repos/zgii14/HACKATHON/commits/<sha>/status`) — it reports both.

- Railway account: `admin.githire@gmail.com`, project `hearty-recreation`, service `HACKATHON`, env `production`. Other Railway accounts on dev machines (e.g. project `impartial-grace`) are NOT production.
- Railway env must include `RECRUITER_EMAILS` (set) and `ADMIN_SECRET` (**not set yet** — `/admin/*` endpoints are unusable in production until it is).
- After a deploy, a browser may serve cached chunks for a minute; verify with a cache-busting query string.
- DNS for `githire.my.id` is on **Vercel DNS** (moved from sitequ.id on 2026-10-15): 5 Clerk CNAMEs + wildcard `*.githire.my.id` on the Vercel project. Zoho email was dropped on purpose. Runbook: `docs/runbooks/2026-10-15-dns-vercel-migration.md`.
- `fork` remote (`reginaadelisa/HACKATHON`) is stale and not used for deploys.

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
