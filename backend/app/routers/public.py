"""Endpoint publik tanpa login (dipakai landing page)."""
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Job

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
