import hashlib
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models import CandidateProfile, User
from app.services.ai_guardrails import AiGenerationQuotaError, reserve_ai_generation
from app.services import github_client
from app.services.gemini_service import (
    GeminiQuotaExceededError,
    GeminiRateLimitError,
    extract_skills_from_cv_text,
    extract_cv_data_from_text,
)
from app.services.github_identity import apply_github_data, connect_github, connection_state
from app.services.pdf_extract import extract_text_from_pdf

router = APIRouter(prefix="/profiles", tags=["profiles"])

# Rate limiter berbasis DB — tahan server restart
_SYNC_COOLDOWN_SECONDS = 60


def has_usable_cv_data(data: dict | None) -> bool:
    return isinstance(data, dict) and any(bool(value) for value in data.values())


def cv_content_fingerprint(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


@router.post("/sync")
async def sync_profile(
    github_url: str | None = Form(None),
    cv: UploadFile | None = File(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Sync profil dari CV (opsional) + GitHub (dari identitas terverifikasi/legacy)."""
    content: bytes | None = None
    cv_fingerprint: str | None = None
    if cv is not None:
        if not cv.filename or not cv.filename.lower().endswith(".pdf"):
            raise HTTPException(400, "File CV harus berformat PDF")
        content = await cv.read()
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(400, "Ukuran PDF terlalu besar, maksimal 5MB")
        cv_fingerprint = cv_content_fingerprint(content)

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

    # Sumber GitHub: identitas terverifikasi > username legacy > ketikan (masa transisi).
    # Username ketikan tidak pernah menimpa identitas yang sudah ada.
    state = connection_state(existing_for_ratelimit)
    typed_username = False
    if state in ("verified", "legacy_unverified"):
        username = existing_for_ratelimit.github_username
    elif github_url and github_url.strip():
        username = github_client.parse_github_username(github_url)
        if not username:
            raise HTTPException(
                400,
                "Format GitHub tidak valid. Masukkan username (contoh: octocat) "
                "atau URL profil (contoh: https://github.com/octocat)"
            )
        typed_username = True
    else:
        username = None

    has_saved_cv = bool(existing_for_ratelimit and existing_for_ratelimit.cv_skills is not None)
    if not username and content is None and not has_saved_cv:
        raise HTTPException(400, "Upload CV atau hubungkan GitHub terlebih dahulu.")

    gh_signals = None
    if username:
        # fetch_github_signals sudah menangani validasi + error secara sekaligus
        try:
            gh_signals = await github_client.fetch_github_signals(username)
        except HTTPException:
            raise  # teruskan pesan yang sudah user-friendly
        except Exception as e:
            raise HTTPException(502, f"Gagal mengambil data dari GitHub: {e!s}") from e

    cached_cv = False
    if content is not None:
        text = extract_text_from_pdf(content)
        if not text or len(text) < 20:
            raise HTTPException(
                400,
                "Gagal membaca teks dari PDF. Pastikan CV kamu menggunakan PDF berbasis teks "
                "(bukan hasil scan/foto). Jika CV kamu di-scan, coba convert ulang ke PDF teks "
                "menggunakan Word, Google Docs, atau tools seperti Adobe Acrobat."
            )

        cached_cv = bool(
            existing_for_ratelimit
            and existing_for_ratelimit.cv_ai_fingerprint == cv_fingerprint
            and existing_for_ratelimit.cv_skills is not None
            and has_usable_cv_data(existing_for_ratelimit.cv_data)
        )
        if cached_cv:
            cv_skills = existing_for_ratelimit.cv_skills or []
            cv_data = existing_for_ratelimit.cv_data or {}
        else:
            try:
                reserve_ai_generation(
                    db,
                    user_id=user.id,
                    feature="cv_parse",
                    user_daily_limit=settings.ai_cv_parse_daily_limit,
                    global_rpm_limit=settings.ai_global_requests_per_minute,
                    units=2,
                )
                cv_skills = extract_skills_from_cv_text(text)
                cv_data = extract_cv_data_from_text(text)
            except AiGenerationQuotaError as e:
                message = (
                    "Terlalu banyak proses AI di GitHire. Coba lagi sekitar satu menit."
                    if e.scope == "global"
                    else "Batas parse CV harian sudah tercapai. Coba lagi setelah 24 jam."
                )
                raise HTTPException(429, message) from e
            except GeminiQuotaExceededError as e:
                raise HTTPException(503, "Kuota AI sedang penuh. Coba lagi setelah kuota direset.") from e
            except GeminiRateLimitError as e:
                raise HTTPException(503, "Layanan AI sedang ramai. Silakan coba lagi sebentar.") from e
            except Exception as e:
                raise HTTPException(502, f"Gagal mengekstrak data dari CV menggunakan Gemini AI: {e!s}") from e
            if not has_usable_cv_data(cv_data):
                raise HTTPException(502, "AI tidak berhasil membaca struktur CV. Silakan coba PDF lain.")
    elif existing_for_ratelimit:
        cv_skills = existing_for_ratelimit.cv_skills or []
        cv_data = existing_for_ratelimit.cv_data
    else:
        cv_skills = []
        cv_data = None

    profile = existing_for_ratelimit
    if not profile:
        profile = CandidateProfile(user_id=user.id)
        db.add(profile)

    profile.cv_skills = cv_skills
    profile.cv_data = cv_data
    if content is not None:
        profile.cv_ai_fingerprint = cv_fingerprint
        # Simpan PDF asli agar bisa dipakai/di-download saat melamar
        profile.cv_file = content
        profile.cv_filename = cv.filename
        profile.cv_uploaded_at = datetime.utcnow()
    if typed_username:
        # Masa transisi: frontend lama masih mengirim username ketikan.
        profile.github_legacy_grandfathered = True

    # Gabung skill + reset roadmap hanya jika skill benar-benar berubah
    skills_changed = apply_github_data(db, profile, username, gh_signals)
    profile.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(profile)

    merged = profile.merged_skills or []
    verified = profile.verified_skills or []
    return {
        "ok": True,
        "github_username": username,
        "skills_count": len(merged),
        "merged_skills": merged,
        "skills_changed": skills_changed,
        "verified_skills_count": len(verified),
        "verified_skills": verified,
        "cv_ai_cached": cached_cv,
    }


@router.post("/github/connect")
async def connect_github_account(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Tautkan GitHub yang sudah terhubung di Clerk ke profil kandidat."""
    if user.role == "recruiter":
        raise HTTPException(403, "Hanya untuk kandidat.")
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).first()
    if not profile:
        profile = CandidateProfile(user_id=user.id)
        db.add(profile)
        db.flush()
    profile = await connect_github(db, user, profile)
    return {"ok": True, "github_username": profile.github_username, "github_connection": "verified"}
