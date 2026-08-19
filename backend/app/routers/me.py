from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import update as sa_update
from sqlalchemy.orm import Session

from app.auth import get_current_user, is_recruiter_email
from app.database import get_db
from app.models import CandidateProfile, Job, RoadmapProgress, User
from app.services.cv_pdf import render_cv_pdf
from app.schemas import (
    BookmarkedJobOut,
    BioDataOut,
    BioDataPatch,
    CVDataSchema,
    InterestsPatch,
    ProfileOut,
    RoadmapOut,
    RoadmapStepOut,
    RoadmapStepPatch,
    RoleUpdate,
    CVPreferenceUpdate,
    SkillGapOut,
    UserOut,
)
from app.services import roadmap_service
from app.services.matching import jaccard_score, normalize_skill

router = APIRouter(prefix="/me", tags=["me"])

# ── Mapping: bidang minat → canonical skill keywords ─────────────────────────
INTEREST_SKILL_MAP: dict[str, set[str]] = {
    "backend":    {"python", "fastapi", "django", "flask", "node.js", "go", "java",
                   "spring boot", "php", "laravel", "rust", "rest api", "graphql",
                   "grpc", "microservices", "rabbitmq", "kafka"},
    "frontend":   {"javascript", "typescript", "react", "vue", "angular", "next.js",
                   "nuxt.js", "svelte", "html", "css", "tailwind css", "vite"},
    "fullstack":  {"javascript", "typescript", "react", "node.js", "postgresql",
                   "mongodb", "rest api", "docker", "python"},
    "mobile":     {"flutter", "dart", "react native", "kotlin", "android", "swift",
                   "ios", "firebase"},
    "ai_ml":      {"machine learning", "deep learning", "tensorflow", "pytorch",
                   "scikit-learn", "nlp", "computer vision", "pandas",
                   "hugging face", "llm", "generative ai"},
    "data":       {"sql", "pandas", "apache spark", "bigquery", "dbt", "airflow",
                   "power bi", "tableau", "data warehouse", "etl", "postgresql"},
    "devops":     {"docker", "kubernetes", "aws", "gcp", "azure", "terraform",
                   "linux", "ci/cd", "bash", "nginx", "prometheus", "grafana"},
    "qa":         {"selenium", "playwright", "jest", "postman", "cypress",
                   "pytest", "rest api", "testing", "jmeter"},
    "security":   {"linux", "bash", "networking", "penetration testing",
                   "siem", "cybersecurity", "firewall"},
    "blockchain": {"solidity", "web3.js", "ethers.js", "hardhat", "smart contract"},
    "game":       {"unity", "c#", "unreal", "ar kit", "opengl"},
    "iot":        {"c", "c++", "mqtt", "embedded"},
}


