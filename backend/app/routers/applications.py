from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import CandidateProfile, Job, JobApplication, RoadmapProgress, User
from app.schemas import (
    ApplicationCreate,
    ApplicationOut,
    ApplicationStatus,
    ApplicationStatusPatch,
    CoverLetterOut,
    GenerateLetterRequest,
)
from app.services.letter_service import generate_cover_letter
from app.services.matching import jaccard_score, normalize_skill

router = APIRouter(prefix="/applications", tags=["applications"])


# ── Helpers ──────────────────────────────────────────────────────────────────

def _roadmap_completed(db: Session, user_id: UUID, job_id: UUID) -> bool:
    """Check whether all steps of a job-specific roadmap are completed."""
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user_id).first()
    if not profile or not profile.roadmap_cached:
        return False
    cache_key = str(job_id)
    entry = profile.roadmap_cached.get(cache_key, {})
    steps = entry.get("steps", [])
    if not steps:
        return False
    total = len(steps)
    # Hanya hitung progress yang step_index-nya masih dalam range roadmap saat ini.
    # Tanpa filter ini, row lama dari roadmap sebelumnya (yang punya lebih sedikit step)
    # bisa menyebabkan completed >= total menjadi True secara salah (false positive).
    completed = db.query(RoadmapProgress).filter(
        RoadmapProgress.user_id == user_id,
        RoadmapProgress.roadmap_key == cache_key,
        RoadmapProgress.completed == True,  # noqa: E712
        RoadmapProgress.step_index < total,  # hanya step yang ada di roadmap saat ini
    ).count()
    return completed >= total


def _match_score(db: Session, user: User, job: Job) -> float | None:
    """Compute match score for the user against a job (cached or fresh)."""
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).first()
    if not profile or not profile.merged_skills:
        return None
    merged_norm = {normalize_skill(s) for s in profile.merged_skills}
    required_norm = {normalize_skill(s) for s in (job.required_skills or [])}
    return jaccard_score(merged_norm, required_norm)


def _build_out(app: JobApplication, job: Job, db: Session) -> ApplicationOut:
    return ApplicationOut(
        id=app.id,
        job_id=app.job_id,
        job_title=job.title,
        job_company=job.company,
        job_location=job.location,
        apply_url=job.apply_url,
        status=ApplicationStatus(app.status),
        note=app.note,
        applied_at=app.applied_at,
        updated_at=app.updated_at,
        roadmap_completed=_roadmap_completed(db, app.user_id, app.job_id),
        match_score=None,  # computed separately when needed
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/{job_id}", response_model=ApplicationOut)
def apply_to_job(
    job_id: UUID,
    body: ApplicationCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Apply to a job. Idempotent: re-applying returns the existing application."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "Lowongan tidak ditemukan")

    # Guard: user harus sudah onboarding (punya profil & merged_skills)
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).first()
    if not profile or not profile.merged_skills:
        raise HTTPException(400, "Selesaikan onboarding terlebih dahulu sebelum melamar")

    existing = db.query(JobApplication).filter(
        JobApplication.user_id == user.id,
        JobApplication.job_id == job_id,
    ).first()
    if existing:
        # Already applied — return existing (idempotent)
        out = _build_out(existing, job, db)
        out.match_score = _match_score(db, user, job)
        return out

    app = JobApplication(
        user_id=user.id,
        job_id=job_id,
        status="applied",
        note=body.note,
    )
    db.add(app)
    db.commit()
    db.refresh(app)

    out = _build_out(app, job, db)
    out.match_score = _match_score(db, user, job)
    return out


@router.get("", response_model=list[ApplicationOut])
def list_applications(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all job applications for the current user."""
    apps = (
        db.query(JobApplication)
        .filter(JobApplication.user_id == user.id)
        .order_by(JobApplication.applied_at.desc())
        .all()
    )
    result = []
    for app in apps:
        job = db.query(Job).filter(Job.id == app.job_id).first()
        if not job:
            continue
        out = _build_out(app, job, db)
        out.match_score = _match_score(db, user, job)
        result.append(out)
    return result


@router.get("/{job_id}", response_model=ApplicationOut | None)
def get_application(
    job_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get application status for a specific job. Returns null if not applied."""
    app = db.query(JobApplication).filter(
        JobApplication.user_id == user.id,
        JobApplication.job_id == job_id,
    ).first()
    if not app:
        return None
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        return None
    out = _build_out(app, job, db)
    out.match_score = _match_score(db, user, job)
    return out


@router.patch("/{job_id}/status", response_model=ApplicationOut)
def update_status(
    job_id: UUID,
    body: ApplicationStatusPatch,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update status of an application (applied → interview → rejected / offer)."""
    app = db.query(JobApplication).filter(
        JobApplication.user_id == user.id,
        JobApplication.job_id == job_id,
    ).first()
    if not app:
        raise HTTPException(404, "Lamaran tidak ditemukan")

    app.status = body.status.value
    if body.note is not None:
        app.note = body.note
    db.commit()
    db.refresh(app)

    job = db.query(Job).filter(Job.id == job_id).first()
    out = _build_out(app, job, db)
    out.match_score = _match_score(db, user, job)
    return out


@router.delete("/{job_id}")
def withdraw_application(
    job_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Withdraw (delete) an application."""
    app = db.query(JobApplication).filter(
        JobApplication.user_id == user.id,
        JobApplication.job_id == job_id,
    ).first()
    if not app:
        raise HTTPException(404, "Lamaran tidak ditemukan")

    db.delete(app)
    db.commit()
    return {"ok": True, "message": "Lamaran berhasil ditarik"}


@router.post("/{job_id}/generate-letter", response_model=CoverLetterOut)
def generate_letter(
    job_id: UUID,
    body: GenerateLetterRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a personalized cover letter for this job using Gemini AI."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "Lowongan tidak ditemukan")

    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).first()
    if not profile or not profile.merged_skills:
        raise HTTPException(400, "Selesaikan sinkronisasi profil terlebih dahulu sebelum generate surat lamaran")

    merged = profile.merged_skills or []
    required = list(job.required_skills or [])

    # Compute matched vs missing skills
    merged_norm = {normalize_skill(s) for s in merged}
    required_norm_map = {normalize_skill(s): s for s in required}
    matching = [orig for norm, orig in required_norm_map.items() if norm in merged_norm]
    missing = [orig for norm, orig in required_norm_map.items() if norm not in merged_norm]

    try:
        letter_text = generate_cover_letter(
            full_name=body.full_name or profile.bio_full_name or "Pelamar",
            github_username=profile.github_username,
            merged_skills=merged,
            job_title=job.title,
            job_company=job.company,
            job_location=job.location,
            required_skills=required,
            matching_skills=matching,
            missing_skills=missing,
            # Bio data dari profil (diisi dari form bio data)
            birth_place=profile.bio_birth_place,
            birth_date=profile.bio_birth_date,
            address=profile.bio_address,
            phone=profile.bio_phone,
            email=user.email,
        )
    except Exception as e:
        raise HTTPException(502, f"Gagal generate surat lamaran: {e!s}") from e

    return CoverLetterOut(
        letter=letter_text,
        job_title=job.title,
        job_company=job.company,
    )
