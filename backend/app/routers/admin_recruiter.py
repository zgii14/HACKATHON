from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user, is_admin_email
from app.config import settings
from app.database import get_db
from app.models import Job, RecruiterProfile, User
from app.schemas import RecruiterRequestOut
from sqlalchemy import func

router = APIRouter(prefix="/admin", tags=["admin-recruiter"])


def _require_admin(user: User = Depends(get_current_user), x_admin_secret: str | None = Header(default=None)):
    # Allow via header secret OR admin email allowlist
    if settings.admin_secret and x_admin_secret == settings.admin_secret:
        return user
    if is_admin_email(user.email):
        return user
    raise HTTPException(403, "Hanya admin yang boleh mengakses.")


@router.get("/recruiter-requests", response_model=list[RecruiterRequestOut])
def list_requests(
    status: str | None = None,
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    q = db.query(RecruiterProfile, User).join(User, RecruiterProfile.user_id == User.id)
    if status:
        q = q.filter(RecruiterProfile.status == status)
    rows = q.order_by(RecruiterProfile.requested_at.desc()).all()
    out = []
    for rp, u in rows:
        dto = RecruiterRequestOut.model_validate(rp)
        dto.user_email = u.email
        out.append(dto)
    return out


@router.post("/recruiter-requests/{req_id}/approve", response_model=RecruiterRequestOut)
def approve_request(
    req_id: UUID,
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    rp = db.query(RecruiterProfile).filter(RecruiterProfile.id == req_id).first()
    if not rp:
        raise HTTPException(404, "Pengajuan tidak ditemukan.")
    if rp.status == "approved":
        raise HTTPException(400, "Sudah disetujui sebelumnya.")
    rp.status = "approved"
    rp.reviewed_at = datetime.utcnow()
    rp.reviewed_by = admin.email
    # Cap KTP beneran
    u = db.query(User).filter(User.id == rp.user_id).first()
    if u:
        u.role = "recruiter"
    db.commit()
    db.refresh(rp)
    dto = RecruiterRequestOut.model_validate(rp)
    dto.user_email = u.email if u else None
    return dto


@router.post("/recruiter-requests/{req_id}/reject", response_model=RecruiterRequestOut)
def reject_request(
    req_id: UUID,
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    rp = db.query(RecruiterProfile).filter(RecruiterProfile.id == req_id).first()
    if not rp:
        raise HTTPException(404, "Pengajuan tidak ditemukan.")
    if rp.status == "rejected":
        raise HTTPException(400, "Sudah ditolak sebelumnya.")
    rp.status = "rejected"
    rp.reviewed_at = datetime.utcnow()
    rp.reviewed_by = admin.email
    db.commit()
    db.refresh(rp)
    dto = RecruiterRequestOut.model_validate(rp)
    u = db.query(User).filter(User.id == rp.user_id).first()
    dto.user_email = u.email if u else None
    return dto


@router.get("/stats", response_model=dict)
def admin_stats(
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    pending = db.query(func.count(RecruiterProfile.id)).filter(RecruiterProfile.status == "pending").scalar() or 0
    approved = db.query(func.count(RecruiterProfile.id)).filter(RecruiterProfile.status == "approved").scalar() or 0
    total = db.query(func.count(RecruiterProfile.id)).scalar() or 0
    premium = db.query(func.count(User.id)).filter(User.is_premium.is_(True)).scalar() or 0
    total_jobs = db.query(func.count(Job.id)).scalar() or 0
    return {"pending": pending, "approved": approved, "total": total, "premium": premium, "total_jobs": total_jobs}


@router.get("/recruiters", response_model=list[RecruiterRequestOut])
def list_recruiters(
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    rows = db.query(RecruiterProfile, User).join(User, RecruiterProfile.user_id == User.id).filter(RecruiterProfile.status == "approved").order_by(RecruiterProfile.reviewed_at.desc()).all()
    out = []
    for rp, u in rows:
        dto = RecruiterRequestOut.model_validate(rp)
        dto.user_email = u.email
        out.append(dto)
    return out


@router.get("/recruiter-profiles/{req_id}", response_model=dict)
def recruiter_detail(
    req_id: UUID,
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    rp = db.query(RecruiterProfile).filter(RecruiterProfile.id == req_id).first()
    if not rp:
        raise HTTPException(404, "Pengajuan tidak ditemukan.")
    u = db.query(User).filter(User.id == rp.user_id).first()
    jobs = db.query(Job).filter(Job.recruiter_id == str(rp.user_id)).order_by(Job.title).all()
    dto = RecruiterRequestOut.model_validate(rp)
    dto.user_email = u.email if u else None
    return {
        "profile": dto.model_dump(),
        "user": {"id": str(u.id) if u else None, "email": u.email if u else None, "role": u.role if u else None, "is_premium": bool(getattr(u, "is_premium", False)) if u else False},
        "jobs": [{"id": str(j.id), "title": j.title, "company": j.company, "location": j.location} for j in jobs],
        "jobs_count": len(jobs),
    }
