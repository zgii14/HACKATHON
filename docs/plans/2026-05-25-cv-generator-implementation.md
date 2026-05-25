# CV Generator Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implement a comprehensive CV Generator feature that parses CV PDF data into a structured JSON database profile, provides an interactive form editor page at `/dashboard/cv-generator`, and generates high-fidelity `.docx` files styled exactly like the user's template (`Cv muhammad rozagi.docx`).

**Architecture:** 
1. **DB Column & Startup Migration:** Add a `cv_data` JSON column to the SQLite/PostgreSQL `candidate_profiles` table. Run a dynamic `ALTER TABLE` SQL command in `main.py`'s `lifespan` startup block to migrate live environments automatically.
2. **AI parsing schema:** Create `extract_cv_data_from_text` in the Gemini service that extracts a structured, standard CV format JSON including Summary, Education, Work Experience, Org Experience, Training, Skills, and Certifications.
3. **Interactive Form:** Create `/dashboard/cv-generator` frontend page. Users see pre-filled cards representing their current CV data. Users can add, edit, or remove items (education, jobs, certificates) dynamically.
4. **Rozagi-styled DOCX Compilation:** Generate a client-side Word document using the `docx` library. Format: centered bold title + inline metadata header, borderless 2-column tables to align company name and period on a single line, bottom paragraph borders for thin horizontal dividers, and bullet points.

---

### Task 1: Database Schema & Migration

**Files:**
- Modify: [models.py](file:///c:/Users/muham/Downloads/HACKATHON/backend/app/models.py) (Add `cv_data` column)
- Modify: [main.py](file:///c:/Users/muham/Downloads/HACKATHON/backend/app/main.py) (Add dynamic startup ALTER TABLE migration)
- Modify: [schemas.py](file:///c:/Users/muham/Downloads/HACKATHON/backend/app/schemas.py) (Update profile schema fields)

**Step 1: Write database schema update in models.py**
```python
# models.py: Add to CandidateProfile class around line 49
    cv_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
```

**Step 2: Add ALTER TABLE migration in main.py lifespan**
```python
# main.py: Inside engine.connect() block in lifespan startup (around line 41)
        conn.execute(text("""
            ALTER TABLE candidate_profiles
            ADD COLUMN IF NOT EXISTS cv_data JSON NULL
        """))
        conn.commit()
```

**Step 3: Update CandidateProfile response schemas**
```python
# schemas.py: Add to CandidateProfileResponse class (around line 20)
    cv_data: dict | None
```

---

### Task 2: CV Parsing with Gemini AI

**Files:**
- Modify: [gemini_service.py](file:///c:/Users/muham/Downloads/HACKATHON/backend/app/services/gemini_service.py) (Implement parser service)
- Modify: [profiles.py](file:///c:/Users/muham/Downloads/HACKATHON/backend/app/routers/profiles.py) (Update upload CV endpoint)

**Step 1: Create structured parsing helper in gemini_service.py**
```python
# gemini_service.py: Implement extract_cv_data_from_text (at the bottom)
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
    model = get_model()
    response = model.generate_content(f"{prompt}\n\n--- CV TEXT ---\n{cv_text[:12000]}")
    text = response.text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.endswith("```"):
        text = text[:-3]
    import json
    return json.loads(text.strip())
```

**Step 2: Connect parser in profiles.py upload router**
```python
# profiles.py: Call extract_cv_data_from_text inside sync_profile around line 114
    try:
        cv_data = extract_cv_data_from_text(text)
    except Exception as e:
        cv_data = {}  # fallback if parsing fails

    # Save to profile
    profile.cv_data = cv_data
```

---

### Task 3: API Endpoint for Profile Updates

**Files:**
- Modify: [me.py](file:///c:/Users/muham/Downloads/HACKATHON/backend/app/routers/me.py) (Add update profile endpoints)

**Step 1: Implement the PUT /me/profile/cv-data route**
```python
# me.py: Implement at bottom of file
@router.put("/roadmap/cv-data")
def update_cv_data(
    payload: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(404, "Candidate profile not found")
    profile.cv_data = payload
    db.commit()
    return {"status": "success", "cv_data": profile.cv_data}
```

---

### Task 4: Interactive CV Form Editor Page

**Files:**
- Create: `linkify/src/app/(main)/dashboard/cv-generator/page.tsx` (Complete interactive page)

**Step 1: Set up Next.js route with full editor fields, loading indicators, and API integration**
* Render distinct sections:
  * Bio (Nama, Telepon, Email, Alamat, LinkedIn, GitHub)
  * Ringkasan Profesional (Summary)
  * Pendidikan (Daftar institusi, jurusan, IPK, tanggal)
  * Pengalaman Kerja (Perusahaan, posisi, lokasi, tanggal, deskripsi poin)
  * Pengalaman Organisasi
  * Pelatihan
  * Keahlian (Soft skills, Hard skills, Bahasa)
  * Sertifikat
* Add dynamic `Add Row` buttons and `Delete Row` buttons to arrays using standard React hooks.
* Load initial values by fetching `/me/profile` or `/me/roadmap/cv-data` on mount. Save changes via `PUT /me/profile/cv-data` or `/me/roadmap/cv-data`.

---

### Task 5: Word Document Generation with Rozagi Style

**Files:**
- Modify: `linkify/src/app/(main)/dashboard/cv-generator/page.tsx` (Add client-side DOCX builder using `docx`)

**Step 1: Code client-side document creator mimicking the Rozagi format**
* Centered bold full name.
* Metadata header separated by `|` spacers.
* Borderless table structure for Pendidikan, Pengalaman, Organisasi, Pelatihan to align left-hand company and right-hand period on a single line.
* Bottom paragraph border for thin horizontal lines under section headers.
* Dynamic hiding of empty sections to keep CV condensed.

---

## Next Steps
Run `.agent/workflows/execute-plan.md` to execute this plan task-by-task.
