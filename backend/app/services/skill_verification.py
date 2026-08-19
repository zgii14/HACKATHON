"""
Verifikasi skill berbasis bukti commit di repository GitHub.

Modul ini murni: tanpa HTTP, database, atau environment. Semua perhitungan
deterministik untuk `as_of` yang sama sehingga mudah dites dan hasilnya bisa
dipertanggungjawabkan ke recruiter.

Prinsip anti-cheat: repo hanya menjadi bukti kalau benar-benar dibangun oleh
user. Fork, repo kosong, repo hasil dump sekali upload, dan repo yang jumlah
commit-nya gagal diambil semuanya berbobot 0 — tidak pernah menghasilkan
skill terverifikasi.
"""

from __future__ import annotations

import math
from datetime import datetime, timezone

# Half-life recency: skill yang tidak dipakai 12 bulan bobotnya tinggal separuh
HALF_LIFE_MONTHS = 12
# Repo dengan commit milik user di bawah ini dianggap bukan bukti kepemilikan
MIN_OWN_COMMITS = 3
AUTH_VOLUME_WEIGHT = 0.6
AUTH_SPAN_WEIGHT = 0.4
REPO_COUNT_WEIGHT = 0.15
EXTERNAL_WEIGHT = 0.1
MAHIR_SCORE_THRESHOLD = 12.0
MENENGAH_SCORE_THRESHOLD = 5.0
MAHIR_MIN_REPOS = 3
MAHIR_MAX_AGE_MONTHS = 12
REPO_COUNT_AUTHENTICITY_THRESHOLD = 0.3

# GitHub Linguist ikut menghitung file build/config sebagai "bahasa". Entri di
# bawah bukan skill yang dicari recruiter, jadi disaring agar daftar terverifikasi
# tetap kredibel. Sengaja konservatif — hanya artefak build/config dan salah
# deteksi yang sering muncul. Bahasa/markup asli (Dockerfile, SCSS, Blade,
# Jupyter Notebook, HTML, CSS) TETAP dihitung karena memang bukti skill nyata.
NON_SKILL_LANGUAGES = frozenset(
    {
        # Manifest / build artifact
        "procfile",
        "batchfile",
        "makefile",
        "cmake",
        "dotenv",
        "editorconfig",
        "git attributes",
        "git config",
        "ignore list",
        "gitignore",
        # Dokumentasi / teks, bukan kode
        "roff",
        "roff manpage",
        "text",
        "shell session",
        # Sering salah deteksi di repo PHP/Laravel — PHP-nya sendiri sudah terhitung
        "hack",
    }
)

