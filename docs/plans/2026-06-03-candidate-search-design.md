# Candidate Search Design Document

**Goal:** Implement a comprehensive candidate search feature for recruiters to look up and filter technical talents from the GitHire database.

**Date:** 2026-06-03

---

## 1. System Architecture & Components

The feature will consist of a hybrid search approach combining PostgreSQL full-text/indexed search with parametric filters (location, GitHub activity, and specific skills).

```
[Next.js Recruiter Dashboard]
            │
            ▼ (REST API HTTP GET)
[FastAPI Candidate Search Router]
            │
            ▼ (SQLAlchemy ORM + GIN Indexes)
[PostgreSQL Database]
```

---

## 2. Database Layer Changes

To ensure optimal performance when querying candidate skills and biographical details, we will introduce:
1. A **GIN (Generalized Inverted Index)** on the `merged_skills` JSON array column of the `candidate_profiles` table.
2. Indexing on filter columns (`bio_full_name`, `bio_address`) to speed up text pattern matching.

---

## 3. Backend Router (`GET /recruiter/candidates/search`)

A new API router will be created at `backend/app/routers/recruiter.py` (or a separate router if needed) to support sourcing queries:
* **Query Parameters:**
  * `q` (string): General keyword search matching full name or address.
  * `skills` (list of strings): Required skills list. Skill normalization will be applied to aliases (e.g., searching "js" converts to "javascript").
  * `location` (string): Filter by city or address.
  * `min_commits` (int): Minimum commits signal from GitHub.
  * `limit` / `offset` (int): Pagination parameters.
* **Authentication:** Strictly restricted to users with `role == 'recruiter'`.
* **Data access:** Since the recruiter portal is subscription-locked, recruiters have unmasked access to all candidate details (full name, email, phone, github profile, address, and skills).

---

## 4. Frontend UI (`/dashboard/recruiter/candidates`)

A new React page will be built under `linkify/src/app/(main)/dashboard/recruiter/candidates/page.tsx`:
1. **Search & Filter Panel (Left Sidebar):**
   * Input text field for query `q` and location.
   * Multi-select dropdown or tags input for filtering by skills.
   * Slider or input for minimum GitHub commits.
2. **Talent Grid (Main Content Area):**
   * Cards listing matching candidates.
   * Each card displays the full name, email, phone, address, GitHub username, and verified skills tags.
   * A **"Direct Invite"** button triggers the interview scheduling modal, allowing recruiters to instantly invite candidates to interviews.
