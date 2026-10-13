"""Klien minimal Clerk Backend API untuk membaca akun GitHub terverifikasi."""
from __future__ import annotations

import httpx

from app.config import settings

CLERK_API = "https://api.clerk.com/v1"


class ClerkApiError(Exception):
    """Clerk Backend API tidak bisa dihubungi atau membalas error."""


def verified_github_id(user_json: dict) -> int | None:
    """ID numerik GitHub dari akun oauth_github yang sudah diverifikasi Clerk."""
    for account in user_json.get("external_accounts") or []:
        if not isinstance(account, dict) or account.get("provider") != "oauth_github":
            continue
        if (account.get("verification") or {}).get("status") != "verified":
            continue
        try:
            return int(account.get("provider_user_id"))
        except (TypeError, ValueError):
            return None
    return None


async def fetch_verified_github_id(clerk_user_id: str) -> int | None:
    if not settings.clerk_secret_key:
        raise ClerkApiError("CLERK_SECRET_KEY belum diset")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{CLERK_API}/users/{clerk_user_id}",
                headers={"Authorization": f"Bearer {settings.clerk_secret_key}"},
            )
    except httpx.HTTPError as exc:
        raise ClerkApiError(type(exc).__name__) from exc
    if response.status_code != 200:
        raise ClerkApiError(f"status {response.status_code}")
    return verified_github_id(response.json())
