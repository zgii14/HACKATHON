import logging
import time
from contextlib import asynccontextmanager

from fastapi import Body, Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import text

from app.config import settings
from app.database import Base, engine
from app.routers import jobs, me, profiles, recruiter
from app.routers import applications
from app.seed import reseed_jobs, seed_jobs_if_empty
from app.database import get_db
from app.services import scraper_service
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
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
            EXCEPTION WHEN duplicate_table THEN NULL;
            END $$;
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
            INSERT INTO jobs (id, title, company, description, required_skills, location, is_remote, recruiter_id)
            VALUES ('{job_id}', 'Senior React Developer', 'GitHire Enterprise', 'We are looking for a Senior React Developer with deep knowledge in TypeScript and State Management.', '["React", "TypeScript", "Tailwind CSS", "Redux"]', 'Bengkulu, Indonesia', TRUE, '{recruiter_id}')
            ON CONFLICT (id) DO NOTHING;
        """))
        conn.commit()

    db = Session(bind=engine)
    try:
        seed_jobs_if_empty(db)
    finally:
        db.close()
    yield


app = FastAPI(title="GitHire API", version="0.1.0", lifespan=lifespan)

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(me.router)
app.include_router(profiles.router)
app.include_router(jobs.router)
app.include_router(applications.router)
app.include_router(recruiter.router)


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
