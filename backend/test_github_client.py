import asyncio

import pytest
from fastapi import HTTPException

from app.config import settings
from app.services import github_client


class FakeResponse:
    def __init__(self, status_code, payload):
        self.status_code = status_code
        self._payload = payload
        self.is_success = 200 <= status_code < 300

    def json(self):
        return self._payload

    def raise_for_status(self):
        if not self.is_success:
            raise HTTPException(self.status_code, "fake http error")


class FakeAsyncClient:
    calls = []

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False

    async def get(self, url, **kwargs):
        headers = kwargs.get("headers") or {}
        self.calls.append((url, headers))

        if url.endswith("/users/zgii14") and "Authorization" in headers:
            return FakeResponse(401, {"message": "Bad credentials"})

        if url.endswith("/users/zgii14"):
            return FakeResponse(200, {"name": "Zgii", "public_repos": 1, "followers": 0, "bio": None})

        if url.endswith("/users/zgii14/repos"):
            return FakeResponse(200, [])

        return FakeResponse(404, {})


def test_fetch_github_signals_retries_public_profile_without_invalid_token(monkeypatch):
    FakeAsyncClient.calls = []
    monkeypatch.setattr(settings, "github_token", "invalid-token")
    monkeypatch.setattr(github_client.httpx, "AsyncClient", FakeAsyncClient)

    signals = asyncio.run(github_client.fetch_github_signals("zgii14"))

    assert signals["username"] == "zgii14"
    assert len(FakeAsyncClient.calls) >= 2
    assert "Authorization" in FakeAsyncClient.calls[0][1]
    assert "Authorization" not in FakeAsyncClient.calls[1][1]
