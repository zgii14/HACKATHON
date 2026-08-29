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
from app.models import CandidateProfile, Job, JobApplication, RecruiterProfile, User
from app.schemas import ApplicationStatus
from app.services.cv_pdf import render_cv_pdf
from app.services.gemini_service import _call_gemini_with_retry
from app.services.matching import jaccard_score, explain_match
from app.services.screening import (
    PROMPT_VERSION,
    build_screening_prompt,
    clamp_score,
    derive_verdict,
)

router = APIRouter(prefix="/recruiter", tags=["recruiter"])

VALID_RECOMMENDATIONS = {"interview", "consider", "reject"}


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")

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
        # Prompt berubah -> fingerprint berubah -> hasil cache lama dihitung ulang
        "prompt_version": PROMPT_VERSION,
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


def normalize_screening_result(data: dict | None) -> dict | None:
    if not isinstance(data, dict):
        return None
    score = data.get("match_score")
    if isinstance(score, bool) or not isinstance(score, (int, float)) or not 0 <= score <= 100:
        return None

    recommendation = data.get("recommendation")
    if recommendation not in VALID_RECOMMENDATIONS:
        recommendation = "consider"
    reasoning = data.get("reasoning")
    if not isinstance(reasoning, str):
        reasoning = ""
    strengths = data.get("strengths")
    weaknesses = data.get("weaknesses")
    if not isinstance(strengths, list) or not all(isinstance(item, str) for item in strengths):
        strengths = []
    if not isinstance(weaknesses, list) or not all(isinstance(item, str) for item in weaknesses):
        weaknesses = []
    return {
        "match_score": score,
        "recommendation": recommendation,
        "reasoning": reasoning,
        "strengths": strengths,
        "weaknesses": weaknesses,
    }
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
    # Glints-like: Free 2 total, Premium 10 total
    is_premium = bool(getattr(user, "is_premium", False))
    limit = 10 if is_premium else 2
    count = db.query(Job).filter(Job.recruiter_id == str(user.id)).count()
    if count >= limit:
        raise HTTPException(429, f"Limit lowongan tercapai ({count}/{limit}). Upgrade ke Premium untuk 10 lowongan total.")

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


