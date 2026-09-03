import asyncio
import re
from typing import Any

import httpx
from fastapi import HTTPException

from app.config import settings

# Batas request paralel saat mengambil detail repo (languages + commit milik user).
# Menjaga agar GitHub tidak menandai burst request sebagai abuse.
REPO_DETAIL_SEMAPHORE = 6
# Tanpa GITHUB_TOKEN rate limit hanya 60 request/jam → batasi repo yang dianalisis.
REPO_CAP_NO_TOKEN = 15


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


def _headers(use_auth: bool = True) -> dict[str, str]:
    h = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "GitHire/1.0",
    }
    if use_auth and settings.github_token:
        h["Authorization"] = f"Bearer {settings.github_token}"
    return h


async def fetch_repo_readme(username: str, repo_name: str) -> str:
    """Ambil README publik sebagai teks terbatas untuk bukti ringkasan portfolio."""
    identifier = re.compile(r"^[A-Za-z0-9_.-]+$")
    if not identifier.fullmatch(username or "") or not identifier.fullmatch(repo_name or ""):
        return ""

    headers = _headers(use_auth=True)
    headers["Accept"] = "application/vnd.github.raw+json"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"https://api.github.com/repos/{username}/{repo_name}/readme",
                headers=headers,
            )
        if not response.is_success:
            return ""
        return response.text[:12000]
    except (httpx.HTTPError, UnicodeError):
        return ""


def _parse_last_page(link_header: str | None) -> int | None:
    """
    Ambil nomor halaman terakhir dari header Link GitHub (rel="last").

    Dipakai untuk menghitung jumlah commit tanpa menarik seluruh riwayat:
    dengan per_page=1, halaman terakhir = jumlah commit.
    """
    if not link_header:
        return None
    for part in link_header.split(","):
        if 'rel="last"' not in part:
            continue
        m = re.search(r"[?&]page=(\d+)", part)
        if m:
            try:
                return int(m.group(1))
            except ValueError:
                return None
    return None


async def _fetch_repo_detail(
    client: httpx.AsyncClient,
    repo: dict,
    username: str,
    use_auth: bool,
    sem: asyncio.Semaphore,
    with_commits: bool,
) -> dict:
    """
    Ambil bahasa (dan opsional jumlah commit milik user) untuk satu repo.

    Selalu mengembalikan dict — kegagalan ditandai lewat commit_source/confidence
    agar satu repo bermasalah tidak menggagalkan keseluruhan sync.
    """
    name = repo.get("name") or ""
    full_name = repo.get("full_name") or f"{username}/{name}"
    langs_url = repo.get("languages_url") or ""

    languages: dict[str, int] = {}
    own_commits = 0
    commit_failed = False

    async with sem:
        # ── Bahasa per repo (byte count) ──
        if langs_url:
            try:
                r = await client.get(langs_url, headers=_headers(use_auth=use_auth))
                if r.is_success:
                    data = r.json()
                    if isinstance(data, dict):
                        languages = {
                            k: v
                            for k, v in data.items()
                            if isinstance(k, str) and isinstance(v, int) and not isinstance(v, bool)
                        }
            except Exception:
                pass  # repo tanpa bahasa terbaca → bukan error kritis

        # ── Jumlah commit milik user pada repo ini ──
        if with_commits:
            try:
                cr = await client.get(
                    f"https://api.github.com/repos/{full_name}/commits",
                    params={"author": username, "per_page": 1},
                    headers=_headers(use_auth=use_auth),
                )
                if cr.status_code == 409:
                    # Repository kosong → 0 commit, bukan kegagalan fetch
                    own_commits = 0
                elif cr.is_success:
                    last_page = _parse_last_page(cr.headers.get("Link"))
                    if last_page is not None:
                        own_commits = last_page
                    else:
                        payload = cr.json()
                        own_commits = len(payload) if isinstance(payload, list) else 0
                else:
                    commit_failed = True
            except Exception:
                commit_failed = True

    if commit_failed:
        # Bukti commit tidak bisa diambil → jangan mengarang angka.
        # own_commits = 0 memastikan repo ini tidak pernah lolos sebagai verified.
        own_commits = 0

    return {
        "name": name,
        "html_url": repo.get("html_url") or "",
        "fork": False,
        "own_commits": own_commits,
        "created_at": repo.get("created_at"),
        "pushed_at": repo.get("pushed_at"),
        "size": repo.get("size") or 0,
        "stars": repo.get("stargazers_count") or 0,
        "languages": languages,
        "commit_source": "fallback" if commit_failed else "repo_commits",
        "confidence": "low" if commit_failed else "high",
        "_analyzed": with_commits,
        "_commit_failed": commit_failed,
    }


