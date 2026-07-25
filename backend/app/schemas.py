from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class CVDataSkills(BaseModel):
    soft_skills: list[str] | None = None
    hard_skills: list[str] | None = None
    languages: list[str] | None = None

class CVDataEducation(BaseModel):
    institution: str | None = None
    location: str | None = None
    major: str | None = None
    degree: str | None = None
    period: str | None = None
    gpa: str | None = None

class CVDataExperience(BaseModel):
    company: str | None = None
    role: str | None = None
    location: str | None = None
    period: str | None = None
    bullets: list[str] | None = None

class CVDataOrg(BaseModel):
    organization: str | None = None
    role: str | None = None
    location: str | None = None
    period: str | None = None
    bullets: list[str] | None = None

class CVDataTraining(BaseModel):
    title: str | None = None
    provider: str | None = None
    location: str | None = None
    period: str | None = None
    bullets: list[str] | None = None

class CVDataSchema(BaseModel):
    summary: str | None = None
    education: list[CVDataEducation] | None = None
    work_experience: list[CVDataExperience] | None = None
    org_experience: list[CVDataOrg] | None = None
    training: list[CVDataTraining] | None = None
    skills: CVDataSkills | None = None
    certifications: list[str] | None = None
    email: str | None = None
    linkedin: str | None = None


class UserOut(BaseModel):
    id: UUID
    clerk_user_id: str
    email: str | None
    role: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProfileOut(BaseModel):
    github_username: str | None
    github_signals: dict | None
    cv_skills: list | None
    merged_skills: list | None
    interests: list | None = None
    cv_data: dict | None = None
    # Bio data
    bio_full_name: str | None = None
    bio_birth_place: str | None = None
    bio_birth_date: str | None = None
    bio_address: str | None = None
    bio_phone: str | None = None
    updated_at: datetime | None
    # User role — None = belum pilih (tampilkan role picker). candidate | recruiter setelah dipilih.
    role: str | None = None
    # CV asli tersimpan + preferensi versi CV (form | original)
    cv_filename: str | None = None
    cv_uploaded_at: datetime | None = None
    cv_preference: str | None = "form"

    model_config = {"from_attributes": True}


class RoleUpdate(BaseModel):
    role: str


class CVPreferenceUpdate(BaseModel):
    preference: str  # form | original


class BioDataOut(BaseModel):
    bio_full_name: str | None = None
    bio_birth_place: str | None = None
    bio_birth_date: str | None = None
    bio_address: str | None = None
    bio_phone: str | None = None

    model_config = {"from_attributes": True}


class BioDataPatch(BaseModel):
    bio_full_name: str | None = None
    bio_birth_place: str | None = None
    bio_birth_date: str | None = None
    bio_address: str | None = None
    bio_phone: str | None = None


class InterestsPatch(BaseModel):
    interests: list[str]


class JobOut(BaseModel):
    id: UUID
    title: str
    company: str
    description: str
    required_skills: list[str]
    location: str | None
    is_remote: bool
    apply_url: str | None = None
    match_score: float | None = None
    # ── Info tambahan ──────────────────────────────
    salary: str | None = None
    min_education: str | None = None
    min_experience: str | None = None
    work_type: str | None = None
    recruiter_id: UUID | None = None
    # True = lowongan board eksternal (tanpa recruiter) → apply mengarah ke apply_url.
    # False = lowongan milik recruiter platform → lamaran diproses in-app, tidak redirect.
    is_external: bool = True

    model_config = {"from_attributes": True}


class JobDetailOut(JobOut):
    match_reasons: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)


class SkillFreqItem(BaseModel):
    skill: str
    job_count: int


class SkillGapOut(BaseModel):
    missing_skills: list[str]
    has_profile: bool
    skill_freq: list[SkillFreqItem] = Field(default_factory=list)
    user_skill_count: int = 0
    total_job_skills: int = 0
    weak_skills: list[str] = Field(default_factory=list)
    github_backed_count: int = 0
    mode: str = "all"          # "interests" atau "all"
    interests: list[str] = Field(default_factory=list)


class RoadmapStepOut(BaseModel):
    index: int
    title: str
    description: str = ""
    resources: list[str] = Field(default_factory=list)
    target: str = ""
    completed: bool = False


class RoadmapOut(BaseModel):
    fingerprint: str | None
    steps: list[RoadmapStepOut]
    job_id: UUID | None = None
    job_title: str | None = None
    job_company: str | None = None


class RoadmapStepPatch(BaseModel):
    completed: bool


class MatchExplain(BaseModel):
    score: float
    reasons: list[str]
    missing_skills: list[str]


class BookmarkedJobOut(BaseModel):
    job_id: UUID
    title: str
    company: str
    location: str | None
    is_remote: bool
    total_steps: int
    completed_steps: int
    match_score: float | None = None
    salary: str | None = None
    min_education: str | None = None
    min_experience: str | None = None
    work_type: str | None = None


# ── Application schemas ──────────────────────────────────────────────────────

class ApplicationStatus(str, Enum):
    applied   = "applied"
    interview = "interview"
    interview_confirmed = "interview_confirmed"
    rejected  = "rejected"
    offer     = "offer"


class ApplicationCreate(BaseModel):
    note: str | None = None


class ApplicationStatusPatch(BaseModel):
    status: ApplicationStatus
    note: str | None = None


class ApplicationOut(BaseModel):
    id: UUID
    job_id: UUID
    job_title: str
    job_company: str
    job_location: str | None
    apply_url: str | None
    status: ApplicationStatus
    note: str | None
    applied_at: datetime
    updated_at: datetime
    roadmap_completed: bool
    match_score: float | None
    recruiter_email: str | None = None
    # True jika lamaran dibuat oleh recruiter (undangan), bukan kandidat sendiri
    is_invited: bool = False
    invite_detail: dict | None = None
    has_cover_letter: bool = False


# ── Cover Letter schemas ─────────────────────────────────────────────────────

class GenerateLetterRequest(BaseModel):
    full_name: str | None = None
    force_regenerate: bool = False  # True = paksa generate ulang meski sudah ada cache


class CoverLetterOut(BaseModel):
    letter: str
    job_title: str
    job_company: str
