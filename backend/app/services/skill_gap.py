"""Perhitungan skill gap murni — tanpa DB, tanpa Pydantic, mudah dites.

Kontrak penilaian: kesiapan dihitung PER JOB (coverage requirement), bukan
terhadap union semua skill pasar. Kandidat tidak dihukum karena tidak
menguasai stack alternatif yang tidak diminta job relevannya.
"""

from __future__ import annotations

from dataclasses import dataclass
from statistics import median

from app.services.matching import normalize_skill

READY_THRESHOLD = 0.70


@dataclass(frozen=True)
class DemandItem:
    canonical: str
    label: str
    job_count: int


@dataclass(frozen=True)
class Readiness:
    ready_jobs: int
    relevant_jobs: int
    median_coverage_pct: int
    threshold_pct: int


def canonical_set(skills) -> set[str]:
    """Ubah daftar skill mentah menjadi himpunan nama kanonik."""
    out: set[str] = set()
    for raw in skills or []:
        if isinstance(raw, str) and raw.strip():
            out.add(normalize_skill(raw))
    return out


def aggregate_demand(jobs) -> dict[str, DemandItem]:
    """Hitung berapa JOB yang meminta tiap skill kanonik.

    Alias digabung ("nodejs" + "Node.js" -> satu entri) supaya demand tidak
    terpecah dan jumlah skill pasar tidak menggelembung.
    """
    counts: dict[str, int] = {}
    raw_votes: dict[str, dict[str, int]] = {}
    for job in jobs:
        seen: set[str] = set()
        for raw in (getattr(job, "required_skills", None) or []):
            if not isinstance(raw, str) or not raw.strip():
                continue
            canon = normalize_skill(raw)
            label = raw.strip()
            votes = raw_votes.setdefault(canon, {})
            votes[label] = votes.get(label, 0) + 1
            if canon not in seen:
                seen.add(canon)
                counts[canon] = counts.get(canon, 0) + 1

    demand: dict[str, DemandItem] = {}
    for canon, count in counts.items():
        label = sorted(raw_votes[canon].items(), key=lambda kv: (-kv[1], kv[0]))[0][0]
        demand[canon] = DemandItem(canonical=canon, label=label, job_count=count)
    return demand


def job_coverage(user_canon: set[str], required) -> float | None:
    """Rasio requirement job yang dipenuhi. None = job tanpa requirement (tak bermakna)."""
    req = canonical_set(required)
    if not req:
        return None
    return len(user_canon & req) / len(req)


def compute_readiness(user_canon: set[str], jobs, threshold: float = READY_THRESHOLD) -> Readiness:
    """Ringkas kesiapan: berapa job yang requirement-nya terpenuhi >= threshold."""
    covs = [
        c
        for c in (job_coverage(user_canon, getattr(j, "required_skills", None)) for j in jobs)
        if c is not None
    ]
    threshold_pct = int(round(threshold * 100))
    if not covs:
        return Readiness(0, 0, 0, threshold_pct)
    return Readiness(
        ready_jobs=sum(1 for c in covs if c >= threshold),
        relevant_jobs=len(covs),
        median_coverage_pct=round(median(covs) * 100),
        threshold_pct=threshold_pct,
    )


def split_gap(
    user_canon: set[str],
    github_canon: set[str],
    demand: dict[str, DemandItem],
) -> tuple[list[DemandItem], list[DemandItem]]:
    """Pisahkan skill pasar jadi (belum dimiliki, dimiliki tapi tanpa bukti GitHub).

    Kedua list disjoint by construction — UI harus menampilkannya di seksi berbeda.
    Jangan pernah menandai item "missing" dengan badge unverified: mustahil terjadi.
    """
    missing: list[DemandItem] = []
    unproven: list[DemandItem] = []
    for item in sorted(demand.values(), key=lambda d: (-d.job_count, d.canonical)):
        if item.canonical not in user_canon:
            missing.append(item)
        elif item.canonical not in github_canon:
            unproven.append(item)
    return missing, unproven