async def fetch_github_signals(username: str) -> dict[str, Any]:
    """
    Ambil data sinyal dari GitHub (validasi + fetch sekaligus — 1 koneksi).

    Raise HTTPException dengan pesan user-friendly untuk:
    - 404: akun tidak ditemukan
    - 403: rate limit / access denied
    - timeout: GitHub tidak merespons
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        use_auth = bool(settings.github_token)
        # ── Step 1: Fetch profil user (sekaligus validasi keberadaan akun) ──
        try:
            user_r = await client.get(
                f"https://api.github.com/users/{username}",
                headers=_headers(use_auth=use_auth),
            )
            if user_r.status_code == 401 and use_auth:
                use_auth = False
                user_r = await client.get(
                    f"https://api.github.com/users/{username}",
                    headers=_headers(use_auth=False),
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
        if user_r.status_code == 401:
            raise HTTPException(
                502,
                "Token GitHub di server tidak valid atau sudah expired. "
                "Perbarui GITHUB_TOKEN di backend/.env lalu restart backend."
            )
        if not user_r.is_success:
            raise HTTPException(
                502,
                f"GitHub mengembalikan error {user_r.status_code} "
                f"saat memvalidasi akun @{username}."
            )

        user_data = user_r.json()

        # ── Step 2: Fetch daftar repo (per_page 100 agar hitung stars akurat) ──
        repos_r = await client.get(
            f"https://api.github.com/users/{username}/repos",
            params={"per_page": 100, "sort": "updated"},
            headers=_headers(use_auth=use_auth),
        )
        repos_r.raise_for_status()
        repos = repos_r.json()

        # ── Total stars: jumlahkan stargazers_count seluruh repo (exclude fork) ──
        total_stars = 0
        for r in repos:
            if isinstance(r, dict) and not r.get("fork"):
                total_stars += r.get("stargazers_count", 0) or 0

        # ── Total commits publik: pakai Search API (author:username) ──
        # Best-effort; kalau gagal/rate-limit → 0, bukan error kritis.
        total_commits = 0
        try:
            commits_r = await client.get(
                "https://api.github.com/search/commits",
                params={"q": f"author:{username}", "per_page": 1},
                headers={**_headers(use_auth=use_auth), "Accept": "application/vnd.github.cloak-preview+json"},
            )
            if commits_r.is_success:
                total_commits = commits_r.json().get("total_count", 0) or 0
        except Exception:
            pass

        # ── Step 3: Fetch detail per repo secara paralel (bahasa + commit milik user) ──
        # Bahasa tetap diambil dari SELURUH repo non-fork agar agregat `languages`
        # identik dengan perilaku lama. Cap tanpa token hanya membatasi repo yang
        # dianalisis untuk bukti commit (repos_detail).
        non_fork_repos = [r for r in repos if isinstance(r, dict) and not r.get("fork")]
        indexed = list(enumerate(non_fork_repos))
        if use_auth:
            analyzed_idx = {i for i, _ in indexed}
            repo_cap_applied = False
        else:
            ranked = sorted(indexed, key=lambda pair: pair[1].get("pushed_at") or "", reverse=True)
            analyzed_idx = {i for i, _ in ranked[:REPO_CAP_NO_TOKEN]}
            repo_cap_applied = len(non_fork_repos) > REPO_CAP_NO_TOKEN

        sem = asyncio.Semaphore(REPO_DETAIL_SEMAPHORE)
        settled = await asyncio.gather(
            *(
                _fetch_repo_detail(
                    client, repo, username, use_auth, sem, with_commits=idx in analyzed_idx
                )
                for idx, repo in indexed
            ),
            return_exceptions=True,
        )

    # ── Akumulasi byte count per bahasa + kumpulkan bukti per repo ──
    # Format languages: {"Python": 82000, "JavaScript": 12000, ...}
    languages: dict[str, int] = {}
    repos_detail: list[dict] = []
    commit_fetch_failures = 0
    for item in settled:
        # Exception dari satu repo tidak menggagalkan sync
        if not isinstance(item, dict):
            continue
        analyzed = item.pop("_analyzed", False)
        commit_failed = item.pop("_commit_failed", False)
        for lang, byte_count in (item.get("languages") or {}).items():
            languages[lang] = languages.get(lang, 0) + byte_count
        if analyzed:
            if commit_failed:
                commit_fetch_failures += 1
            repos_detail.append(item)

    # ── Kumpulkan topics dari semua repo ──
    topics: list[str] = []
    for repo in repos:
        if not isinstance(repo, dict):
            continue
        for t in repo.get("topics") or []:
            if isinstance(t, str) and t not in topics:
                topics.append(t)

    public_repos = user_data.get("public_repos", 0)
    return {
        "username": username,
        "name": user_data.get("name"),
        "public_repos": public_repos,
        "repos": public_repos,          # alias untuk UI (recruiter candidate card)
        "stars": total_stars,           # total stargazers seluruh repo non-fork
        "commits": total_commits,       # total commit publik (Search API)
        "followers": user_data.get("followers", 0),
        "languages": languages,         # ← byte count, bukan jumlah repo
        "topics": topics[:40],
        "bio": user_data.get("bio"),
        # ── Bukti per repo untuk verifikasi skill (lihat services/skill_verification.py) ──
        "repos_detail": repos_detail,
        "repos_analyzed": len(repos_detail),
        "repo_cap_applied": repo_cap_applied,
        "commit_fetch_failures": commit_fetch_failures,
    }
