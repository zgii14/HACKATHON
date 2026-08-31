from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import update as sa_update
from sqlalchemy.orm import Session

from app.auth import get_current_user, is_recruiter_email, is_admin_email
from app.database import get_db
from app.models import CandidateProfile, Job, RecruiterProfile, RoadmapProgress, User
from app.services.cv_pdf import render_cv_pdf
from app.schemas import (
    BookmarkedJobOut,
    BioDataOut,
    BioDataPatch,
    CVDataSchema,
    InterestsPatch,
    ModeInfoOut,
    ProfileOut,
    ReadinessOut,
    RecruiterProfilePatch,
    RoadmapOut,
    RoadmapStepOut,
    RoadmapStepPatch,
    RoleUpdate,
    CVPreferenceUpdate,
    SkillDemandItem,
    SkillGapOut,
    UserOut,
)
from app.services import roadmap_service
from app.services.market_scope import resolve_market_scope
from app.services.matching import jaccard_score
from app.services.skill_gap import (
    aggregate_demand,
    canonical_set,
    compute_readiness,
    split_gap,
)

router = APIRouter(prefix="/me", tags=["me"])


def _github_skill_names(profile: CandidateProfile) -> list[str]:
    """Nama skill yang muncul di data GitHub (bahasa + topics).

    CATATAN: ini bukan verifikasi kepemilikan atau kemahiran — hanya kemunculan
    nama. Verifikasi bukti commit ada di profile.verified_skills.
    """
    signals = profile.github_signals or {}
    langs = signals.get("languages")
    topics = signals.get("topics")
    names: list[str] = []
    if isinstance(langs, dict):
        names.extend(str(k) for k in langs)
    if isinstance(topics, list):
        names.extend(str(t).replace("-", " ") for t in topics)
    return names


@router.get("", response_model=UserOut)
def read_me(user: User = Depends(get_current_user)) -> User:
    return user


VALID_ROLES = {"candidate", "recruiter"}


