# Skill Gap Scoring v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task.

**Goal:** Replace skill-gap scoring from a truncated union-of-skills coverage into accurate per-job readiness against relevant active jobs.

**Architecture:** Extract pure computation into `app/services/skill_gap.py`, `app/services/job_category.py`, and `app/services/market_scope.py`. The `/me/skill-gap` endpoint becomes a thin adapter. Job relevance moves from "at least one overlapping skill" to an explicit `jobs.categories` array.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic v2, `unittest`, Next.js 14, React Query, framer-motion.

---

## Audit findings that justify this work

| # | Defect | Evidence |
|---|---|---|
| 1 | Coverage computed from a list truncated to 15 | `backend/app/routers/me.py:446`, `linkify/src/app/(main)/dashboard/skill-gap/page.tsx:107-109` |
| 2 | Union-of-skills coverage is not a valid readiness metric | Backend profile scored 7% while fully satisfying a seeded backend job |
| 3 | Interest filter leaks across fields (backend matched 47/56 seed jobs) | `backend/app/routers/me.py:366-371` |
| 4 | `UNVERIFIED` badge is unreachable: missing and weak sets are disjoint | `me.py:440-444` vs `me.py:450-454`, `page.tsx:219-231` |
| 5 | Closed jobs still shape "market" demand | `me.py:356` vs `backend/app/routers/jobs.py:30` |
| 6 | Demand aggregation skips alias normalization | `me.py:382-384` vs `me.py:443` |
| 7 | Frontend category matching uses substrings (`C` matches `CSS`) | `page.tsx:47-51` |
| 8 | Dashboard home gap count silently capped at 15 | `linkify/src/app/(main)/dashboard/page.tsx:134` |
| 9 | "weak / perlu diperkuat" overclaims absence of GitHub signal | `me.py:448-456`, `profile/page.tsx:303-311` |

## Locked decisions

- Primary metric: readiness against relevant jobs — `ready_jobs / relevant_jobs` plus median coverage.
- Ready threshold: 70% of a job's requirements.
- Relevance: explicit multi-value `jobs.categories`.
- Closed jobs excluded from all market analysis.
- Canonical skill normalization before aggregation.
- Full `missing_skill_count` separate from the top-15 display array.
- Missing skills and unproven (no GitHub evidence) skills rendered in separate sections.

## Response contract

```json
{
  "has_profile": true,
  "readiness": { "ready_jobs": 6, "relevant_jobs": 17, "median_coverage_pct": 62, "threshold_pct": 70 },
  "mode_info": { "requested": "auto", "effective": "interests", "fallback_reason": null },
  "missing_skill_count": 34,
  "missing_skills": ["Kafka"],
  "missing_demand": [{ "skill": "Kafka", "canonical_skill": "kafka", "job_count": 4 }],
  "unproven_demand": [{ "skill": "PostgreSQL", "canonical_skill": "postgresql", "job_count": 11 }],
  "user_skill_count": 24,
  "market_skill_count": 58,
  "github_backed_count": 9,
  "verified_skill_count": 4,
  "interests": ["backend"],
  "skill_freq": [], "weak_skills": [], "total_job_skills": 58, "mode": "interests"
}
```

The last four fields are deprecated mirrors kept until every consumer migrates.

## Seed category mapping

| Index | Section | categories |
|---|---|---|
| 0-8 | Backend | `["backend"]` |
| 9-13 | Frontend | `["frontend"]` |
| 14-17 | Full Stack | `["fullstack","backend","frontend"]` |
| 18-24 | Data | `["data"]` |
| 25-30 | AI/ML | `["ai_ml"]`, index 28 MLOps also `devops` |
| 31-35 | Mobile | `["mobile"]` |
| 36-40 | DevOps | `["devops"]` |
| 41-43 | QA | `["qa"]` |
| 44-45 | Security | `["security"]` |
| 46 | UI Focus | `["frontend"]` |
| 47-48 | Blockchain | `["blockchain"]`, index 48 also `backend` |
| 49-50 | IoT | `["iot"]` |
| 51-52 | Game | `["game"]` |
| 53-55 | Product Eng | `["fullstack","backend"]` |

Effect: the backend interest scopes to 17/56 jobs instead of 47/56.

## Tasks

1. Pure `skill_gap` service + tests
2. `job_category` classifier + tests
3. `jobs.categories` column, migration, backfill, seed tagging
4. Shared `market_scope` resolver + tests
5. `SkillGapOut` contract extension
6. Rewrite `/me/skill-gap` endpoint as a thin adapter
7. Generic roadmap reuses the shared scope
8. Recruiter payload/form and scraper populate categories
9. Rewrite the skill-gap page around job readiness
10. Update dashboard home and profile consumers
11. End-to-end verification
12. Sync `githire-backend/` deploy copy

Optional follow-up: rename `jaccard_score` to `requirement_coverage` and correct marketing copy.

## Risks

| Risk | Mitigation |
|---|---|
| Legacy recruiter jobs lack categories | Classifier backfill in lifespan; uncategorized jobs surface only in "Semua" mode |
| `ready_jobs` looks low for juniors | Honest by design; median coverage provides progress signal |
| Deprecated fields linger | Remove after task 10 is verified in production |
| 70% threshold too rigid | Single `READY_THRESHOLD` constant |
