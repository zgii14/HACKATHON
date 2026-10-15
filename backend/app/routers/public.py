"""Endpoint publik tanpa login (landing page dan subdomain portfolio)."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Job, Portfolio, SubdomainHold
from app.services.subdomain import as_utc, normalize

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/jobs")
def list_open_jobs(limit: int = 5, db: Session = Depends(get_db)):
    """Lowongan yang sedang buka, terbaru dulu. Tanpa match score (butuh profil)."""
    limit = max(1, min(limit, 10))
    query = db.query(Job).filter(Job.is_closed == False)  # noqa: E712
    jobs = query.order_by(Job.created_at.desc()).limit(limit).all()
    body = {
        "total": query.count(),
        "items": [
            {
                "id": str(job.id),
                "title": job.title,
                "company": job.company,
                "location": job.location,
                "work_type": job.work_type,
                "is_remote": bool(job.is_remote),
            }
            for job in jobs
        ],
    }
    return JSONResponse(body, headers={"Cache-Control": "public, max-age=300"})


SUBDOMAIN_CACHE = {"Cache-Control": "public, max-age=60"}


@router.get("/subdomains/{name}")
def resolve_subdomain(name: str, db: Session = Depends(get_db)):
    """Petakan nama.githire.my.id ke portfolio publik, atau ke nama barunya bila sudah diganti."""
    name = normalize(name)
    portfolio = db.query(Portfolio).filter(Portfolio.subdomain == name).first()
    if portfolio:
        if portfolio.status == "published" and portfolio.published_content:
            return JSONResponse({"public_id": portfolio.public_id}, headers=SUBDOMAIN_CACHE)
    else:
        hold = db.get(SubdomainHold, name)
        if hold and as_utc(hold.expires_at) > datetime.now(timezone.utc):
            owner = db.get(Portfolio, hold.portfolio_id)
            if owner and owner.subdomain:
                return JSONResponse({"redirect_to": owner.subdomain}, headers=SUBDOMAIN_CACHE)
    return JSONResponse({"detail": "Alamat portfolio tidak ditemukan."}, status_code=404, headers=SUBDOMAIN_CACHE)
