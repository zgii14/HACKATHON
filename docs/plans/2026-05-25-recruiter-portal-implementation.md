# AI Recruiter Portal Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implement a comprehensive AI-powered Recruiter Portal that isolates job management by recruiter, visualizes candidates' GitHub signals, runs automatic AI candidate screening with Gemini, updates application pipelines, and exports professional .docx resumes.

**Architecture:**
1. **DB Column Migration:** Add `role` column to `users` and `recruiter_id` column to `jobs`.
2. **Pre-seeded Demo Recruiter:** Seed `recruiter@githire.com` with pre-defined jobs and candidate applications.
3. **Backend Recruiter Endpoints:** Implement API routes for recruiter job lists, candidate reviews, status updates, and Gemini screening.
4. **Dynamic Frontend Sidebar:** Detect `role == "recruiter"` to switch navigation sidebar menus dynamically.
5. **WOW Panel Sisi Recruiter:** Render recruiter candidate card overview including AI score ring, GitHub signals stats, and ATS Word resume downloader.

---

### Task 1: Database Migration & Schema Update

**Files:**
- Modify: [models.py](file:///c:/Users/muham/Downloads/HACKATHON/backend/app/models.py)
- Modify: [main.py](file:///c:/Users/muham/Downloads/HACKATHON/backend/app/main.py)
- Modify: [schemas.py](file:///c:/Users/muham/Downloads/HACKATHON/backend/app/schemas.py)

**Step 1: Add new database fields in models.py**
Add `role` to `User` and `recruiter_id` to `Job` classes:
```python
# models.py (User class around line 30)
    role: Mapped[str] = mapped_column(String(20), default="candidate")  # candidate | recruiter

# models.py (Job class around line 84)
    recruiter_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
```

**Step 2: Add Alter Table startup migrations in main.py**
```python
# main.py: inside lifespan startup connection (around line 43)
        conn.execute(text("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'candidate';
        """))
        conn.execute(text("""
            ALTER TABLE jobs
            ADD COLUMN IF NOT EXISTS recruiter_id VARCHAR(36) NULL;
        """))
        conn.commit()
```

**Step 3: Update schemas.py response fields**
```python
# schemas.py (UserOut schema around line 12)
    role: str | None = "candidate"

# schemas.py (JobOut schema around line 72)
    recruiter_id: UUID | None = None
```

**Step 4: Verify Python syntax compile**
Run: `python -m py_compile backend/app/models.py backend/app/main.py backend/app/schemas.py`
Expected: 0 compile errors.

---

### Task 2: Pre-seeded Recruiter Demo Account & Startup Seeding

**Files:**
- Modify: [main.py](file:///c:/Users/muham/Downloads/HACKATHON/backend/app/main.py)

**Step 1: Add automated data seeding logic**
Inside lifespan startup in `main.py`, seed the recruiter demo user and 2 jobs associated with it if they don't exist yet:
```python
# main.py: Add around line 50
        # Seed recruiter@githire.com
        recruiter_id = "550e8400-e29b-41d4-a716-446655440000"
        conn.execute(text(f"""
            INSERT INTO users (id, clerk_user_id, email, role, created_at)
            VALUES ('{recruiter_id}', 'clerk_recruiter_demo', 'recruiter@githire.com', 'recruiter', CURRENT_TIMESTAMP)
            ON CONFLICT (clerk_user_id) DO UPDATE SET role = 'recruiter';
        """))
        
        # Seed a test job for this recruiter
        job_id = "550e8400-e29b-41d4-a716-446655440001"
        conn.execute(text(f"""
            INSERT INTO jobs (id, title, company, description, required_skills, location, is_remote, recruiter_id)
            VALUES ('{job_id}', 'Senior React Developer', 'GitHire Enterprise', 'We are looking for a Senior React Developer with deep knowledge in TypeScript and State Management.', '["React", "TypeScript", "Tailwind CSS", "Redux"]', 'Bengkulu, Indonesia', 1, '{recruiter_id}')
            ON CONFLICT (id) DO NOTHING;
        """))
        
        conn.commit()
```

**Step 2: Verify database seeding executes successfully**
Restart FastAPI backend and confirm the terminal output does not print any database integrity errors.

---

### Task 3: Backend API Routers for Recruiter Portal

**Files:**
- Create: [recruiter.py](file:///c:/Users/muham/Downloads/HACKATHON/backend/app/routers/recruiter.py)
- Modify: [main.py](file:///c:/Users/muham/Downloads/HACKATHON/backend/app/main.py)

**Step 1: Implement recruitment endpoints in recruiter.py**
* `POST /recruiter/jobs`: Recruiter creates a job (auto-sets `recruiter_id = current_user.id`).
* `GET /recruiter/jobs/my-jobs`: Returns all jobs owned by recruiter.
* `GET /recruiter/jobs/my-jobs/{job_id}/applications`: Returns all job applications.
* `PUT /recruiter/applications/{app_id}/status`: Updates application status.
* `POST /recruiter/applications/{app_id}/ai-screening`: Asks Gemini to score candidate cv/skills against job description.

**Step 2: Write AI Screening Service Prompt in recruiter.py**
```python
# backend/app/routers/recruiter.py (AI Screening handler)
# Call Gemini model to calculate match score and strengths/weaknesses
```

**Step 3: Include router in main.py**
```python
# main.py: Register recruiter router
from app.routers import recruiter
app.include_router(recruiter.router)
```

---

### Task 4: Dynamic Frontend Navigation & Recruiter Dashboard UI

**Files:**
- Create: `linkify/src/app/(main)/dashboard/recruiter/jobs/page.tsx` (Manage own jobs)
- Create: `linkify/src/app/(main)/dashboard/recruiter/jobs/new/page.tsx` (Form to create job)
- Modify: `linkify/src/components/dashboard/dashboard-shell.tsx` (Dynamic sidebar menu)

**Step 1: Create recruiter sidebar configuration in dashboard-shell.tsx**
* Read `profile.role` on render.
* If `"recruiter"`, render a custom `RECRUITER_LINKS` list:
  * "Lowongan Saya" -> `/dashboard/recruiter/jobs`
  * "Buat Lowongan" -> `/dashboard/recruiter/jobs/new`

**Step 2: Build Recruiter Job List Page**
Render a table or bento grid showing recruiter jobs, candidate counts, and actions to review applicants.

---

### Task 5: Interactive Candidate Reviewer & ATS Word Downloader (WOW Factor Panel)

**Files:**
- Create: `linkify/src/app/(main)/dashboard/recruiter/jobs/[id]/page.tsx` (Review applicants)

**Step 1: Build the detail applicant view**
* On click, open candidate's panel.
* Call `POST /recruiter/applications/{app_id}/ai-screening` to render the ring match score.
* Render GitHub Signal statistics (Repos, followers, main languages).
* Add a download button to trigger the client-side `.docx` generator matching the Harvard template styling we already verified in CV Generator!

---

### Task 6: Final Integrated E2E Walkthrough & Verification

* Login to `recruiter@githire.com` using the demo authentication.
* Create a new job listing.
* Review demo applications and test the AI Screening tool.
* Download candidate's compiled Harvard ATS Resume and confirm margins, spacer borders, and columns render correctly.
* Run `npx tsc --noEmit` on frontend and ensure it passes successfully.
