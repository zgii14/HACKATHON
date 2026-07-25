import hashlib
import json
import re
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.auth import get_current_user
from app.database import get_db
from app.models import CandidateProfile, Job, JobApplication, User
from app.schemas import ApplicationStatus
from app.services.cv_pdf import render_cv_pdf
from app.services.gemini_service import _call_gemini_with_retry
from app.services.matching import jaccard_score, explain_match

router = APIRouter(prefix="/recruiter", tags=["recruiter"])

VALID_RECOMMENDATIONS = {"interview", "consider", "reject"}

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
    status: ApplicationStatus
    note: str | None = None

class CandidateInvitePayload(BaseModel):
    job_id: uuid.UUID
    type: str  # online | offline
    datetime: str
    location_or_link: str
    hr_message: str | None = None
    hr_phone: str | None = None

def _screening_fingerprint(job: "Job", profile: "CandidateProfile") -> str:
    """Hash semua input yang mempengaruhi hasil screening. Fingerprint sama -> cache boleh dipakai."""
    payload = {
        "required_skills": sorted(job.required_skills or []),
        "description": job.description or "",
        "min_experience": job.min_experience or "",
        "min_education": job.min_education or "",
        "work_type": job.work_type or "",
        "salary": job.salary or "",
        "merged_skills": sorted(profile.merged_skills or []),
        "cv_data": profile.cv_data or {},
        "github_signals": profile.github_signals or {},
    }
    blob = json.dumps(payload, sort_keys=True, ensure_ascii=False, default=str)
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()

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
        recruiter_id=str(user.id)  # VARCHAR di DB, cast ke string
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

    jobs = db.query(Job).filter(Job.recruiter_id == str(user.id)).all()
    
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
    # Urutkan: lowongan dengan pelamar terbanyak muncul paling atas
    result.sort(key=lambda r: r["applicant_count"], reverse=True)
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
    job = db.query(Job).filter(Job.id == job_id, Job.recruiter_id == str(user.id)).first()
    if not job:
        raise HTTPException(404, "Lowongan tidak ditemukan atau Anda tidak memiliki akses.")

    applications = db.query(JobApplication).filter(JobApplication.job_id == job_id).all()
    
    from app.services.matching import jaccard_score

    result = []
    for app in applications:
        applicant = db.query(User).filter(User.id == app.user_id).first()
        profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == app.user_id).first()
        
        score = None
        if profile and profile.merged_skills and job.required_skills:
            score = jaccard_score(profile.merged_skills, job.required_skills)

        result.append({
            "id": app.id,
            "status": app.status,
            "note": app.note,
            "applied_at": app.applied_at,
            "match_score": score,
            "applicant": {
                "id": applicant.id if applicant else None,
                "email": applicant.email if applicant else None,
                "fullName": profile.bio_full_name if profile else None,
                "phone": profile.bio_phone if profile else None,
                "address": profile.bio_address if profile else None,
                "github": profile.github_username if profile else None,
                "cv_skills": profile.cv_skills if profile else [],
                "merged_skills": profile.merged_skills if profile else [],
                "cv_data": profile.cv_data if profile else {},
                "has_cv": bool(profile and (profile.cv_file or profile.cv_data)),
                "cv_preference": (profile.cv_preference if profile else "form"),
            }
        })
    return result


