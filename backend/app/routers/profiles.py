from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import CandidateProfile, RoadmapProgress, User
from app.services import github_client
from app.services.gemini_service import extract_skills_from_cv_text, extract_cv_data_from_text
from app.services.pdf_extract import extract_text_from_pdf

router = APIRouter(prefix="/profiles", tags=["profiles"])

# Rate limiter berbasis DB — tahan server restart
_SYNC_COOLDOWN_SECONDS = 60


def _skills_from_github(signals: dict | None) -> list[str]:
    if not signals:
        return []
    langs = signals.get("languages") or {}
    topics = signals.get("topics") or []
    skills: list[str] = []
    if isinstance(langs, dict):
        for k in langs.keys():
            if isinstance(k, str) and k.strip():
                skills.append(k.strip())
    if isinstance(topics, list):
        for t in topics:
            if isinstance(t, str) and t.strip():
                skills.append(t.strip())
    seen: set[str] = set()
    out: list[str] = []
    for s in skills:
        low = s.lower()
        if low not in seen:
            seen.add(low)
            out.append(s)
    return out[:50]


def _merge_skills(gh: list[str], cv: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for s in gh + cv:
        if not isinstance(s, str) or not s.strip():
            continue
        low = s.lower()
        if low not in seen:
            seen.add(low)
            out.append(s.strip())
    return out


@router.post("/sync")
async def sync_profile(
    github_url: str = Form(...),
    cv: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not cv.filename or not cv.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "File CV harus berformat PDF")
    content = await cv.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(400, "Ukuran PDF terlalu besar, maksimal 5MB")

    # Rate limiting berbasis DB: cek kolom updated_at di profil yang sudah ada
    existing_for_ratelimit = db.query(CandidateProfile).filter(
        CandidateProfile.user_id == user.id
    ).first()
    if existing_for_ratelimit and existing_for_ratelimit.updated_at:
        last_dt = existing_for_ratelimit.updated_at
        # Handle both timezone-aware and naive datetimes
        if last_dt.tzinfo is not None:
            last_sync_utc = last_dt.astimezone(timezone.utc)
        else:
            last_sync_utc = last_dt.replace(tzinfo=timezone.utc)
        elapsed = (datetime.now(timezone.utc) - last_sync_utc).total_seconds()
        if elapsed < _SYNC_COOLDOWN_SECONDS:
            remaining = int(_SYNC_COOLDOWN_SECONDS - elapsed)
            raise HTTPException(
                429,
                f"Terlalu cepat! Tunggu {remaining} detik lagi sebelum sync ulang."
            )

    username = github_client.parse_github_username(github_url)
    if not username:
        raise HTTPException(
            400,
            "Format GitHub tidak valid. Masukkan username (contoh: octocat) "
            "atau URL profil (contoh: https://github.com/octocat)"
        )

    # fetch_github_signals sudah menangani validasi + error secara sekaligus
    try:
        gh_signals = await github_client.fetch_github_signals(username)
    except HTTPException:
        raise  # teruskan pesan yang sudah user-friendly
    except Exception as e:
        raise HTTPException(502, f"Gagal mengambil data dari GitHub: {e!s}") from e

    text = extract_text_from_pdf(content)
    if not text or len(text) < 20:
        raise HTTPException(
            400,
            "Gagal membaca teks dari PDF. Pastikan CV kamu menggunakan PDF berbasis teks "
            "(bukan hasil scan/foto). Jika CV kamu di-scan, coba convert ulang ke PDF teks "
            "menggunakan Word, Google Docs, atau tools seperti Adobe Acrobat."
        )

    try:
        cv_skills = extract_skills_from_cv_text(text)
        cv_data = extract_cv_data_from_text(text)
    except Exception as e:
        raise HTTPException(502, f"Gagal mengekstrak data dari CV menggunakan Gemini AI: {e!s}") from e

    gh_skills = _skills_from_github(gh_signals)
    merged = _merge_skills(gh_skills, cv_skills)

    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).first()
    if not profile:
        profile = CandidateProfile(user_id=user.id)
        db.add(profile)

    # Deteksi apakah skill benar-benar berubah sebelum reset roadmap
    old_skills: set[str] = {s.lower() for s in (profile.merged_skills or [])} if profile else set()
    new_skills: set[str] = {s.lower() for s in merged}
    skills_changed = old_skills != new_skills

    profile.github_username = username
    profile.github_signals = gh_signals
    profile.cv_skills = cv_skills
    profile.cv_data = cv_data
    profile.merged_skills = merged

    profile.updated_at = datetime.utcnow()

    # Hanya reset roadmap & progress jika skill benar-benar berubah
    if skills_changed:
        profile.roadmap_cached = None
        profile.roadmap_fingerprint = None
        db.query(RoadmapProgress).filter(RoadmapProgress.user_id == user.id).delete()

    db.commit()
    db.refresh(profile)

    return {
        "ok": True,
        "github_username": username,
        "skills_count": len(merged),
        "merged_skills": merged,
        "skills_changed": skills_changed,
    }
