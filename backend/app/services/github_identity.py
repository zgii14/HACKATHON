"""Identitas GitHub kandidat: status koneksi, connect via Clerk, dan pencabutan."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Literal

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import CandidateProfile, Portfolio, RoadmapProgress, User
from app.services.clerk_client import ClerkApiError, fetch_verified_github_id
from app.services.github_client import fetch_github_signals, fetch_login_by_id
from app.services.skill_verification import verify_skills

logger = logging.getLogger(__name__)

GithubConnection = Literal["verified", "legacy_unverified", "none"]
DUPLICATE_MESSAGE = "Akun GitHub ini sudah terhubung ke akun GitHire lain."


def connection_state(profile: CandidateProfile | None) -> GithubConnection:
    if profile is None:
        return "none"
    if profile.github_user_id is not None:
        return "verified"
    if profile.github_legacy_grandfathered and profile.github_username:
        return "legacy_unverified"
    return "none"


def skills_from_github(signals: dict | None) -> list[str]:
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


def merge_skills(gh: list[str], cv: list[str]) -> list[str]:
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


def apply_github_data(db: Session, profile: CandidateProfile, username: str | None, signals: dict | None) -> bool:
    """Tulis data GitHub + gabung ulang skill. Roadmap direset hanya jika skill berubah."""
    old = {s.lower() for s in (profile.merged_skills or [])}
    merged = merge_skills(skills_from_github(signals), profile.cv_skills or [])
    profile.github_username = username
    profile.github_signals = signals
    profile.merged_skills = merged
    # Lapisan bukti commit; tidak memengaruhi merged_skills maupun matching.
    profile.verified_skills = verify_skills(signals, as_of=datetime.now(timezone.utc)) if signals else []
    changed = old != {s.lower() for s in merged}
    if changed:
        profile.roadmap_cached = None
        profile.roadmap_fingerprint = None
        db.query(RoadmapProgress).filter(RoadmapProgress.user_id == profile.user_id).delete()
    return changed


def unpublish_portfolio(db: Session, user_id) -> bool:
    portfolio = db.query(Portfolio).filter(Portfolio.user_id == user_id).first()
    if portfolio and portfolio.status == "published":
        portfolio.status = "draft"
        return True
    return False


async def connect_github(db: Session, user: User, profile: CandidateProfile) -> CandidateProfile:
    """Hubungkan GitHub yang sudah diverifikasi Clerk. Username dari browser tidak dipakai."""
    try:
        github_id = await fetch_verified_github_id(user.clerk_user_id)
    except ClerkApiError as exc:
        logger.warning("github_connect result=error reason=clerk")
        raise HTTPException(503, "Layanan login sedang bermasalah. Coba lagi sebentar.") from exc
    if github_id is None:
        logger.info("github_connect result=not_connected")
        raise HTTPException(404, {"code": "GITHUB_NOT_CONNECTED", "message": "Akun GitHub belum terhubung. Hubungkan GitHub dulu."})

    owner = (
        db.query(CandidateProfile.id)
        .filter(CandidateProfile.github_user_id == github_id, CandidateProfile.id != profile.id)
        .first()
    )
    if owner:
        logger.info("github_connect result=duplicate")
        raise HTTPException(409, DUPLICATE_MESSAGE)

    login = await fetch_login_by_id(github_id)
    signals = await fetch_github_signals(login)

    # Ganti ke akun GitHub lain: portfolio publik lama tidak lagi mewakili akun ini.
    if profile.github_user_id is not None and profile.github_user_id != github_id:
        unpublish_portfolio(db, profile.user_id)
    profile.github_user_id = github_id
    profile.github_verified_at = datetime.now(timezone.utc)
    profile.github_legacy_grandfathered = False
    apply_github_data(db, profile, login, signals)
    profile.updated_at = datetime.utcnow()
    try:
        db.commit()
    except IntegrityError as exc:
        # Request paralel dari akun lain sempat menautkan ID yang sama.
        db.rollback()
        logger.info("github_connect result=duplicate race=1")
        raise HTTPException(409, DUPLICATE_MESSAGE) from exc
    db.refresh(profile)
    logger.info("github_connect result=success")
    return profile


def revoke_github(db: Session, profile: CandidateProfile) -> None:
    """Cabut verifikasi + data turunan GitHub (dipanggil saat GitHub diputus di Clerk)."""
    profile.github_user_id = None
    profile.github_verified_at = None
    profile.github_legacy_grandfathered = False
    apply_github_data(db, profile, None, None)
    unpublish_portfolio(db, profile.user_id)
    profile.updated_at = datetime.utcnow()
    db.commit()
    logger.info("github_revoke reason=webhook")
