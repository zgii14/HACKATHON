"""Aturan subdomain portfolio (nama.githire.my.id)."""
import re
from datetime import datetime, timedelta, timezone

NAME_PATTERN = re.compile(r"^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$")
RESERVED_NAMES = frozenset({
    "www", "api", "app", "admin", "mail", "email", "smtp", "ftp",
    "clerk", "accounts", "clkmail", "dashboard", "auth", "help", "support",
    "docs", "blog", "status", "static", "assets", "cdn", "dev", "staging",
    "test", "githire", "p", "s",
})
CHANGE_COOLDOWN = timedelta(days=30)
HOLD_DURATION = timedelta(days=30)


def normalize(name: str | None) -> str:
    return (name or "").strip().lower()


def invalid_reason(name: str) -> str | None:
    """'invalid' untuk format salah, 'reserved' untuk nama sistem, None bila boleh."""
    if not NAME_PATTERN.fullmatch(name) or "--" in name:
        return "invalid"
    if name in RESERVED_NAMES:
        return "reserved"
    return None


def as_utc(value: datetime | None) -> datetime | None:
    # SQLite (test) mengembalikan datetime naive; Postgres mengembalikan aware.
    if value is None:
        return None
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def next_change_at(changed_at: datetime | None, now: datetime) -> datetime | None:
    """Kapan nama boleh diganti lagi; None berarti sekarang sudah boleh."""
    if changed_at is None:
        return None
    allowed_at = as_utc(changed_at) + CHANGE_COOLDOWN
    return allowed_at if allowed_at > now else None