@router.post("/role", response_model=UserOut)
def set_role(
    body: RoleUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    """Menetapkan role user (dipanggil dari role picker saat onboarding)."""
    if body.role not in VALID_ROLES:
        raise HTTPException(400, f"Role tidak valid. Pilih salah satu: {', '.join(sorted(VALID_ROLES))}")
    if body.role == "recruiter" and not is_recruiter_email(user.email):
        # Cek apakah sudah approved via recruiter_profiles
        rp = db.query(RecruiterProfile).filter(RecruiterProfile.user_id == user.id).first()
        if not rp or rp.status != "approved":
            raise HTTPException(403, "Akun ini belum terdaftar sebagai recruiter. Silakan daftar via footer landing page.")
    user.role = body.role
    db.commit()
    db.refresh(user)
    return user


# ── Recruiter Request (hidden footer) ──────────────────────────────────────
from app.schemas import RecruiterRequestCreate, RecruiterRequestOut
import re


def _is_valid_url(url: str) -> bool:
    return bool(re.match(r"^https?://.+", url.strip()))


@router.post("/recruiter-request", response_model=RecruiterRequestOut)
def create_recruiter_request(
    body: RecruiterRequestCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Kandidat mengajukan diri jadi recruiter (6 field). Hidden di footer landing."""
    # Sudah recruiter?
    if user.role == "recruiter":
        raise HTTPException(400, "Kamu sudah menjadi recruiter.")
    # Cek existing pending/approved
    existing = db.query(RecruiterProfile).filter(RecruiterProfile.user_id == user.id).first()
    if existing:
        if existing.status == "pending":
            raise HTTPException(409, "Pengajuanmu masih menunggu persetujuan admin.")
        if existing.status == "approved":
            # Sync role jika belum
            user.role = "recruiter"
            db.commit()
            raise HTTPException(400, "Kamu sudah disetujui sebagai recruiter. Reload halaman.")
        # jika rejected, boleh ajukan lagi → hapus yang lama
        if existing.status == "rejected":
            db.delete(existing)
            db.commit()

    if not _is_valid_url(body.company_website):
        raise HTTPException(400, "Website perusahaan harus diawali http:// atau https://")

    rp = RecruiterProfile(
        user_id=user.id,
        company_name=body.company_name.strip(),
        company_website=body.company_website.strip(),
        company_size=body.company_size,
        industry=body.industry.strip(),
        wa_pic=body.wa_pic.strip(),
        reason=body.reason.strip() if body.reason else None,
        status="pending",
    )
    db.add(rp)
    db.commit()
    db.refresh(rp)
    # Attach email for response
    out = RecruiterRequestOut.model_validate(rp)
    out.user_email = user.email
    return out


@router.get("/recruiter-request", response_model=RecruiterRequestOut | None)
def get_my_recruiter_request(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rp = db.query(RecruiterProfile).filter(RecruiterProfile.user_id == user.id).first()
    if not rp:
        return None
    out = RecruiterRequestOut.model_validate(rp)
    out.user_email = user.email
    return out


@router.patch("/recruiter-profile", response_model=RecruiterRequestOut)
def patch_my_recruiter_profile(
    body: RecruiterProfilePatch,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "recruiter":
        raise HTTPException(403, "Hanya recruiter yang dapat mengubah nama perusahaan.")
    rp = db.query(RecruiterProfile).filter(RecruiterProfile.user_id == user.id).first()
    if not rp:
        raise HTTPException(404, "Profil recruiter tidak ditemukan.")
    if rp.status != "approved":
        raise HTTPException(403, "Hanya recruiter approved yang dapat mengubah nama.")
    rp.company_name = body.company_name.strip()
    db.commit()
    db.refresh(rp)
    out = RecruiterRequestOut.model_validate(rp)
    out.user_email = user.email
    return out


VALID_CV_PREFS = {"form", "original"}


def _profile_bio(p: CandidateProfile) -> dict:
    return {
        "full_name": p.bio_full_name,
        "phone": p.bio_phone,
        "address": p.bio_address,
        "email": (p.user.email if p.user else None),
    }


@router.patch("/cv-preference")
def set_cv_preference(
    body: CVPreferenceUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Menetapkan versi CV yang dipakai saat melamar: 'form' (ATS terstruktur) | 'original' (PDF asli)."""
    if body.preference not in VALID_CV_PREFS:
        raise HTTPException(400, f"Preferensi tidak valid. Pilih: {', '.join(sorted(VALID_CV_PREFS))}")
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(404, "Profil belum ada. Selesaikan onboarding dulu.")
    if body.preference == "original" and not profile.cv_file:
        raise HTTPException(400, "Belum ada PDF asli tersimpan. Upload CV dulu untuk memilih opsi ini.")
    profile.cv_preference = body.preference
    db.commit()
    return {"status": "success", "cv_preference": body.preference}


@router.get("/cv/download")
def download_my_cv(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Download/preview CV kandidat sendiri sesuai preferensi (form → render PDF, original → PDF asli)."""
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(404, "Profil belum ada.")

    if profile.cv_preference == "original" and profile.cv_file:
        return Response(
            content=bytes(profile.cv_file),
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="{profile.cv_filename or "cv.pdf"}"'},
        )

    if not profile.cv_data:
        raise HTTPException(404, "Belum ada data CV untuk di-render.")
    pdf = render_cv_pdf(profile.cv_data, _profile_bio(profile))
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": 'inline; filename="cv-form.pdf"'},
    )


@router.get("/profile", response_model=ProfileOut | None)
def read_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rp = db.query(RecruiterProfile).filter(RecruiterProfile.user_id == user.id).first()
    pending = rp.status == "pending" if rp else False
    is_admin = is_admin_email(user.email)
    p = user.profile
    if not p:
        return ProfileOut(
            github_username=None,
            github_signals=None,
            cv_skills=None,
            merged_skills=None,
            verified_skills=[],
            interests=None,
            cv_data=None,
            updated_at=None,
            role=user.role,
            recruiter_access_denied=getattr(user, "recruiter_access_denied", False),
            recruiter_pending=pending or getattr(user, "recruiter_pending", False),
            is_admin=is_admin or getattr(user, "is_admin", False),
        )
    data = {
        "github_username": p.github_username,
        "github_signals": p.github_signals,
        "cv_skills": p.cv_skills,
        "merged_skills": p.merged_skills,
        "verified_skills": p.verified_skills or [],
        "interests": p.interests,
        "cv_data": p.cv_data,
        "bio_full_name": p.bio_full_name,
        "bio_birth_place": p.bio_birth_place,
        "bio_birth_date": p.bio_birth_date,
        "bio_address": p.bio_address,
        "bio_phone": p.bio_phone,
        "updated_at": p.updated_at,
        "role": user.role,
        "recruiter_access_denied": getattr(user, "recruiter_access_denied", False),
        "recruiter_pending": pending or getattr(user, "recruiter_pending", False),
        "is_admin": is_admin or getattr(user, "is_admin", False),
        "cv_filename": p.cv_filename,
        "cv_uploaded_at": p.cv_uploaded_at,
        "cv_preference": p.cv_preference,
    }
    return ProfileOut(**data)


@router.put("/interests", response_model=ProfileOut)
def update_interests(
    body: InterestsPatch,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Simpan bidang minat user untuk memfilter skill gap yang relevan."""
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(404, "Profil belum ada. Selesaikan onboarding terlebih dahulu.")
    profile.interests = body.interests
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/biodata", response_model=BioDataOut)
def get_biodata(user: User = Depends(get_current_user)):
    """Ambil bio data user (nama, TTL, alamat, dll) untuk surat lamaran."""
    p = user.profile
    if not p:
        return BioDataOut()
    return p


@router.patch("/biodata", response_model=BioDataOut)
def update_biodata(
    body: BioDataPatch,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Simpan bio data user untuk dipakai otomatis saat generate surat lamaran."""
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).first()
    if not profile:
        profile = CandidateProfile(user_id=user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    # Gunakan targeted SQL UPDATE — JANGAN load full ORM object lalu commit,
    # karena SQLAlchemy bisa inadvertently overwrite JSON columns (roadmap_cached, dll).
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        db.execute(
            sa_update(CandidateProfile)
            .where(CandidateProfile.user_id == user.id)
            .values(**updates)
            .execution_options(synchronize_session="fetch")
        )
        db.commit()
        db.refresh(profile)

    return profile


@router.get("/skill-gap", response_model=SkillGapOut)
def get_skill_gap(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    mode: str = Query(default="auto", description="'auto', 'interests', atau 'all'"),
):
    """Kesiapan kandidat terhadap lowongan relevan yang AKTIF.

    Skor utama = berapa lowongan yang requirement-nya sudah terpenuhi minimal
    threshold. JANGAN kembali ke coverage union-of-skills: metrik itu menghukum
    kandidat karena tidak menguasai stack alternatif yang tidak diminta lowongan
    relevannya, dan dulu dihitung dari daftar missing yang sudah dipotong 15.
    """
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).first()
    if not profile or not profile.merged_skills:
        return SkillGapOut(has_profile=False)

    user_interests: list[str] = list(profile.interests or [])
    scope = resolve_market_scope(db, user_interests, mode)

    user_canon = canonical_set(profile.merged_skills)
    github_canon = canonical_set(_github_skill_names(profile))

    demand = aggregate_demand(scope.jobs)
    readiness = compute_readiness(user_canon, scope.jobs)
    missing, unproven = split_gap(user_canon, github_canon, demand)

    def to_items(items) -> list[SkillDemandItem]:
        return [
            SkillDemandItem(skill=i.label, canonical_skill=i.canonical, job_count=i.job_count)
            for i in items
        ]

    verified_skills: list = profile.verified_skills or []

    return SkillGapOut(
        has_profile=True,
        readiness=ReadinessOut(
            ready_jobs=readiness.ready_jobs,
            relevant_jobs=readiness.relevant_jobs,
            median_coverage_pct=readiness.median_coverage_pct,
            threshold_pct=readiness.threshold_pct,
        ),
        mode_info=ModeInfoOut(
            requested=scope.requested_mode,
            effective=scope.effective_mode,
            fallback_reason=scope.fallback_reason,
        ),
        missing_skill_count=len(missing),
        missing_skills=[i.label for i in missing[:15]],
        missing_demand=to_items(missing[:10]),
        unproven_demand=to_items(unproven[:10]),
        user_skill_count=len(user_canon),
        market_skill_count=len(demand),
        github_backed_count=len(user_canon & github_canon),
        verified_skill_count=len(verified_skills),
        verified_skills=verified_skills,
        interests=user_interests,
        # ── mirror deprecated untuk consumer yang belum migrasi ──
        skill_freq=[{"skill": i.label, "job_count": i.job_count} for i in missing[:10]],
        weak_skills=[i.label for i in unproven],
        total_job_skills=len(demand),
        mode=scope.effective_mode,
    )


@router.get("/bookmarks", response_model=list[BookmarkedJobOut])
def get_bookmarks(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Kembalikan semua job yang sudah punya roadmap (= job yang di-bookmark user).
    Setiap item menyertakan progress belajar dan match score.
    """
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).first()
    if not profile or not profile.roadmap_cached:
        return []

    cached_all = profile.roadmap_cached or {}
    # Ambil hanya job UUID (bukan "_generic")
    job_ids_str = [k for k in cached_all.keys() if k != "_generic"]
    if not job_ids_str:
        return []

    # Konversi ke UUID dan fetch jobs
    job_uuid_map: dict[str, UUID] = {}
    for k in job_ids_str:
        try:
            job_uuid_map[k] = UUID(k)
        except ValueError:
            continue

    jobs = db.query(Job).filter(Job.id.in_(list(job_uuid_map.values()))).all()
    job_lookup = {str(j.id): j for j in jobs}

    # Hitung match score tiap job
    user_skills = list(profile.merged_skills or [])

    result: list[BookmarkedJobOut] = []
    for key, job_uuid in job_uuid_map.items():
        job = job_lookup.get(key)
        if not job:
            continue

        entry = cached_all.get(key, {})
        total_steps = len(entry.get("steps") or [])

        progress_rows = (
            db.query(RoadmapProgress)
            .filter(
                RoadmapProgress.user_id == user.id,
                RoadmapProgress.roadmap_key == key,
            )
            .all()
        )
        completed_steps = sum(1 for r in progress_rows if r.completed)

        score = jaccard_score(user_skills, list(job.required_skills or [])) if user_skills else None

        result.append(
            BookmarkedJobOut(
                job_id=job.id,
                title=job.title,
                company=job.company,
                location=job.location,
                is_remote=job.is_remote,
                total_steps=total_steps,
                completed_steps=completed_steps,
                match_score=score,
                salary=job.salary,
                min_education=job.min_education,
                min_experience=job.min_experience,
                work_type=job.work_type,
            )
        )

    # Urutkan: progress paling banyak dulu, lalu match score
    result.sort(key=lambda x: (x.completed_steps, x.match_score or 0), reverse=True)
    return result


@router.get("/roadmap/quiz")
def get_roadmap_step_quiz(
    step_index: int = Query(..., description="Index langkah roadmap"),
    job_id: UUID | None = Query(default=None, description="UUID job target."),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate dynamic 3-question quiz for a specific roadmap step using Gemini AI.
    """
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).first()
    if not profile or not profile.roadmap_cached:
        raise HTTPException(400, "Silakan buat roadmap terlebih dahulu.")

    cached_all = profile.roadmap_cached or {}
    cache_key = str(job_id) if job_id else "_generic"

    # Backward compat: format lama (top-level "steps") hanya berlaku untuk
    # roadmap generic — jangan dipakai saat request per-job walau key job absen
    if cache_key == "_generic" and "_generic" not in cached_all and "steps" in cached_all:
        raw_steps = cached_all.get("steps") or []
    else:
        entry = cached_all.get(cache_key, {})
        raw_steps = entry.get("steps") or []

    if not raw_steps or step_index < 0 or step_index >= len(raw_steps):
        raise HTTPException(400, "Langkah roadmap tidak valid atau belum digenerate.")

    step = raw_steps[step_index]
    step_title = step.get("title", f"Langkah {step_index + 1}")
    step_description = step.get("description", "")

    from app.services.gemini_service import generate_step_quiz
    quiz = generate_step_quiz(step_title, step_description)
    if not quiz:
        raise HTTPException(502, "Gagal men-generate kuis dengan AI. Silakan coba lagi.")

    return {"quiz": quiz}


@router.get("/roadmap", response_model=RoadmapOut)
def get_roadmap(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    job_id: UUID | None = Query(default=None, description="UUID job target. Kosongkan untuk roadmap generik."),
):
    """
    Generate roadmap belajar.
    - Tanpa job_id: roadmap generik berdasarkan gap vs lowongan relevan (filter by interests jika ada)
    - Dengan job_id: roadmap spesifik untuk lowongan yang dipilih
    """
    # Untuk roadmap generik: scope IDENTIK dengan /me/skill-gap agar prioritas
    # belajar di kedua halaman tidak pernah berbeda definisi (dan job tutup
    # tidak ikut membentuk gap).
    effective_jobs = None
    if not job_id:
        profile_for_scope = db.query(CandidateProfile).filter(
            CandidateProfile.user_id == user.id
        ).first()
        interests = list(profile_for_scope.interests or []) if profile_for_scope else []
        effective_jobs = resolve_market_scope(db, interests, "auto").jobs

    try:
        fp, steps_raw, _cached = roadmap_service.ensure_roadmap_generated(
            db, user, job_id=job_id, effective_jobs=effective_jobs
        )
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    except Exception as e:
        raise HTTPException(502, f"Terjadi kesalahan saat membuat roadmap: {e!s}") from e

    cache_key = str(job_id) if job_id else "_generic"

    progress_rows = (
        db.query(RoadmapProgress)
        .filter(
            RoadmapProgress.user_id == user.id,
            RoadmapProgress.roadmap_key == cache_key,
        )
        .all()
    )
    done = {r.step_index: r.completed for r in progress_rows}

    steps: list[RoadmapStepOut] = []
    for i, item in enumerate(steps_raw):
        title = item.get("title", f"Langkah {i+1}")
        desc = item.get("description", "")
        resources = item.get("resources", [])
        target = item.get("target", "")
        steps.append(
            RoadmapStepOut(
                index=i,
                title=title if isinstance(title, str) else str(title),
                description=desc if isinstance(desc, str) else "",
                resources=resources if isinstance(resources, list) else [],
                target=target if isinstance(target, str) else "",
                completed=done.get(i, False),
            )
        )

    # Ambil info job target jika ada
    job_title = None
    job_company = None
    if job_id:
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job_title = job.title
            job_company = job.company

    return RoadmapOut(
        fingerprint=fp,
        steps=steps,
        job_id=job_id,
        job_title=job_title,
        job_company=job_company,
    )


@router.patch("/roadmap/steps/{step_index}", response_model=RoadmapStepOut)
def patch_roadmap_step(
    step_index: int,
    body: RoadmapStepPatch,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    job_id: UUID | None = Query(default=None, description="UUID job target."),
):
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).first()
    if not profile or not profile.roadmap_cached:
        raise HTTPException(400, "Silakan buat roadmap terlebih dahulu dengan membuka halaman roadmap")

    # Ambil steps dari cache key yang sesuai (per-job atau generic)
    cached_all = profile.roadmap_cached or {}
    cache_key = str(job_id) if job_id else "_generic"

    # Backward compat: format lama (top-level "steps") hanya berlaku untuk
    # roadmap generic — jangan dipakai saat request per-job walau key job absen
    if cache_key == "_generic" and "_generic" not in cached_all and "steps" in cached_all:
        raw_steps = cached_all.get("steps") or []
    else:
        entry = cached_all.get(cache_key, {})
        raw_steps = entry.get("steps") or []

    if not raw_steps:
        raise HTTPException(400, "Roadmap belum pernah digenerate untuk lowongan ini.")

    if step_index < 0 or step_index >= len(raw_steps):
        raise HTTPException(400, "Indeks langkah roadmap tidak valid")

    row = (
        db.query(RoadmapProgress)
        .filter(
            RoadmapProgress.user_id == user.id,
            RoadmapProgress.roadmap_key == cache_key,
            RoadmapProgress.step_index == step_index,
        )
        .first()
    )
    if not row:
        row = RoadmapProgress(
            user_id=user.id,
            roadmap_key=cache_key,
            step_index=step_index,
            completed=body.completed,
        )
        db.add(row)
    else:
        row.completed = body.completed
    db.commit()

    item = raw_steps[step_index]
    title = item.get("title", "")
    desc = item.get("description", "")
    resources = item.get("resources", [])
    target = item.get("target", "")
    return RoadmapStepOut(
        index=step_index,
        title=title if isinstance(title, str) else str(title),
        description=desc if isinstance(desc, str) else "",
        resources=resources if isinstance(resources, list) else [],
        target=target if isinstance(target, str) else "",
        completed=body.completed,
    )


@router.delete("/roadmap/cache")
def clear_roadmap_cache(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    job_id: UUID | None = Query(default=None, description="UUID job yang ingin dihapus. Kosongkan untuk hapus semua."),
):
    """
    Hapus cache roadmap:
    - Tanpa job_id: hapus SEMUA roadmap + progress (full reset)
    - Dengan job_id: hapus hanya roadmap + progress untuk job tersebut (unbookmark)
    """
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).first()
    if not profile:
        return {"ok": True, "pesan": "Profil tidak ditemukan."}

    if job_id:
        # Hapus hanya 1 job dari cache
        cache_key = str(job_id)
        cached_all = dict(profile.roadmap_cached or {})
        removed = cache_key in cached_all
        cached_all.pop(cache_key, None)
        profile.roadmap_cached = cached_all if cached_all else None

        # Hapus progress hanya untuk job ini
        db.query(RoadmapProgress).filter(
            RoadmapProgress.user_id == user.id,
            RoadmapProgress.roadmap_key == cache_key,
        ).delete()
        db.commit()
        return {
            "ok": True,
            "removed": removed,
            "pesan": f"Bookmark job {job_id} berhasil dihapus." if removed else "Job tidak ditemukan di bookmark.",
        }
    else:
        # Full reset
        profile.roadmap_cached = None
        profile.roadmap_fingerprint = None
        db.query(RoadmapProgress).filter(RoadmapProgress.user_id == user.id).delete()
        db.commit()
        return {"ok": True, "pesan": "Semua roadmap berhasil dihapus. Buka halaman roadmap untuk generate ulang."}


@router.put("/profile/cv-data")
def update_cv_data(
    payload: CVDataSchema,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).first()
    if not profile:
        profile = CandidateProfile(user_id=user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    # Targeted UPDATE — jangan set via ORM object lalu commit,
    # agar JSON columns lain (roadmap_cached, dll) tidak ikut ter-flush dari snapshot lama
    cv_data = payload.model_dump(exclude_none=True)
    db.execute(
        sa_update(CandidateProfile)
        .where(CandidateProfile.user_id == user.id)
        .values(cv_data=cv_data)
    )
    db.commit()
    return {"status": "success", "cv_data": cv_data}