def _get_interest_skills(interests: list[str]) -> set[str]:
    """Gabungkan semua skill dari kategori minat yang dipilih user."""
    result: set[str] = set()
    for cat in interests:
        result.update(INTEREST_SKILL_MAP.get(cat, set()))
    return result


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
        raise HTTPException(403, "Akun ini belum terdaftar sebagai recruiter.")
    user.role = body.role
    db.commit()
    db.refresh(user)
    return user


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
def read_profile(user: User = Depends(get_current_user)):
    p = user.profile
    if not p:
        # Kembalikan role saja walau profil belum diisi (untuk recruiter yang baru login)
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
        )
    # Inject role dari User ke response ProfileOut
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
    mode: str = Query(default="auto", description="'auto' (interests jika ada), 'interests', atau 'all'"),
):
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).first()
    if not profile or not profile.merged_skills:
        return SkillGapOut(missing_skills=[], has_profile=False)

    all_jobs = db.query(Job).all()

    # ── Tentukan mode efektif ─────────────────────────────────────────────
    user_interests: list[str] = list(profile.interests or [])
    has_interests = bool(user_interests)
    effective_mode = mode
    if mode == "auto":
        effective_mode = "interests" if has_interests else "all"

    # ── Filter job berdasarkan minat (jika mode=interests) ────────────────
    if effective_mode == "interests" and has_interests:
        interest_skills = _get_interest_skills(user_interests)
        effective_jobs = [
            job for job in all_jobs
            if {normalize_skill(s) for s in (job.required_skills or [])} & interest_skills
        ]
        if not effective_jobs:          # fallback jika tidak ada job yang cocok
            effective_jobs = all_jobs
            effective_mode = "all"
    else:
        effective_jobs = all_jobs
        effective_mode = "all"

    # ── Hitung frekuensi skill dari job yang efektif ───────────────────────
    skill_freq: dict[str, int] = {}
    for job in effective_jobs:
        for s in (job.required_skills or []):
            key = s.strip().lower()
            skill_freq[key] = skill_freq.get(key, 0) + 1

    # ── Klasifikasi skill user berdasarkan sumber ──────────────────────────
    STRONG_BYTES_THRESHOLD = 3000  # bytes di GitHub → dianggap skill "kuat"

    gh_signals = profile.github_signals or {}
    
    _langs_raw = gh_signals.get("languages")
    gh_langs: dict[str, int] = _langs_raw if isinstance(_langs_raw, dict) else {}
    
    _topics_raw = gh_signals.get("topics")
    gh_topics: list[str] = _topics_raw if isinstance(_topics_raw, list) else []

    # Deteksi format data lama vs baru:
    # - Format lama: nilai = jumlah repo ({"Python": 3, "JavaScript": 1}) → max ~100
    # - Format baru: nilai = byte count  ({"Python": 82000, ...})          → max ribuan
    # Jika max value < 1000 → kemungkinan format lama → skip threshold "strong"
    max_lang_value = max(gh_langs.values()) if gh_langs else 0
    is_bytes_format = max_lang_value >= 1000

    # Normalisasi nama bahasa GitHub ke lowercase (untuk perbandingan)
    gh_strong: set[str] = set()   # GitHub language dengan banyak kode (hanya format baru)
    gh_all: set[str] = set()      # Semua skill yang ada bukti GitHub-nya

    for lang, value in gh_langs.items():
        norm = lang.strip().lower()
        gh_all.add(norm)
        # Hanya klasifikasikan "strong" jika data dalam format bytes
        if is_bytes_format and value >= STRONG_BYTES_THRESHOLD:
            gh_strong.add(norm)
        elif not is_bytes_format:
            # Format lama: tidak bisa tahu "seberapa kuat", anggap semua moderate
            # (tidak masukkan ke gh_strong, tapi tetap gh_all = terbukti di GitHub)
            pass

    for topic in gh_topics:
        gh_all.add(topic.strip().lower().replace("-", " "))

    # Normalisasi menggunakan SKILL_ALIASES agar alias diperhitungkan ("js" → "javascript")

    # Set skill yang ada bukti GitHub (normalized)
    gh_all_norm: set[str] = {normalize_skill(s) for s in gh_all}

    # Skill user yang TIDAK ada di GitHub sama sekali → "cv_only"
    # Hitung dari set ternormalisasi agar duplikat case-variant tidak menggelembungkan angka
    merged_norm: set[str] = {normalize_skill(s) for s in profile.merged_skills}
    cv_only_norm: set[str] = {norm for norm in merged_norm if norm not in gh_all_norm}

    github_backed_count = len(merged_norm) - len(cv_only_norm)

    # Skill dengan bukti commit. Berbeda dari github_backed_count di atas yang
    # hanya mencocokkan nama skill dengan bahasa/topics GitHub.
    verified_skills: list = profile.verified_skills or []

    # ── Missing skills: skill job yang user tidak punya sama sekali ────────
    user_skills = {normalize_skill(s) for s in profile.merged_skills}
    missing_with_freq = [
        {"skill": s, "job_count": count}
        for s, count in skill_freq.items()
        if normalize_skill(s) not in user_skills
    ]
    missing_with_freq.sort(key=lambda x: x["job_count"], reverse=True)
    missing_skills = [item["skill"] for item in missing_with_freq[:15]]

    # ── Weak skills: CV-only skills yang dibutuhkan setidaknya 1 job ───────
    # Ini bukan "missing" tapi "perlu diperdalam" — ada klaim tapi belum terbukti di GitHub
    weak_with_freq = [
        {"skill": s, "job_count": count}
        for s, count in skill_freq.items()
        if normalize_skill(s) in cv_only_norm  # user punya (dari CV) tapi tidak ada di GitHub
    ]
    weak_with_freq.sort(key=lambda x: x["job_count"], reverse=True)
    weak_skills = [item["skill"] for item in weak_with_freq]

    return SkillGapOut(
        missing_skills=missing_skills,
        has_profile=True,
        skill_freq=[{"skill": item["skill"], "job_count": item["job_count"]} for item in missing_with_freq[:10]],
        user_skill_count=len(user_skills),
        total_job_skills=len(skill_freq),
        weak_skills=weak_skills,
        github_backed_count=github_backed_count,
        verified_skill_count=len(verified_skills),
        verified_skills=verified_skills,
        mode=effective_mode,
        interests=user_interests,
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
    # Untuk roadmap generik: filter job berdasarkan minat user agar konsisten dengan skill-gap page.
    # Per-job roadmap tidak perlu filter ini.
    effective_jobs = None
    if not job_id:
        profile_for_interests = db.query(CandidateProfile).filter(
            CandidateProfile.user_id == user.id
        ).first()
        if profile_for_interests:
            user_interests = list(profile_for_interests.interests or [])
            if user_interests:
                all_jobs = db.query(Job).all()
                interest_skills = _get_interest_skills(user_interests)
                filtered = [
                    j for j in all_jobs
                    if {normalize_skill(s) for s in (j.required_skills or [])} & interest_skills
                ]
                effective_jobs = filtered if filtered else all_jobs

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
