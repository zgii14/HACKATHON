"""Sistem XP murni — perhitungan level/tier/progress tanpa DB.

XP didapat HANYA dari aksi server-verified:
- lulus kuis satu langkah roadmap = XP_REWARD_STEP
- menyelesaikan seluruh roadmap (semua langkah lulus) = bonus XP_REWARD_ROADMAP

Anti-farm dijamin oleh tabel xp_earnings (lihat grant_* di bawah), bukan di sini.
"""

from __future__ import annotations

XP_REWARD_STEP = 50
XP_REWARD_ROADMAP = 200
ROADMAP_BONUS_STEP_INDEX = -1  # penanda di xp_earnings untuk bonus roadmap

# Ambang kumulatif level 1..5; setelah level 5 tiap level naik +1500 XP.
LEVEL_THRESHOLDS = [0, 250, 750, 1500, 2500]
LEVEL_STEP_AFTER_MAX = 1500

TIER_RANGES: tuple[tuple[int, int | None, str], ...] = (
    (1, 2, "Pemula"),
    (3, 4, "Menengah"),
    (5, None, "Mahir"),
)


def _coerce(xp) -> int:
    try:
        return max(0, int(xp))
    except (TypeError, ValueError):
        return 0


def threshold_for_level(level: int) -> int:
    if level <= len(LEVEL_THRESHOLDS):
        return LEVEL_THRESHOLDS[level - 1]
    return LEVEL_THRESHOLDS[-1] + (level - len(LEVEL_THRESHOLDS)) * LEVEL_STEP_AFTER_MAX


def level_from_xp(xp) -> int:
    value = _coerce(xp)
    level = 1
    for i, threshold in enumerate(LEVEL_THRESHOLDS):
        if value >= threshold:
            level = i + 1
        else:
            break
    if value > LEVEL_THRESHOLDS[-1]:
        level += (value - LEVEL_THRESHOLDS[-1]) // LEVEL_STEP_AFTER_MAX
    return level


def tier_from_level(level: int) -> str:
    for lo, hi, name in TIER_RANGES:
        if level >= lo and (hi is None or level <= hi):
            return name
    return "Mahir"


def next_threshold(xp) -> int:
    value = _coerce(xp)
    if value < LEVEL_THRESHOLDS[-1]:
        for threshold in LEVEL_THRESHOLDS:
            if value < threshold:
                return threshold
        return LEVEL_THRESHOLDS[-1]
    base = LEVEL_THRESHOLDS[-1]
    return base + ((value - base) // LEVEL_STEP_AFTER_MAX + 1) * LEVEL_STEP_AFTER_MAX


def progress_pct(xp) -> int:
    value = _coerce(xp)
    level = level_from_xp(value)
    lo = threshold_for_level(level)
    hi = next_threshold(value)
    if hi <= lo:
        return 100
    return int((value - lo) / (hi - lo) * 100)


def xp_summary(total_xp) -> dict:
    value = _coerce(total_xp)
    level = level_from_xp(value)
    return {
        "total_xp": value,
        "level": level,
        "tier": tier_from_level(level),
        "next_threshold": next_threshold(value),
        "progress_pct": progress_pct(value),
    }


def grant_xp(
    db,
    user_id,
    roadmap_key: str,
    step_index: int,
    fingerprint: str,
    amount: int,
) -> bool:
    """Catat XP ke ledger + total user. Return False jika sudah pernah (anti-farm).

    Kunci unik (user_id, roadmap_key, step_index, fingerprint):
    - reset cache tanpa perubahan konten → fingerprint sama → TIDAK dapat ulang
    - konten berubah (skill/job baru) → fingerprint beda → wajar dapat ulang
    """
    from uuid import uuid4

    from sqlalchemy.orm.attributes import flag_modified

    from app.models import CandidateProfile, XpEarning

    existing = (
        db.query(XpEarning)
        .filter(
            XpEarning.user_id == user_id,
            XpEarning.roadmap_key == roadmap_key,
            XpEarning.step_index == step_index,
            XpEarning.fingerprint == fingerprint,
        )
        .first()
    )
    if existing:
        return False

    db.add(
        XpEarning(
            id=uuid4(),
            user_id=user_id,
            roadmap_key=roadmap_key,
            step_index=step_index,
            fingerprint=fingerprint,
            amount=amount,
        )
    )

    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user_id).first()
    if profile is None:
        profile = CandidateProfile(user_id=user_id, total_xp=amount)
        db.add(profile)
    else:
        profile.total_xp = (profile.total_xp or 0) + amount
        flag_modified(profile, "total_xp")
    db.commit()
    return True