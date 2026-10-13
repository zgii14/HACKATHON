"""Webhook dari layanan pihak ketiga (saat ini: Clerk via Svix)."""
import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import CandidateProfile, User
from app.services.clerk_client import verified_github_id
from app.services.github_identity import revoke_github
from app.services.svix_verify import verify

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
logger = logging.getLogger(__name__)


@router.post("/clerk")
async def clerk_webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    headers = {key.lower(): value for key, value in request.headers.items()}
    if not verify(settings.clerk_webhook_secret, headers, body):
        logger.warning("clerk_webhook rejected reason=signature")
        raise HTTPException(401, "invalid signature")

    try:
        event = json.loads(body or b"{}")
    except ValueError:
        raise HTTPException(400, "invalid payload") from None
    if event.get("type") != "user.updated":
        return {"ok": True}

    data = event.get("data") or {}
    user = db.query(User).filter(User.clerk_user_id == data.get("id")).first()
    if not user:
        return {"ok": True}
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).first()
    # Cabut verifikasi kalau GitHub yang terhubung diputus atau diganti di Clerk.
    if profile and profile.github_user_id is not None and verified_github_id(data) != profile.github_user_id:
        revoke_github(db, profile)
    return {"ok": True}
