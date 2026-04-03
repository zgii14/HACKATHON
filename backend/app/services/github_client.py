import re
from typing import Any

import httpx
from fastapi import HTTPException

from app.config import settings


def parse_github_username(url_or_user: str) -> str | None:
    """
    Parse username dari berbagai format input:
    - "octocat"
    - "https://github.com/octocat"
    - "github.com/octocat"
    """
    s = url_or_user.strip()
    if not s:
        return None

    # Input adalah username murni (hanya huruf, angka, dash)
    if re.match(r"^[\w-]+$", s) and "/" not in s:
        return s

    # Input berupa URL GitHub
    m = re.search(r"github\.com/([^/\s?#]+)", s, re.I)
    if m:
        candidate = m.group(1)
        # Abaikan path yang bukan username
        if candidate.lower() not in {"login", "orgs", "explore", "marketplace", "topics"}:
            return candidate

    return None


def _headers() -> dict[str, str]:
    h = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "GitHire/1.0",
    }
    if settings.github_token:
        h["Authorization"] = f"token {settings.github_token}"
    return h


async def fetch_github_signals(username: str) -> dict[str, Any]:
    """
    Ambil data sinyal dari GitHub (validasi + fetch sekaligus — 1 koneksi).

    Raise HTTPException dengan pesan user-friendly untuk:
    - 404: akun tidak ditemukan
    - 403: rate limit / access denied
    - timeout: GitHub tidak merespons
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        # ── Step 1: Fetch profil user (sekaligus validasi keberadaan akun) ──
        try:
            user_r = await client.get(
                f"https://api.github.com/users/{username}",
                headers=_headers(),
            )
        except httpx.TimeoutException:
            raise HTTPException(
                504,
                f"GitHub tidak merespons saat memvalidasi akun @{username}. Coba lagi sebentar."
            )
        except httpx.RequestError as e:
            raise HTTPException(502, f"Tidak bisa terhubung ke GitHub: {e}")

        # Handle response errors dengan pesan yang jelas
        if user_r.status_code == 404:
            raise HTTPException(
                400,
                f"Akun GitHub @{username} tidak ditemukan. "
                "Pastikan username atau URL yang kamu masukkan sudah benar."
            )
        if user_r.status_code == 403:
            raise HTTPException(
                429,
                "GitHub API rate limit tercapai. Coba lagi dalam beberapa menit."
            )
        if not user_r.is_success:
            raise HTTPException(
                502,
                f"GitHub mengembalikan error {user_r.status_code} "
                f"saat memvalidasi akun @{username}."
            )

        user_data = user_r.json()

        # ── Step 2: Fetch daftar repo ──
        repos_r = await client.get(
            f"https://api.github.com/users/{username}/repos",
            params={"per_page": 30, "sort": "updated"},
            headers=_headers(),
        )
        repos_r.raise_for_status()
        repos = repos_r.json()

        # ── Step 3: Fetch byte count per bahasa per repo (dalam koneksi yang sama) ──
        non_fork_repos = [r for r in repos if isinstance(r, dict) and not r.get("fork")]
        lang_responses: list[dict] = []
        for repo in non_fork_repos:
            langs_url = repo.get("languages_url", "")
            if not langs_url:
                continue
            try:
                r = await client.get(langs_url, headers=_headers())
                if r.is_success:
                    lang_responses.append(r.json())
            except Exception:
                pass  # skip repo yang gagal → bukan error kritis

    # ── Akumulasi byte count per bahasa ──
    # Format: {"Python": 82000, "JavaScript": 12000, ...}
    languages: dict[str, int] = {}
    for lang_data in lang_responses:
        if isinstance(lang_data, dict):
            for lang, byte_count in lang_data.items():
                if isinstance(lang, str) and isinstance(byte_count, int):
                    languages[lang] = languages.get(lang, 0) + byte_count

    # ── Kumpulkan topics dari semua repo ──
    topics: list[str] = []
    for repo in repos:
        if not isinstance(repo, dict):
            continue
        for t in repo.get("topics") or []:
            if isinstance(t, str) and t not in topics:
                topics.append(t)

    return {
        "username": username,
        "name": user_data.get("name"),
        "public_repos": user_data.get("public_repos", 0),
        "followers": user_data.get("followers", 0),
        "languages": languages,     # ← byte count, bukan jumlah repo
        "topics": topics[:40],
        "bio": user_data.get("bio"),
    }
