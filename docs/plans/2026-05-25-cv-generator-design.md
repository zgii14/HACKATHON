# Design Document: GitHire AI-Powered CV Generator

## Goal
Implement a premium, automated CV Generator in GitHire. The generator will:
1. Extract detailed structured data (Education, Work, Org, Training, Certifications) from the user's uploaded CV PDF using Gemini AI.
2. Store this structured CV data persistently in the backend database.
3. Provide a high-fidelity interactive Form Editor at `/dashboard/cv-generator` so the user can easily update or fill in any missing parts.
4. Programmatically generate and download a professional Microsoft Word (`.docx`) file directly on the client side, formatted exactly like the custom CV layout (`Cv muhammad rozagi.docx`).

---

## Architectural & Logical Design

### 1. Database Schema Update
Add a new column `cv_data` (JSON) to the `candidate_profiles` table.
* **Fields inside `cv_data` JSON**:
  ```typescript
  {
    summary: string;
    education: Array<{
      institution: string;
      location: string;
      major: string;
      degree: string;
      period: string; // e.g. "Agu 2022 – Present"
      gpa: string;    // e.g. "3.86/4.00"
    }>;
    work_experience: Array<{
      company: string;
      role: string;
      location: string;
      period: string;
      bullets: string[];
    }>;
    org_experience: Array<{
      organization: string;
      role: string;
      location: string;
      period: string;
      bullets: string[];
    }>;
    training: Array<{
      title: string;
      provider: string;
      location: string;
      period: string;
      bullets: string[];
    }>;
    skills: {
      soft_skills: string[];
      hard_skills: string[];
      languages: string[];
    };
    certifications: string[]; // List of certificates
  }
  ```

### 2. Backend Enhancements
* **`app/services/gemini_service.py`**: Create `extract_cv_data_from_text(cv_text: str) -> dict` which queries Gemini AI with a strict JSON schema prompt to extract all the above CV sections.
* **`app/routers/profiles.py`**: Update `POST /profiles/sync` to:
  1. Extract full CV data using `extract_cv_data_from_text`.
  2. Save it into the new `cv_data` column on `CandidateProfile`.
* **`app/routers/me.py`**: 
  - Update `GET /me/profile` to include `cv_data` in the response payload.
  - Add `PUT /me/profile/cv-data` to update CV data when edited in the frontend form.

### 3. Frontend Form Editor (`/dashboard/cv-generator`)
* Interactive dashboard view where users see multi-section fields (Bio, Summary, Education, Work, Org, Training, Skills, Certificates).
* Pre-filled automatically with the user's extracted `cv_data` and merged profile skills.
* Includes smart `Add` / `Remove` buttons for arrays (e.g. adding new jobs, schools, or certificates).

### 4. Client-side DOCX Generator Matching the Rozagi Template
Using the `docx` package, build a document styled to match `Cv muhammad rozagi.docx`:
* **Typography**: Clean Arial/Calibri styled formatting.
* **Margins**: Standard 1 inch margins on all sides.
* **Header**: Centered name, contact info with dividers (`|`).
* **Sections**: Bulleted items, bold job titles, and a side-by-side borderless table layout to align Institution/Company names on the left and Periods/Dates on the right.
* **Dynamic Hiding**: Sub-sections with 0 items will be completely omitted so the document is perfectly condensed.

---

## Verification Plan

### Automated Verification
* Run database migration and test SQLAlchemy queries.
* Validate Gemini AI extraction payload with JSON parser.
* Verify TypeScript compilation for the new page and document generation codes.

### Manual Verification
* Upload CV PDF and verify the fields are successfully pre-filled in the CV Form Editor.
* Edit details, add a new experience, and click "Unduh CV (.docx)".
* Open the downloaded DOCX file and verify the layout, dividers, fonts, and margin structures.
