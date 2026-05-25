import json
import re
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.auth import get_current_user
from app.database import get_db
from app.models import CandidateProfile, Job, JobApplication, User
from app.services.gemini_service import _call_gemini_with_retry

router = APIRouter(prefix="/recruiter", tags=["recruiter"])

# ── Pydantic Request Schemas ───────────────────────────────────────────────
class JobCreate(BaseModel):
    title: str
    company: str
    description: str
    required_skills: list[str]
    location: str | None = None
    is_remote: bool = False
    apply_url: str | None = None
    salary: str | None = None
    min_education: str | None = None
    min_experience: str | None = None
    work_type: str | None = None

class StatusUpdate(BaseModel):
    status: str  # applied | interview | offer | rejected
    note: str | None = None

# Helper JSON parser dari respons Gemini
def _extract_json_data(text: str) -> dict | None:
    text = text.strip()
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except Exception:
        return None

# ── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/jobs")
def create_job(
    body: JobCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Membuat lowongan baru dengan menetapkan recruiter_id ke user login."""
    if user.role != "recruiter":
        raise HTTPException(403, "Hanya recruiter yang diperbolehkan membuat lowongan.")

    new_job = Job(
        id=uuid.uuid4(),
        title=body.title,
        company=body.company,
        description=body.description,
        required_skills=body.required_skills,
        location=body.location,
        is_remote=body.is_remote,
        apply_url=body.apply_url,
        salary=body.salary,
        min_education=body.min_education,
        min_experience=body.min_experience,
        work_type=body.work_type,
        recruiter_id=user.id
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return {"status": "success", "job": {
        "id": new_job.id,
        "title": new_job.title,
        "company": new_job.company
    }}

@router.get("/jobs/my-jobs")
def get_my_jobs(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mendapatkan semua lowongan milik recruiter aktif."""
    if user.role != "recruiter":
        raise HTTPException(403, "Hanya recruiter yang dapat mengakses endpoint ini.")

    jobs = db.query(Job).filter(Job.recruiter_id == user.id).all()
    
    # Ambil jumlah pelamar (applications) untuk masing-masing job
    result = []
    for job in jobs:
        app_count = db.query(JobApplication).filter(JobApplication.job_id == job.id).count()
        result.append({
            "id": job.id,
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "is_remote": job.is_remote,
            "required_skills": job.required_skills,
            "salary": job.salary,
            "work_type": job.work_type,
            "applicant_count": app_count
        })
    return result

@router.get("/jobs/my-jobs/{job_id}/applications")
def get_job_applications(
    job_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mendapatkan semua pelamar pada lowongan ini."""
    if user.role != "recruiter":
        raise HTTPException(403, "Hanya recruiter yang diperbolehkan mengakses endpoint ini.")

    # Pastikan lowongan ini memang milik recruiter aktif
    job = db.query(Job).filter(Job.id == job_id, Job.recruiter_id == user.id).first()
    if not job:
        raise HTTPException(404, "Lowongan tidak ditemukan atau Anda tidak memiliki akses.")

    applications = db.query(JobApplication).filter(JobApplication.job_id == job_id).all()
    
    result = []
    for app in applications:
        applicant = db.query(User).filter(User.id == app.user_id).first()
        profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == app.user_id).first()
        
        result.append({
            "id": app.id,
            "status": app.status,
            "note": app.note,
            "applied_at": app.applied_at,
            "applicant": {
                "id": applicant.id if applicant else None,
                "email": applicant.email if applicant else None,
                "fullName": profile.bio_full_name if profile else None,
                "phone": profile.bio_phone if profile else None,
                "address": profile.bio_address if profile else None,
                "github": profile.github_username if profile else None,
                "cv_skills": profile.cv_skills if profile else [],
                "merged_skills": profile.merged_skills if profile else [],
                "cv_data": profile.cv_data if profile else {}
            }
        })
    return result

@router.put("/applications/{application_id}/status")
def update_application_status(
    application_id: uuid.UUID,
    body: StatusUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Memperbarui status lamaran kandidat."""
    if user.role != "recruiter":
        raise HTTPException(403, "Hanya recruiter yang diperbolehkan mengupdate status.")

    app = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not app:
        raise HTTPException(404, "Data lamaran tidak ditemukan.")

    # Verifikasi kepemilikan lowongan
    job = db.query(Job).filter(Job.id == app.job_id, Job.recruiter_id == user.id).first()
    if not job:
        raise HTTPException(403, "Anda tidak memiliki akses ke data lowongan pelamar ini.")

    app.status = body.status
    if body.note is not None:
        app.note = body.note
    app.updated_at = datetime.utcnow()
    db.commit()
    return {"status": "success", "application_id": app.id, "new_status": app.status}

@router.post("/applications/{application_id}/ai-screening")
def ai_candidate_screening(
    application_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Menjalankan AI screening otomatis dengan Gemini untuk pelamar."""
    if user.role != "recruiter":
        raise HTTPException(403, "Hanya recruiter yang diperbolehkan mengakses AI screening.")

    app = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not app:
        raise HTTPException(404, "Data lamaran tidak ditemukan.")

    job = db.query(Job).filter(Job.id == app.job_id, Job.recruiter_id == user.id).first()
    if not job:
        raise HTTPException(403, "Anda tidak memiliki akses ke lowongan pelamar ini.")

    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == app.user_id).first()
    if not profile or not profile.cv_data:
        # Fallback jika CV belum di-upload/sync
        return {
            "match_score": 10,
            "strengths": ["Profil kandidat belum disinkronkan sepenuhnya."],
            "weaknesses": ["Kandidat belum mengunggah CV / portofolio."]
        }

    # Bangun prompt untuk Gemini AI
    prompt = f"""
    You are an expert AI Recruiting screener. Compare this candidate's profile against the job criteria:

    --- JOB DESCRIPTION ---
    Title: {job.title}
    Company: {job.company}
    Requirements: {job.description}
    Required Skills: {", ".join(job.required_skills)}

    --- CANDIDATE PROFILE ---
    Skills (GitHub + CV): {", ".join(profile.merged_skills or [])}
    CV History: {json.dumps(profile.cv_data)}

    Calculate a Match Score from 0 to 100 based on technical and experience match.
    Identify exactly 2 key strengths of the candidate.
    Identify exactly 1 key weakness/gap of the candidate.
    
    Response must be in Bahasa Indonesia.
    Return ONLY valid JSON matching this exact structure (no markdown, no code blocks):
    {{
      "match_score": 85,
      "strengths": ["Memiliki pengalaman React 2 tahun yang kuat di GitHub", "Familiar dengan TypeScript"],
      "weaknesses": ["Kurang memiliki pengalaman deployment cloud seperti AWS"]
    }}
    """
    
    try:
        text = _call_gemini_with_retry(prompt)
        res_json = _extract_json_data(text)
        if res_json and "match_score" in res_json:
            return res_json
        
        # Fallback jika parsing JSON gagal
        return {
            "match_score": 50,
            "strengths": ["Kandidat menunjukkan keahlian teknis umum."],
            "weaknesses": ["Gagal menganalisis detail secara dinamis."]
        }
    except Exception as e:
        return {
            "match_score": 50,
            "strengths": [f"Gagal memanggil AI: {str(e)}"],
            "weaknesses": ["Gagal menganalisis."]
        }