@router.get("/applications/{application_id}/cv")
def download_applicant_cv(
    application_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Download CV pelamar (PDF). Mengikuti preferensi kandidat: 'original' → PDF asli, 'form' → render dari cv_data."""
    if user.role != "recruiter":
        raise HTTPException(403, "Hanya recruiter yang diperbolehkan mengunduh CV pelamar.")

    app = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not app:
        raise HTTPException(404, "Lamaran tidak ditemukan.")

    # Otorisasi: pastikan lowongan pelamar ini milik recruiter yang login
    job = db.query(Job).filter(Job.id == app.job_id, Job.recruiter_id == str(user.id)).first()
    if not job:
        raise HTTPException(403, "Kamu tidak berhak mengakses CV pelamar pada lowongan ini.")

    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == app.user_id).first()
    if not profile:
        raise HTTPException(404, "Profil pelamar tidak ditemukan.")

    if profile.cv_preference == "original" and profile.cv_file:
        return Response(
            content=bytes(profile.cv_file),
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="{profile.cv_filename or "cv.pdf"}"'},
        )

    if not profile.cv_data:
        raise HTTPException(404, "Pelamar belum memiliki data CV.")
    bio = {
        "full_name": profile.bio_full_name,
        "phone": profile.bio_phone,
        "address": profile.bio_address,
        "email": (profile.user.email if profile.user else None),
    }
    pdf = render_cv_pdf(profile.cv_data, bio)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": 'inline; filename="cv-form.pdf"'},
    )

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
    job = db.query(Job).filter(Job.id == app.job_id, Job.recruiter_id == str(user.id)).first()
    if not job:
        raise HTTPException(403, "Anda tidak memiliki akses ke data lowongan pelamar ini.")

    app.status = body.status.value
    if body.note is not None:
        app.note = body.note
    app.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(app)
    return {"status": "success", "application_id": app.id, "new_status": app.status}

@router.post("/applications/{application_id}/ai-screening")
def ai_candidate_screening(
    application_id: uuid.UUID,
    refresh: bool = False,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Menjalankan AI screening otomatis dengan Gemini untuk pelamar."""
    if user.role != "recruiter":
        raise HTTPException(403, "Hanya recruiter yang diperbolehkan mengakses AI screening.")

    app = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not app:
        raise HTTPException(404, "Data lamaran tidak ditemukan.")

    job = db.query(Job).filter(Job.id == app.job_id, Job.recruiter_id == str(user.id)).first()
    if not job:
        raise HTTPException(403, "Anda tidak memiliki akses ke lowongan pelamar ini.")

    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == app.user_id).first()
    if not profile or not profile.cv_data:
        # Fallback jika CV belum di-upload/sync
        return {
            "match_score": 10,
            "recommendation": "consider",
            "reasoning": "Profil kandidat belum lengkap sehingga penilaian terbatas.",
            "strengths": ["Profil kandidat belum disinkronkan sepenuhnya."],
            "weaknesses": ["Kandidat belum mengunggah CV / portofolio."],
            "score_source": "ai",
            "cached": False,
        }

    fingerprint = _screening_fingerprint(job, profile)
    if not refresh and app.ai_screening and app.screening_fingerprint == fingerprint:
        cached = dict(app.ai_screening)
        cached["cached"] = True
        return cached

    # Anchor deterministik dari skor algoritmik + skill matched/missing
    algo_score = round(jaccard_score(profile.merged_skills or [], job.required_skills or []) * 100)
    reasons, missing = explain_match(profile.merged_skills or [], job.required_skills or [])
    matched_note = "; ".join(reasons) if reasons else "tidak ada skill yang cocok terdeteksi"
    missing_note = ", ".join(missing[:8]) if missing else "tidak ada"
    gh_summary = json.dumps(profile.github_signals or {}, ensure_ascii=False, default=str)[:1500]

    # Bangun prompt untuk Gemini AI
    prompt = f"""
    You are an expert AI Recruiting screener. Assess how well this candidate fits the job.

    --- JOB ---
    Title: {job.title}
    Company: {job.company}
    Requirements: {job.description}
    Required Skills: {", ".join(job.required_skills or [])}
    Min Experience: {job.min_experience or "tidak disebutkan"}
    Min Education: {job.min_education or "tidak disebutkan"}
    Work Type: {job.work_type or "tidak disebutkan"}
    Salary: {job.salary or "tidak disebutkan"}

    --- CANDIDATE ---
    Skills (GitHub + CV, merged): {", ".join(profile.merged_skills or [])}
    GitHub signals (verified activity - commits, languages, repos): {gh_summary}
    CV History: {json.dumps(profile.cv_data, ensure_ascii=False)}

    --- DETERMINISTIC ANCHOR ---
    Algorithmic skill-match = {algo_score}% (matched: {matched_note}; missing: {missing_note}).
    Use this as your anchor. Only deviate from it when the CV or GitHub evidence justifies it,
    and if you do, explain why in `reasoning`.

    --- RULES ---
    - Only cite evidence that is actually present in the data above. Prefer verified GitHub signals over unproven CV claims.
    - If information is missing, write "tidak disebutkan" - never invent experience, skills, or numbers.
    - Give a clear hiring recommendation.
    - Respond in Bahasa Indonesia.

    Return ONLY valid JSON matching this exact structure (no markdown, no code blocks):
    {{
      "match_score": 85,
      "recommendation": "interview",
      "reasoning": "Kandidat memenuhi mayoritas skill inti dan aktivitas GitHub-nya konsisten dengan klaim CV.",
      "strengths": ["Pengalaman React 2 tahun terbukti di GitHub", "Menguasai TypeScript"],
      "weaknesses": ["Belum ada pengalaman deployment cloud (AWS/GCP)"]
    }}
    `recommendation` must be exactly one of: "interview", "consider", "reject".
    """

    try:
        text = _call_gemini_with_retry(prompt)
    except Exception:
        raise HTTPException(502, "Layanan AI sedang tidak tersedia. Silakan coba lagi.")

    res_json = _extract_json_data(text)
    if not res_json or "match_score" not in res_json:
        raise HTTPException(502, "Hasil analisis AI tidak valid. Silakan coba lagi.")
    if res_json.get("recommendation") not in VALID_RECOMMENDATIONS:
        res_json["recommendation"] = "consider"
    if not isinstance(res_json.get("reasoning"), str):
        res_json["reasoning"] = ""
    res_json.setdefault("strengths", [])
    res_json.setdefault("weaknesses", [])
    # Tandai bahwa skor ini dari AI (berbeda metodologi dari skor algoritma di job list)
    res_json["score_source"] = "ai"
    res_json["cached"] = False
    app.ai_screening = res_json
    app.screening_fingerprint = fingerprint
    db.commit()
    return res_json

