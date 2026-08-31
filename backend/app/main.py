import logging
import time
from contextlib import asynccontextmanager

from fastapi import Body, Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import text

from app.auth import describe_admin_allowlist, describe_recruiter_allowlist
from app.config import settings
from app.database import Base, engine
from app.routers import admin_recruiter, chat, jobs, me, profiles, recruiter
from app.routers import applications
from app.seed import reseed_jobs, seed_jobs_if_empty
from app.database import get_db
from app.services import scraper_service
from app.services.job_category import backfill_job_categories
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Cetak kondisi allowlist recruiter di log startup. Kalau angkanya 1 entri,
    # berarti RECRUITER_EMAILS tidak sampai ke proses ini — bukan salah kode.
    logger.warning("[auth] %s", describe_recruiter_allowlist())
    logger.warning("[auth] %s", describe_admin_allowlist())

    # Retry DB connection — tunggu DB siap (max 5x, delay 2s)
    for attempt in range(1, 6):
        try:
            Base.metadata.create_all(bind=engine)
            break
        except Exception as e:
            if attempt == 5:
                logger.error("Database tidak tersedia setelah 5 percobaan: %s", e)
                raise
            logger.warning("DB belum siap (attempt %d/5): %s — retry dalam 2s...", attempt, e)
            time.sleep(2)

    # DDL Migration: tambah roadmap_key ke tabel roadmap_progress jika belum ada
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE candidate_profiles
            ADD COLUMN IF NOT EXISTS cv_data JSON NULL
        """))
        conn.execute(text("""
            ALTER TABLE roadmap_progress
            ADD COLUMN IF NOT EXISTS roadmap_key VARCHAR(64) NOT NULL DEFAULT '_generic'
        """))
        # Hapus constraint lama jika masih ada
        conn.execute(text("""
            ALTER TABLE roadmap_progress
            DROP CONSTRAINT IF EXISTS uq_user_step
        """))
        # Buat constraint baru (idempotent via DO block)
        conn.execute(text("""
            DO $$ BEGIN
                ALTER TABLE roadmap_progress
                ADD CONSTRAINT uq_user_roadmap_step
                UNIQUE (user_id, roadmap_key, step_index);
            EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
            END $$;
        """))
        conn.commit()

    # DDL Migration: kolom kuis server-authoritative + XP gamifikasi
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE roadmap_progress
            ADD COLUMN IF NOT EXISTS quiz_payload JSON NULL
        """))
        conn.execute(text("""
            ALTER TABLE roadmap_progress
            ADD COLUMN IF NOT EXISTS quiz_issued_at TIMESTAMPTZ NULL
        """))
        conn.execute(text("""
            ALTER TABLE roadmap_progress
            ADD COLUMN IF NOT EXISTS quiz_passed BOOLEAN NOT NULL DEFAULT FALSE
        """))
        conn.execute(text("""
            ALTER TABLE roadmap_progress
            ADD COLUMN IF NOT EXISTS quiz_attempts INTEGER NOT NULL DEFAULT 0
        """))
        conn.execute(text("""
            ALTER TABLE candidate_profiles
            ADD COLUMN IF NOT EXISTS total_xp INTEGER NOT NULL DEFAULT 0
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS xp_earnings (
                id UUID PRIMARY KEY,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                roadmap_key VARCHAR(64) NOT NULL DEFAULT '_generic',
                step_index INTEGER NOT NULL,
                fingerprint VARCHAR(32) NOT NULL,
                amount INTEGER NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS uq_xp_earning
            ON xp_earnings (user_id, roadmap_key, step_index, fingerprint)
        """))
        conn.commit()

    # DDL Migration: tambah kolom interests ke candidate_profiles
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE candidate_profiles
            ADD COLUMN IF NOT EXISTS interests JSONB
        """))
        conn.commit()

    # DDL Migration: tambah kolom apply_url ke tabel jobs
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE jobs
            ADD COLUMN IF NOT EXISTS apply_url VARCHAR(2048)
        """))
        conn.commit()

    # DDL Migration: kategori bidang job — sumber tunggal relevansi minat kandidat.
    # HARUS dijalankan sebelum INSERT demo job di bawah (INSERT menyebut kolom ini).
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE jobs
            ADD COLUMN IF NOT EXISTS categories JSONB
        """))
        conn.commit()

    # DDL Migration: tambah kolom bio data untuk surat lamaran
    with engine.connect() as conn:
        for col, col_type in [
            ("bio_full_name",  "VARCHAR(255)"),
            ("bio_birth_place","VARCHAR(255)"),
            ("bio_birth_date", "VARCHAR(100)"),
            ("bio_address",    "VARCHAR(500)"),
            ("bio_phone",      "VARCHAR(50)"),
        ]:
            conn.execute(text(f"""
                ALTER TABLE candidate_profiles
                ADD COLUMN IF NOT EXISTS {col} {col_type}
            """))
        conn.commit()

    # DDL Migration: tambah index untuk performa pencarian kandidat B2B
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_candidate_profiles_skills 
            ON candidate_profiles USING gin ((merged_skills::jsonb));
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_candidate_profiles_name 
            ON candidate_profiles (bio_full_name);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_candidate_profiles_address 
            ON candidate_profiles (bio_address);
        """))
        conn.commit()

    # DDL Migration: tambah kolom role ke users dan recruiter_id ke jobs, serta seed demo recruiter
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'candidate';
        """))
        conn.execute(text("""
            ALTER TABLE jobs
            ADD COLUMN IF NOT EXISTS recruiter_id VARCHAR(36) NULL;
        """))
        conn.commit()

        # Seed recruiter@githire.com demo user
        recruiter_id = "550e8400-e29b-41d4-a716-446655440000"
        conn.execute(text(f"""
            INSERT INTO users (id, clerk_user_id, email, role, created_at)
            VALUES ('{recruiter_id}', 'clerk_recruiter_demo', 'recruiter@githire.com', 'recruiter', CURRENT_TIMESTAMP)
            ON CONFLICT (clerk_user_id) DO UPDATE SET role = 'recruiter';
        """))

        # Seed a test job for this recruiter
        job_id = "550e8400-e29b-41d4-a716-446655440001"
        conn.execute(text(f"""
            INSERT INTO jobs (id, title, company, description, required_skills, categories, location, is_remote, recruiter_id)
            VALUES ('{job_id}', 'Senior React Developer', 'GitHire Enterprise', 'We are looking for a Senior React Developer with deep knowledge in TypeScript and State Management.', '["React", "TypeScript", "Tailwind CSS", "Redux"]', '["frontend"]', 'Bengkulu, Indonesia', TRUE, '{recruiter_id}')
            ON CONFLICT (id) DO NOTHING;
        """))
        conn.commit()

    # DDL Migration: tambah kolom cover_letter ke job_applications (cache surat lamaran)
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE job_applications
            ADD COLUMN IF NOT EXISTS cover_letter TEXT NULL
        """))
        conn.commit()

    # DDL Migration: tambah kolom cache AI screening ke job_applications
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE job_applications
            ADD COLUMN IF NOT EXISTS ai_screening JSON NULL
        """))
        conn.execute(text("""
            ALTER TABLE job_applications
            ADD COLUMN IF NOT EXISTS screening_fingerprint VARCHAR(64) NULL
        """))
        conn.commit()

    # DDL Migration: role boleh NULL (NULL = user belum pilih role → role picker)
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ALTER COLUMN role DROP NOT NULL"))
        conn.execute(text("ALTER TABLE users ALTER COLUMN role DROP DEFAULT"))
        conn.commit()

    # DDL Migration: simpan CV PDF asli + preferensi versi CV (form | original)
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS cv_file BYTEA NULL"))
        conn.execute(text("ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS cv_filename VARCHAR(255) NULL"))
        conn.execute(text("ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS cv_uploaded_at TIMESTAMPTZ NULL"))
        conn.execute(text("ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS cv_preference VARCHAR(10) NOT NULL DEFAULT 'form'"))
        conn.commit()

    # DDL Migration: skill terverifikasi dari bukti commit GitHub
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE candidate_profiles
            ADD COLUMN IF NOT EXISTS verified_skills JSON NULL
        """))
        conn.commit()

    # DDL Migration: recruiter_profiles untuk pendaftaran recruiter (hidden footer)
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS recruiter_profiles (
                id UUID PRIMARY KEY,
                user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                company_name VARCHAR(255) NOT NULL,
                company_website VARCHAR(255) NOT NULL,
                company_size VARCHAR(50) NOT NULL,
                industry VARCHAR(100) NOT NULL,
                wa_pic VARCHAR(50) NOT NULL,
                reason TEXT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                reviewed_at TIMESTAMPTZ NULL,
                reviewed_by VARCHAR(320) NULL
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_recruiter_profiles_status ON recruiter_profiles(status)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_recruiter_profiles_user ON recruiter_profiles(user_id)"))
        conn.commit()

    # DDL Migration: premium flag + chat tables
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE recruiter_profiles ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT FALSE"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS conversations (
                id UUID PRIMARY KEY,
                recruiter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                job_id UUID NULL REFERENCES jobs(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (recruiter_id, candidate_id, job_id)
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_conversations_recruiter ON conversations(recruiter_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_conversations_candidate ON conversations(candidate_id)"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS messages (
                id UUID PRIMARY KEY,
                conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                body TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)"))
        # Enrich messages for WhatsApp-like ticks & reply
        conn.execute(text("ALTER TABLE messages ADD COLUMN IF NOT EXISTS status VARCHAR(10) NOT NULL DEFAULT 'sent'"))
        conn.execute(text("ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id UUID NULL REFERENCES messages(id) ON DELETE SET NULL"))
        conn.commit()

    # DDL Migration: jobs is_closed + timestamps Fase 3
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_closed BOOLEAN NOT NULL DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP"))
        conn.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP"))
        conn.commit()

    # DDL Migration: screened_at for quota P1 #1
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS screened_at TIMESTAMPTZ NULL"))
        conn.commit()

    # DDL Migration: expires_at for chat TTL 4 hari
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NULL"))
        # backfill existing rows
        conn.execute(text("UPDATE conversations SET expires_at = created_at + INTERVAL '4 days' WHERE expires_at IS NULL"))
        conn.commit()

    db = Session(bind=engine)
    try:
        seed_jobs_if_empty(db)
        # Seed 5 dummy kandidat tambahan (real GitHub fetch via GITHUB_TOKEN, nama dummy)
        try:
            from app.seed_candidates import seed_candidates_if_empty
            seed_candidates_if_empty(db)
        except Exception as e:
            logger.warning("[seed] candidates seed fail: %s", e)

        # Backfill kategori untuk job lama (recruiter/scrape/seed versi lama).
        # Idempoten: hanya baris yang kategorinya belum terpakai.
        try:
            touched = backfill_job_categories(db)
            if touched:
                logger.warning("[migration] backfill kategori job: %d baris", touched)
        except Exception as e:
            db.rollback()
            logger.warning("[migration] backfill kategori gagal: %s", e)
    finally:
        db.close()
    yield


app = FastAPI(title="GitHire API", version="0.1.0", lifespan=lifespan)

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
# Regex origin: izinkan semua deployment/preview Vercel (URL berubah tiap deploy).
# Bisa dioverride via env CORS_ORIGIN_REGEX. Default: semua *.vercel.app + localhost.
cors_regex = settings.cors_origin_regex or r"https://.*\.vercel\.app|http://localhost:\d+"
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=cors_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(me.router)
app.include_router(profiles.router)
app.include_router(jobs.router)
app.include_router(applications.router)
app.include_router(recruiter.router)
app.include_router(admin_recruiter.router)
app.include_router(chat.router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/admin/reseed-jobs")
def admin_reseed(
    x_admin_secret: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    """Reset dan isi ulang data job dari seed statis (hanya untuk development/admin)."""
    admin_secret = settings.admin_secret
    if not admin_secret or x_admin_secret != admin_secret:
        raise HTTPException(status_code=403, detail="Forbidden: invalid or missing admin secret")
    total = reseed_jobs(db)
    return {"ok": True, "total_jobs": total, "pesan": f"{total} lowongan berhasil di-seed ulang"}


@app.post("/admin/reseed-candidates")
def admin_reseed_candidates(
    x_admin_secret: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    admin_secret = settings.admin_secret
    if not admin_secret or x_admin_secret != admin_secret:
        raise HTTPException(status_code=403, detail="Forbidden: invalid or missing admin secret")
    from app.seed_candidates import reseed_candidates
    total = reseed_candidates(db)
    return {"ok": True, "total_candidates": total, "pesan": f"{total} kandidat dummy berhasil di-seed ulang"}


class ScrapeRequest(BaseModel):
    keywords: list[str] | None = None
    max_per_keyword: int = 5


@app.post("/admin/scrape-jobs")
def admin_scrape(
    x_admin_secret: str | None = Header(default=None),
    body: ScrapeRequest = Body(default=ScrapeRequest()),
    db: Session = Depends(get_db),
):
    """
    Scrape lowongan kerja dari Glints dan simpan ke database.
    - Gunakan header X-Admin-Secret untuk autentikasi.
    - Opsional: kirim body JSON {"keywords": [...], "max_per_keyword": 5}
    - Proses berjalan sinkron, bisa memakan waktu 2-10 menit tergantung jumlah keyword.
    """
    admin_secret = settings.admin_secret
    if not admin_secret or x_admin_secret != admin_secret:
        raise HTTPException(status_code=403, detail="Forbidden: invalid or missing admin secret")

    result = scraper_service.run_scraping(
        db=db,
        keywords=body.keywords,
        max_per_keyword=body.max_per_keyword,
    )
    if not result.get("ok"):
        raise HTTPException(status_code=500, detail=result.get("error", "Scraping gagal"))

    return result
