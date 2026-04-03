import hashlib
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.models import CandidateProfile, Job, RoadmapProgress, User
from app.services.gemini_service import generate_roadmap
from app.services.matching import skill_gap


def fingerprint_for_roadmap(merged: list[str], gap: list[str], job_id: UUID | None = None) -> str:
    """Buat fingerprint unik berdasarkan skill + gap + job target (opsional)."""
    raw = (
        "|".join(sorted({x.lower() for x in merged}))
        + "::"
        + "|".join(sorted({x.lower() for x in gap}))
        + "::"
        + (str(job_id) if job_id else "_generic")
    )
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def compute_gap_against_market(db: Session, merged: list[str]) -> list[str]:
    """Hitung skill gap terhadap SEMUA lowongan (roadmap generik)."""
    all_required: list[str] = []
    for job in db.query(Job).all():
        all_required.extend(job.required_skills or [])
    return skill_gap(merged, list(dict.fromkeys(all_required)))


def compute_gap_against_job(merged: list[str], job: Job) -> list[str]:
    """Hitung skill gap terhadap SATU lowongan spesifik."""
    return skill_gap(merged, list(job.required_skills or []))


def _get_cache_key(job_id: UUID | None) -> str:
    return str(job_id) if job_id else "_generic"


def ensure_roadmap_generated(
    db: Session,
    user: User,
    job_id: UUID | None = None,
) -> tuple[str, list[dict], bool]:
    """
    Pastikan roadmap sudah di-generate. Jika belum atau fingerprint berbeda, generate baru.

    Args:
        db: Database session
        user: User yang sedang login
        job_id: UUID job target (None = roadmap generik vs semua job)

    Returns:
        (fingerprint, steps, is_cached)
    """
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).first()
    if not profile or not profile.merged_skills:
        raise ValueError("Silakan selesaikan sinkronisasi profil terlebih dahulu")

    merged = profile.merged_skills or []

    # Tentukan gap berdasarkan job target atau semua job
    if job_id:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise ValueError("Lowongan tidak ditemukan")
        gap = compute_gap_against_job(merged, job)
        # Jika gap kosong (semua skill ada), pakai required_skills sebagai bahan roadmap
        roadmap_input_gap = gap if gap else list(job.required_skills or [])
    else:
        job = None
        gap = compute_gap_against_market(db, merged)
        roadmap_input_gap = gap

    fp = fingerprint_for_roadmap(merged, gap, job_id)
    cache_key = _get_cache_key(job_id)

    # roadmap_cached sekarang berformat dict: { "_generic": {steps, fp}, "<job_id>": {steps, fp} }
    cached_all = profile.roadmap_cached or {}
    if not isinstance(cached_all, dict):
        cached_all = {}

    entry = cached_all.get(cache_key, {})
    if entry.get("fp") == fp and entry.get("steps"):
        return fp, entry["steps"], True

    # Generate roadmap baru dari Gemini
    raw_steps = generate_roadmap(roadmap_input_gap, merged)

    # Simpan ke cache dengan key yang sesuai — buat dict BARU agar SQLAlchemy mendeteksi perubahan
    new_cache = dict(cached_all)  # top-level copy
    new_cache[cache_key] = {"steps": raw_steps, "fp": fp}
    profile.roadmap_cached = new_cache
    flag_modified(profile, "roadmap_cached")  # paksa SQLAlchemy track perubahan JSON
    profile.roadmap_fingerprint = fp  # backward compat

    # Reset progress HANYA untuk roadmap yang sedang di-generate (bukan semua job)
    db.query(RoadmapProgress).filter(
        RoadmapProgress.user_id == user.id,
        RoadmapProgress.roadmap_key == cache_key,
    ).delete()
    db.commit()
    db.refresh(profile)

    return fp, raw_steps, False