@router.get("/candidates/search")
def search_candidates(
    q: str | None = None,
    skills: list[str] = Query([]),
    location: str | None = None,
    min_commits: int | None = None,
    limit: int = 20,
    offset: int = 0,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mencari kandidat secara global menggunakan pencarian teks penuh dan filter parametrik."""
    if user.role != "recruiter":
        raise HTTPException(403, "Hanya recruiter yang diperbolehkan mengakses database kandidat.")

    query = db.query(CandidateProfile, User).join(User, CandidateProfile.user_id == User.id)

    if q:
        query = query.filter(
            (CandidateProfile.bio_full_name.ilike(f"%{q}%")) |
            (CandidateProfile.bio_address.ilike(f"%{q}%")) |
            (CandidateProfile.github_username.ilike(f"%{q}%"))
        )

    if location:
        query = query.filter(CandidateProfile.bio_address.ilike(f"%{location}%"))

    from app.services.matching import normalize_skill_set
    from sqlalchemy import String, cast

    clean_skills = [s for s in skills if s.strip()]
    target_skills = normalize_skill_set(clean_skills)

    # Pre-filter SQL: kurangi kandidat yang dimuat ke Python menggunakan ILIKE pada teks JSON.
    # GIN index tidak aktif di sini, tapi mencegah full-table load ke memori.
    # Python normalize filter di bawah memastikan kebenaran final (alias, case, dsb).
    if clean_skills:
        merged_text = cast(CandidateProfile.merged_skills, String)
        for skill in clean_skills[:5]:
            query = query.filter(merged_text.ilike(f'%{skill}%'))

    results = query.all()

    # Filter Python untuk normalisasi alias skill dan commits (fine-grained setelah SQL pre-filter)
    filtered: list[dict] = []
    for profile, u in results:
        # 1. Filter by skills
        if target_skills:
            candidate_skills = normalize_skill_set(profile.merged_skills or [])
            if not target_skills.issubset(candidate_skills):
                continue

        # 2. Filter by min_commits
        if min_commits is not None:
            commits = 0
            if profile.github_signals and isinstance(profile.github_signals, dict):
                commits = profile.github_signals.get("commits", 0)
            if commits < min_commits:
                continue

        filtered.append({
            "id": profile.id,
            "user_id": u.id,
            "email": u.email,
            "fullName": profile.bio_full_name,
            "phone": profile.bio_phone,
            "address": profile.bio_address,
            "github": profile.github_username,
            "cv_skills": profile.cv_skills or [],
            "merged_skills": profile.merged_skills or [],
            "cv_data": profile.cv_data or {},
            "github_signals": profile.github_signals or {},
            "interests": profile.interests or []
        })

    paginated = filtered[offset : offset + limit]
    return {
        "total": len(filtered),
        "limit": limit,
        "offset": offset,
        "candidates": paginated
    }

@router.post("/candidates/{candidate_user_id}/invite")
def invite_candidate(
    candidate_user_id: uuid.UUID,
    body: CandidateInvitePayload,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mengundang kandidat langsung untuk wawancara pada lowongan tertentu."""
    if user.role != "recruiter":
        raise HTTPException(403, "Hanya recruiter yang diperbolehkan mengundang kandidat.")

    # Pastikan lowongan ini memang milik recruiter aktif
    job = db.query(Job).filter(Job.id == body.job_id, Job.recruiter_id == str(user.id)).first()
    if not job:
        raise HTTPException(404, "Lowongan tidak ditemukan atau Anda tidak memiliki akses.")

    # Pastikan kandidat ada
    candidate = db.query(User).filter(User.id == candidate_user_id).first()
    if not candidate:
        raise HTTPException(404, "Kandidat tidak ditemukan.")

    # Bangun note payload
    note_payload = {
        "type": body.type,
        "datetime": body.datetime,
        "location_or_link": body.location_or_link,
        "hr_message": body.hr_message,
        "hr_phone": body.hr_phone
    }
    note_str = json.dumps(note_payload)

    # Cek apakah lamaran sudah ada
    app = db.query(JobApplication).filter(
        JobApplication.user_id == candidate_user_id,
        JobApplication.job_id == body.job_id
    ).first()

    if app:
        app.status = ApplicationStatus.interview.value
        app.note = note_str
        app.updated_at = datetime.utcnow()
    else:
        app = JobApplication(
            user_id=candidate_user_id,
            job_id=body.job_id,
            status=ApplicationStatus.interview.value,
            note=note_str
        )
        db.add(app)

    db.commit()
    db.refresh(app)
    return {"status": "success", "application_id": app.id}

