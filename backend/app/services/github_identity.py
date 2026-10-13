"""Identitas GitHub kandidat: status koneksi, connect via Clerk, dan pencabutan."""
from __future__ import annotations

from typing import Literal

from app.models import CandidateProfile

GithubConnection = Literal["verified", "legacy_unverified", "none"]


def connection_state(profile: CandidateProfile | None) -> GithubConnection:
    if profile is None:
        return "none"
    if profile.github_user_id is not None:
        return "verified"
    if profile.github_legacy_grandfathered and profile.github_username:
        return "legacy_unverified"
    return "none"