@router.put("/jobs/{job_id}")
def update_job(
    job_id: uuid.UUID,
    body: JobCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "recruiter":
        raise HTTPException(403, "Hanya recruiter yang dapat mengedit lowongan.")
    job = db.query(Job).filter(Job.id == job_id, Job.recruiter_id == str(user.id)).first()
    if not job:
        raise HTTPException(404, "Lowongan tidak ditemukan.")
    # Anti-abuse: hanya bisa edit dalam 24 jam setelah dibuat
    if job.created_at:
        from datetime import timezone
        created = job.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        if (datetime.now(timezone.utc) - created).total_seconds() > 24 * 3600:
            raise HTTPException(403, "Edit lowongan hanya bisa dalam 24 jam setelah dipost. Buat lowongan baru untuk perubahan besar.")
    if job.is_closed:
        raise HTTPException(400, "Lowongan sudah ditutup, tidak bisa diedit. Buka kembali dulu.")
    job.title = body.title
    job.company = body.company
    job.description = body.description
    job.required_skills = body.required_skills
    job.location = body.location
    job.is_remote = body.is_remote
    job.apply_url = body.apply_url
    job.salary = body.salary
    job.min_education = body.min_education
    job.min_experience = body.min_experience
    job.work_type = body.work_type
    job.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(job)
    return {"status": "success", "job_id": str(job.id)}


@router.delete("/jobs/{job_id}")
def delete_job(
    job_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "recruiter":
        raise HTTPException(403, "Hanya recruiter yang dapat menghapus lowongan.")
    job = db.query(Job).filter(Job.id == job_id, Job.recruiter_id == str(user.id)).first()
    if not job:
        raise HTTPException(404, "Lowongan tidak ditemukan.")
    # Jika sudah ada pelamar, jangan hard delete — tutup saja (audit)
    cnt = db.query(JobApplication).filter(JobApplication.job_id == job.id).count()
    if cnt > 0:
        raise HTTPException(400, f"Tidak bisa hapus: sudah ada {cnt} pelamar. Gunakan Tutup lowongan.")
    db.delete(job)
    db.commit()
    return {"status": "success", "deleted": str(job_id)}


@router.patch("/jobs/{job_id}/close")
def close_job(
    job_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "recruiter":
        raise HTTPException(403, "Hanya recruiter yang dapat menutup lowongan.")
    job = db.query(Job).filter(Job.id == job_id, Job.recruiter_id == str(user.id)).first()
    if not job:
        raise HTTPException(404, "Lowongan tidak ditemukan.")
    if job.is_closed:
        raise HTTPException(400, "Lowongan sudah tertutup.")
    job.is_closed = True
    job.updated_at = datetime.utcnow()
    db.commit()
    return {"status": "success", "is_closed": True}


@router.patch("/jobs/{job_id}/open")
def open_job(
    job_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "recruiter":
        raise HTTPException(403, "Hanya recruiter yang dapat membuka lowongan.")
    job = db.query(Job).filter(Job.id == job_id, Job.recruiter_id == str(user.id)).first()
    if not job:
        raise HTTPException(404, "Lowongan tidak ditemukan.")
    if not job.is_closed:
        raise HTTPException(400, "Lowongan sudah terbuka.")
    # cek limit saat buka kembali (hitung total tidak termasuk yang akan dibuka? sudah termasuk)
    is_premium = bool(getattr(user, "is_premium", False))
    limit = 10 if is_premium else 2
    total = db.query(Job).filter(Job.recruiter_id == str(user.id), Job.is_closed == False).count()
    if total >= limit:
        raise HTTPException(429, f"Limit lowongan aktif tercapai ({total}/{limit}). Tutup lowongan lain dulu.")
    job.is_closed = False
    job.updated_at = datetime.utcnow()
    db.commit()
    return {"status": "success", "is_closed": False}

@router.get("/jobs/my-jobs")
def get_my_jobs(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mendapatkan semua lowongan milik recruiter aktif."""
    if user.role != "recruiter":
        raise HTTPException(403, "Hanya recruiter yang dapat mengakses endpoint ini.")

    jobs = db.query(Job).filter(Job.recruiter_id == str(user.id)).order_by(Job.created_at.desc()).all()

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
            "is_closed": bool(job.is_closed),
            "created_at": job.created_at,
            "applicant_count": app_count,
        })
    # Urutkan: lowongan terbaru dulu, tapi yang tutup di bawah
    result.sort(key=lambda r: (r["is_closed"], -r["applicant_count"]))
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
                # Skill dengan bukti commit GitHub — sisanya declared (CV/topics)
                "verified_skills": (profile.verified_skills or []) if profile else [],
                "verified_skill_count": len(profile.verified_skills or []) if profile else 0,
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
    # Glints-like: Free 5/minggu, Premium unlimited
    is_premium = bool(getattr(user, "is_premium", False))
    if not is_premium:
        from datetime import timedelta
        week_ago = datetime.utcnow() - timedelta(days=7)
        # hitung screening minggu ini milik recruiter ini (join Job)
        cnt = (
            db.query(JobApplication)
            .join(Job, JobApplication.job_id == Job.id)
            .filter(
                Job.recruiter_id == str(user.id),
                JobApplication.ai_screening.isnot(None),
                JobApplication.updated_at >= week_ago,
            )
            .count()
        )
        if cnt >= 5:
            raise HTTPException(429, f"Kuota screening mingguan habis ({cnt}/5). Upgrade ke Premium untuk unlimited.")

    app = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not app:
        raise HTTPException(404, "Data lamaran tidak ditemukan.")

    job = db.query(Job).filter(Job.id == app.job_id, Job.recruiter_id == str(user.id)).first()
    if not job:
        raise HTTPException(403, "Anda tidak memiliki akses ke lowongan pelamar ini.")

    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == app.user_id).first()
    if not profile or not profile.cv_data:
        # Fallback jika CV belum di-upload/sync
        score = round(
            jaccard_score(profile.merged_skills if profile else [], job.required_skills or []) * 100
        )
        return {
            "match_score": score,
            "recommendation": derive_verdict(score),
            "reasoning": "Profil kandidat belum lengkap sehingga penilaian terbatas.",
            "strengths": ["Profil kandidat belum disinkronkan sepenuhnya."],
            "weaknesses": ["Kandidat belum mengunggah CV / portofolio."],
            "score_source": "fallback",
            "cached": False,
        }

    fingerprint = _screening_fingerprint(job, profile)
    if not refresh and app.ai_screening and app.screening_fingerprint == fingerprint:
        cached = normalize_screening_result(app.ai_screening)
        if cached is not None:
            cached["score_source"] = "ai"
            cached["cached"] = True
            return cached

    # Anchor deterministik dari skor algoritmik + skill matched/missing
    required = job.required_skills or []
    algo_score = round(jaccard_score(profile.merged_skills or [], required) * 100)
    # Lowongan tanpa required_skills -> anchor tidak bermakna, jangan menjepit
    anchor = algo_score if required else None
    reasons, missing = explain_match(profile.merged_skills or [], required)
    matched_note = "; ".join(reasons) if reasons else "tidak ada skill yang cocok terdeteksi"
    missing_note = ", ".join(missing[:8]) if missing else "tidak ada"

    prompt = build_screening_prompt(
        job_title=job.title,
        job_company=job.company,
        job_description=job.description or "",
        required_skills=required,
        min_experience=job.min_experience or "",
        min_education=job.min_education or "",
        work_type=job.work_type or "",
        salary=job.salary or "",
        cv_json=json.dumps(profile.cv_data, ensure_ascii=False),
        verified_skills=profile.verified_skills or [],
        merged_skills=profile.merged_skills or [],
        signals=profile.github_signals or {},
        anchor=anchor,
        matched_note=matched_note,
        missing_note=missing_note,
    )

    try:
        text = _call_gemini_with_retry(prompt)
    except Exception:
        raise HTTPException(502, "Layanan AI sedang tidak tersedia. Silakan coba lagi.")

    res_json = normalize_screening_result(_extract_json_data(text))
    if res_json is None:
        raise HTTPException(502, "Hasil analisis AI tidak valid. Silakan coba lagi.")
    # Dua jaminan keras: skor dijepit ke anchor, verdict diturunkan dari skor.
    # Instruksi di prompt saja tidak cukup — model bisa mengabaikannya.
    res_json["match_score"] = clamp_score(res_json["match_score"], anchor)
    res_json["recommendation"] = derive_verdict(res_json["match_score"])
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
        search = _escape_like(q)
        query = query.filter(
            (CandidateProfile.bio_full_name.ilike(f"%{search}%", escape="\\")) |
            (CandidateProfile.bio_address.ilike(f"%{search}%", escape="\\")) |
            (CandidateProfile.github_username.ilike(f"%{search}%", escape="\\"))
        )

    if location:
        query = query.filter(
            CandidateProfile.bio_address.ilike(f"%{_escape_like(location)}%", escape="\\")
        )

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
            query = query.filter(
                merged_text.ilike(f"%{_escape_like(skill)}%", escape="\\")
            )

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
            "verified_skills": profile.verified_skills or [],
            "verified_skill_count": len(profile.verified_skills or []),
            "interests": profile.interests or []
        })

    # Glints-like blur: Free hanya 5 profil/minggu full, sisanya blur
    is_premium = bool(getattr(user, "is_premium", False))
    paginated = filtered[offset : offset + limit]
    for idx, c in enumerate(paginated):
        global_idx = offset + idx
        is_blurred = (not is_premium) and global_idx >= 5
        c["is_blurred"] = is_blurred
        if is_blurred:
            # sembunyikan data sensitif untuk blur — frontend akan overlay
            c["email"] = None
            c["phone"] = None
            # simpan nama samaran
            c["fullName"] = (c["fullName"] or "Kandidat")[:1] + "***"
    return {
        "total": len(filtered),
        "limit": limit,
        "offset": offset,
        "candidates": paginated,
        "is_premium": is_premium,
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


@router.get("/billing/status")
def billing_status(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "recruiter":
        raise HTTPException(403, "Hanya recruiter yang dapat melihat tagihan.")
    is_premium = bool(getattr(user, "is_premium", False))
    # lowongan total
    total_jobs = db.query(Job).filter(Job.recruiter_id == str(user.id)).count()
    limit_jobs = 10 if is_premium else 2
    # screening minggu ini
    from datetime import timedelta
    week_ago = datetime.utcnow() - timedelta(days=7)
    screening_used = (
        db.query(JobApplication)
        .join(Job, JobApplication.job_id == Job.id)
        .filter(Job.recruiter_id == str(user.id), JobApplication.ai_screening.isnot(None), JobApplication.updated_at >= week_ago)
        .count()
    )
    screening_limit = None if is_premium else 5
    screening_remaining = None if is_premium else max(0, 5 - screening_used)
    # chat quota reuse logic
    from app.routers.chat import _is_premium as chat_is_premium
    chat_limit = 100 if is_premium else 5
    chat_used = db.query(JobApplication).join(Job, JobApplication.job_id == Job.id).filter(Job.recruiter_id == str(user.id)).count()  # dummy, real chat used via conversations
    # actual chat used from conversations
    from app.models import Conversation
    from sqlalchemy import func
    chat_used = db.query(func.count(Conversation.id)).filter(Conversation.recruiter_id == user.id, Conversation.created_at >= week_ago).scalar() or 0
    chat_remaining = max(0, chat_limit - chat_used)
    return {
        "is_premium": is_premium,
        "jobs": {"used": total_jobs, "limit": limit_jobs, "remaining": max(0, limit_jobs - total_jobs)},
        "screening": {"used": screening_used, "limit": screening_limit, "remaining": screening_remaining},
        "chat": {"used": chat_used, "limit": chat_limit, "remaining": chat_remaining},
    }


@router.post("/billing/mock-toggle")
def billing_mock_toggle(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "recruiter":
        raise HTTPException(403, "Hanya recruiter yang dapat mengubah paket.")
    new_val = not bool(getattr(user, "is_premium", False))
    user.is_premium = new_val
    # sinkron ke recruiter_profiles
    rprof = db.query(RecruiterProfile).filter(RecruiterProfile.user_id == user.id).first()
    if rprof:
        rprof.is_premium = new_val
    db.commit()
    return {"is_premium": new_val, "message": "Premium aktif" if new_val else "Kembali ke Gratis"}

