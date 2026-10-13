"""Verifikasi tanda tangan webhook Svix (dipakai Clerk) tanpa dependency tambahan."""
from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import time
from typing import Mapping


def verify(
    secret: str,
    headers: Mapping[str, str],
    body: bytes,
    now: int | None = None,
    tolerance: int = 300,
) -> bool:
    """True jika salah satu tanda tangan v1 cocok dan timestamp masih dalam toleransi."""
    msg_id = headers.get("svix-id")
    timestamp = headers.get("svix-timestamp")
    signatures = headers.get("svix-signature")
    if not (secret and msg_id and timestamp and signatures):
        return False
    try:
        ts = int(timestamp)
        key = base64.b64decode(secret.removeprefix("whsec_"))
    except (ValueError, TypeError, binascii.Error):
        return False
    current = int(time.time()) if now is None else now
    if abs(current - ts) > tolerance:
        return False
    signed = f"{msg_id}.{ts}.".encode() + body
    expected = base64.b64encode(hmac.new(key, signed, hashlib.sha256).digest()).decode()
    for part in signatures.split():
        version, _, signature = part.partition(",")
        if version == "v1" and hmac.compare_digest(signature, expected):
            return True
    return False