# Referensi saturasi untuk log-scaling (diminishing returns)
_COMMIT_SATURATION = 50
_STARS_SATURATION = 100
_SPAN_SATURATION_DAYS = 30
_DAYS_PER_MONTH = 30.44
# Recency saat tanggal repo tidak terbaca: anggap satu half-life (konservatif,
# dan otomatis menggugurkan syarat "mahir" karena umur tidak terverifikasi)
_UNKNOWN_RECENCY = 0.5


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _parse_dt(value) -> datetime | None:
    """Parse timestamp ISO GitHub menjadi datetime UTC. None kalau tidak valid."""
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if not isinstance(value, str) or not value.strip():
        return None
    raw = value.strip()
    if raw.endswith("Z"):
        raw = raw[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(raw)
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _as_positive_int(value) -> int | None:
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        return None
    return value


def compute_repo_authenticity(repo: dict) -> float:
    """
    Bobot keaslian sebuah repo dalam rentang 0..1.

    Nilai 0 berarti repo tidak boleh dipakai sebagai bukti skill sama sekali.
    """
    if not isinstance(repo, dict):
        return 0.0
    if repo.get("fork"):
        return 0.0
    # Jumlah commit tidak berhasil diambil → tidak ada bukti, bukan tebakan
    if repo.get("commit_source") == "fallback":
        return 0.0

    own_commits = repo.get("own_commits")
    if isinstance(own_commits, bool) or not isinstance(own_commits, int):
        return 0.0
    if own_commits < MIN_OWN_COMMITS:
        return 0.0

    size = repo.get("size")
    if isinstance(size, bool) or not isinstance(size, (int, float)) or size <= 0:
        return 0.0

    # Volume commit dengan diminishing returns
    volume = min(math.log1p(own_commits) / math.log1p(_COMMIT_SATURATION), 1.0)

    # Rentang waktu pembangunan repo — membedakan kerja bertahap dari dump sekali upload
    created = _parse_dt(repo.get("created_at"))
    pushed = _parse_dt(repo.get("pushed_at"))
    if created is None or pushed is None:
        span = 0.0
    else:
        span = _clamp((pushed - created).days / _SPAN_SATURATION_DAYS, 0.0, 1.0)

    return AUTH_VOLUME_WEIGHT * volume + AUTH_SPAN_WEIGHT * span


def verify_skills(
    signals: dict | None,
    as_of: datetime | None = None,
) -> list[dict]:
    """
    Hasilkan daftar skill terverifikasi dari `github_signals`.

    Skill hanya diambil dari bahasa pemrograman pada `repos_detail`. Topics dan
    skill CV bersifat deklaratif dan sengaja tidak pernah masuk ke sini.
    Semua item yang dikembalikan berstatus verified=True.
    """
    if not isinstance(signals, dict):
        return []
    repos = signals.get("repos_detail")
    if not isinstance(repos, list) or not repos:
        return []

    now = as_of or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    # Akumulasi per bahasa (key = lowercase agar case-insensitive)
    acc: dict[str, dict] = {}

    for repo in repos:
        if not isinstance(repo, dict):
            continue
        weight = compute_repo_authenticity(repo)
        if weight <= 0:
            continue
        languages = repo.get("languages")
        if not isinstance(languages, dict):
            continue

        pushed = _parse_dt(repo.get("pushed_at"))
        own_commits = repo.get("own_commits")
        own_commits = own_commits if isinstance(own_commits, int) and not isinstance(own_commits, bool) else 0
        stars = repo.get("stars")
        stars = stars if isinstance(stars, int) and not isinstance(stars, bool) and stars > 0 else 0
        confidence = repo.get("confidence") if repo.get("confidence") in {"high", "low"} else "high"
        commit_source = repo.get("commit_source")
        commit_source = commit_source if isinstance(commit_source, str) and commit_source else "repo_commits"
        repo_name = repo.get("name")
        repo_url = repo.get("html_url")

        for lang, byte_count in languages.items():
            if not isinstance(lang, str) or not lang.strip():
                continue
            key = lang.strip().lower()
            if key in NON_SKILL_LANGUAGES:
                continue
            valid_bytes = _as_positive_int(byte_count)
            if valid_bytes is None:
                continue

            entry = acc.setdefault(
                key,
                {
                    "display": lang.strip(),
                    "weighted_bytes": 0.0,
                    "bytes": 0,
                    "repos": 0,
                    "repo_count": 0,
                    "own_commits": 0,
                    "stars": 0,
                    "last_used": None,
                    "repo_names": [],
                    "repo_urls": [],
                    "confidences": set(),
                    "commit_sources": set(),
                },
            )

            entry["weighted_bytes"] += valid_bytes * weight
            entry["bytes"] += valid_bytes
            entry["repos"] += 1
            entry["own_commits"] += own_commits
            entry["stars"] += stars
            if weight > REPO_COUNT_AUTHENTICITY_THRESHOLD:
                entry["repo_count"] += 1
            if pushed is not None and (entry["last_used"] is None or pushed > entry["last_used"]):
                entry["last_used"] = pushed
            if isinstance(repo_name, str) and repo_name and repo_name not in entry["repo_names"]:
                entry["repo_names"].append(repo_name)
            if isinstance(repo_url, str) and repo_url and repo_url not in entry["repo_urls"]:
                entry["repo_urls"].append(repo_url)
            entry["confidences"].add(confidence)
            entry["commit_sources"].add(commit_source)

    out: list[dict] = []
    for entry in acc.values():
        weighted_bytes = entry["weighted_bytes"]
        if weighted_bytes <= 0:
            continue

        last_used = entry["last_used"]
        if last_used is None:
            recency = _UNKNOWN_RECENCY
            age_months: float | None = None
            last_used_label: str | None = None
        else:
            age_months = max((now - last_used).total_seconds() / 86400 / _DAYS_PER_MONTH, 0.0)
            recency = 0.5 ** (age_months / HALF_LIFE_MONTHS)
            last_used_label = last_used.strftime("%Y-%m")

        repo_count = entry["repo_count"]
        external = min(math.log1p(entry["stars"]) / math.log1p(_STARS_SATURATION), 1.0)
        score = round(
            math.log1p(weighted_bytes)
            * recency
            * (1 + REPO_COUNT_WEIGHT * repo_count)
            * (1 + EXTERNAL_WEIGHT * external),
            2,
        )
        if score <= 0:
            continue

        if (
            score >= MAHIR_SCORE_THRESHOLD
            and repo_count >= MAHIR_MIN_REPOS
            and age_months is not None
            and age_months <= MAHIR_MAX_AGE_MONTHS
        ):
            level = "mahir"
        elif score >= MENENGAH_SCORE_THRESHOLD and repo_count >= 1:
            level = "menengah"
        else:
            level = "pemula"

        out.append(
            {
                "skill": entry["display"],
                "level": level,
                "verified": True,
                "score": score,
                "evidence": {
                    "repos": entry["repos"],
                    "bytes": entry["bytes"],
                    "last_used": last_used_label,
                    "own_commits": entry["own_commits"],
                    "confidence": "low" if "low" in entry["confidences"] else "high",
                    "commit_source": (
                        "fallback" if "fallback" in entry["commit_sources"] else "repo_commits"
                    ),
                    "repo_names": entry["repo_names"][:10],
                    "repo_urls": entry["repo_urls"][:10],
                },
            }
        )

    out.sort(key=lambda item: item["score"], reverse=True)
    return out
