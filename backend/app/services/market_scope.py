"""Penentu himpunan job yang dipakai sebagai "pasar" untuk skill-gap dan roadmap.

Satu-satunya tempat scope pasar ditentukan. Skill-gap dan roadmap generik WAJIB
memakai ini agar prioritas belajar keduanya tidak pernah berbeda definisi, dan
agar lowongan yang sudah ditutup tidak ikut membentuk "permintaan pasar".
"""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.models import Job

VALID_MODES = frozenset({"auto", "interests", "all"})


@dataclass(frozen=True)
class MarketScope:
    jobs: list
    requested_mode: str
    effective_mode: str
    fallback_reason: str | None   # None | "no_interests" | "no_matching_jobs"


def filter_by_categories(jobs, interests) -> list:
    """Job relevan = kategori eksplisitnya beririsan dengan minat user."""
    wanted = {i for i in (interests or []) if isinstance(i, str)}
    if not wanted:
        return []
    return [j for j in jobs if wanted & set(getattr(j, "categories", None) or [])]


def resolve_scope_from_jobs(active_jobs: list, interests, requested_mode: str = "auto") -> MarketScope:
    """Bagian murni: tentukan scope + alasan fallback tanpa menyentuh DB.

    Fallback TIDAK boleh senyap — UI harus bisa menjelaskan kenapa yang tampil
    adalah semua lowongan padahal user memilih "Bidangku".
    """
    mode = requested_mode if requested_mode in VALID_MODES else "auto"
    if mode == "all":
        return MarketScope(list(active_jobs), mode, "all", None)
    if not interests:
        return MarketScope(list(active_jobs), mode, "all", "no_interests")
    scoped = filter_by_categories(active_jobs, interests)
    if not scoped:
        return MarketScope(list(active_jobs), mode, "all", "no_matching_jobs")
    return MarketScope(scoped, mode, "interests", None)


def active_jobs(db: Session) -> list[Job]:
    """Lowongan tutup TIDAK boleh mempengaruhi analisis pasar."""
    return db.query(Job).filter(Job.is_closed == False).all()  # noqa: E712


def resolve_market_scope(db: Session, interests, requested_mode: str = "auto") -> MarketScope:
    return resolve_scope_from_jobs(active_jobs(db), interests, requested_mode)
