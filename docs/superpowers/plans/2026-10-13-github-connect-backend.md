# GitHub Connect via Clerk: Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backend support for an optional, Clerk-verified GitHub connection: schema, Clerk lookup, connect endpoint, sync without mandatory GitHub, gating, webhook revocation, and response fields.

**Architecture:** Pure helpers (Clerk JSON parsing, Svix signature, connection state) are unit-tested in isolation; I/O lives in thin clients (`clerk_client`, `github_client`); `github_identity` service owns all profile mutations; routers stay thin.

**Tech Stack:** FastAPI, SQLAlchemy 2, httpx, unittest + sqlite (StaticPool) + TestClient (existing pattern in `test_portfolio.py`).

Spec: `docs/superpowers/specs/2026-10-13-github-connect-via-clerk-design.md`. Frontend is a separate plan, released after this one is deployed.

## Global Constraints
- No new dependencies (Svix verification by hand with `hmac`/`hashlib`/`base64`).
- Never log or persist tokens, secrets or emails.
- Migrations only as idempotent DDL in `main.py` lifespan; schema in `models.py`.
- Backward compatible with the current frontend: `POST /profiles/sync` still requires/uses `github_url` for profiles whose connection is `none` (see Task 4).
- Run all tests from `backend/`: `.venv/Scripts/python.exe -m unittest discover -p "test_*.py"`.
- Do NOT push until the user approves.

---

### Task 1: Schema, settings, connection state

**Files:** Modify `app/models.py` (CandidateProfile), `app/config.py`, `app/main.py` (lifespan), `app/schemas.py` (ProfileOut), `app/routers/me.py` (read_profile). Create `app/services/github_identity.py` (state helper only). Test: `test_github_identity.py`.

**Interfaces — Produces:**
- `CandidateProfile.github_user_id: int | None` (BigInteger, unique), `github_verified_at: datetime | None`, `github_legacy_grandfathered: bool` (default False).
- `settings.clerk_secret_key: str = ""`, `settings.clerk_webhook_secret: str = ""`.
- `github_identity.connection_state(profile: CandidateProfile | None) -> Literal["verified","legacy_unverified","none"]`.
- `ProfileOut.github_connection: str = "none"`, `ProfileOut.github_verified_at: datetime | None = None`.

- [ ] **Step 1: Failing test** `test_github_identity.py`:

```python
import unittest
from datetime import datetime, timezone

from app.models import CandidateProfile
from app.services.github_identity import connection_state


class ConnectionStateTests(unittest.TestCase):
    def test_states(self):
        self.assertEqual(connection_state(None), "none")
        self.assertEqual(connection_state(CandidateProfile()), "none")
        self.assertEqual(
            connection_state(CandidateProfile(github_user_id=42, github_verified_at=datetime.now(timezone.utc))),
            "verified",
        )
        self.assertEqual(
            connection_state(CandidateProfile(github_username="octo", github_legacy_grandfathered=True)),
            "legacy_unverified",
        )
        # flag without username is not legacy
        self.assertEqual(connection_state(CandidateProfile(github_legacy_grandfathered=True)), "none")
```

- [ ] **Step 2:** Run `python -m unittest test_github_identity` → FAIL (`No module named app.services.github_identity`).

- [ ] **Step 3: Implement.**
`app/models.py` CandidateProfile, after `github_signals` (import `BigInteger, Boolean` if missing):

```python
    # Identitas GitHub terverifikasi via Clerk (oauth_github). Unik per kandidat.
    github_user_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True, unique=True)
    github_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Profil lama yang username GitHub-nya diketik manual sebelum verifikasi ada.
    github_legacy_grandfathered: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
```

`app/config.py` Settings, after `clerk_issuer`:

```python
    clerk_secret_key: str = ""  # Backend API Clerk (baca akun GitHub terverifikasi)
    clerk_webhook_secret: str = ""  # whsec_... untuk verifikasi webhook Svix
```

`app/main.py` lifespan, after the conversations `expires_at` block:

```python
    # DDL Migration: identitas GitHub terverifikasi via Clerk
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS github_user_id BIGINT NULL"))
        conn.execute(text("ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS github_verified_at TIMESTAMPTZ NULL"))
        conn.execute(text("ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS github_legacy_grandfathered BOOLEAN NOT NULL DEFAULT false"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_candidate_profiles_github_user_id ON candidate_profiles (github_user_id)"))
        conn.execute(text(
            "UPDATE candidate_profiles SET github_legacy_grandfathered = true "
            "WHERE github_username IS NOT NULL AND github_user_id IS NULL AND github_legacy_grandfathered = false"
        ))
        conn.commit()
```

`app/services/github_identity.py`:

```python
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
```

`app/schemas.py` ProfileOut, after `cv_preference`-related fields (end of class):

```python
    # Status koneksi GitHub: verified | legacy_unverified | none
    github_connection: str = "none"
    github_verified_at: datetime | None = None
```

`app/routers/me.py` read_profile: import `from app.services.github_identity import connection_state`; in the `data` dict add:

```python
        "github_connection": connection_state(p),
        "github_verified_at": p.github_verified_at,
```

- [ ] **Step 4:** Run `python -m unittest test_github_identity` → PASS; full suite → OK.
- [ ] **Step 5:** Commit `feat(github): add verified GitHub identity columns and connection state`.

---

### Task 2: Clerk lookup and GitHub login by id

**Files:** Create `app/services/clerk_client.py`. Modify `app/services/github_client.py`. Test: `test_github_identity.py` (append).

**Interfaces — Produces:**
- `clerk_client.ClerkApiError(Exception)`.
- `clerk_client.verified_github_id(user_json: dict) -> int | None` (pure).
- `async clerk_client.fetch_verified_github_id(clerk_user_id: str) -> int | None`.
- `async github_client.fetch_login_by_id(github_id: int) -> str` (raises `HTTPException(502)` on failure).

- [ ] **Step 1: Failing tests** (append):

```python
from app.services.clerk_client import verified_github_id


class ClerkParsingTests(unittest.TestCase):
    def test_picks_verified_github(self):
        user = {"external_accounts": [
            {"provider": "oauth_google", "provider_user_id": "g1", "verification": {"status": "verified"}},
            {"provider": "oauth_github", "provider_user_id": "583231", "verification": {"status": "verified"}},
        ]}
        self.assertEqual(verified_github_id(user), 583231)

    def test_ignores_unverified_missing_and_malformed(self):
        self.assertIsNone(verified_github_id({}))
        self.assertIsNone(verified_github_id({"external_accounts": None}))
        self.assertIsNone(verified_github_id({"external_accounts": [
            {"provider": "oauth_github", "provider_user_id": "1", "verification": {"status": "unverified"}},
        ]}))
        self.assertIsNone(verified_github_id({"external_accounts": [
            {"provider": "oauth_github", "provider_user_id": "abc", "verification": {"status": "verified"}},
        ]}))
```

- [ ] **Step 2:** Run → FAIL (module missing).
- [ ] **Step 3: Implement** `app/services/clerk_client.py`:

```python
"""Klien minimal Clerk Backend API untuk membaca akun GitHub terverifikasi."""
from __future__ import annotations

import httpx

from app.config import settings

CLERK_API = "https://api.clerk.com/v1"


class ClerkApiError(Exception):
    """Clerk Backend API tidak bisa dihubungi atau membalas error."""


def verified_github_id(user_json: dict) -> int | None:
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
```

`app/services/github_client.py` (after `fetch_repo_readme`):

```python
async def fetch_login_by_id(github_id: int) -> str:
    """Username terkini dari ID numerik GitHub (ID stabil, username bisa berubah)."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"https://api.github.com/user/{int(github_id)}", headers=_headers(use_auth=True))
    except httpx.HTTPError as exc:
        raise HTTPException(502, "Gagal menghubungi GitHub. Coba lagi sebentar.") from exc
    login = response.json().get("login") if response.status_code == 200 else None
    if not isinstance(login, str) or not login:
        raise HTTPException(502, "Akun GitHub tidak ditemukan. Coba hubungkan ulang.")
    return login
```

(ensure `from fastapi import HTTPException` is imported in `github_client.py`; it already raises HTTPException elsewhere.)

- [ ] **Step 4:** Tests PASS; suite OK.
- [ ] **Step 5:** Commit `feat(github): read verified GitHub account from Clerk`.

---

### Task 3: Identity service (connect, change, revoke) + connect endpoint

**Files:** Modify `app/services/github_identity.py`, `app/routers/profiles.py`. Test: `test_github_identity.py` (append, sqlite + TestClient like `PortfolioApiTests`).

**Interfaces:**
- Consumes: Task 1 columns/`connection_state`; Task 2 `fetch_verified_github_id`, `fetch_login_by_id`, `ClerkApiError`; existing `github_client.fetch_github_signals`, `verify_skills`, helpers `_skills_from_github`/`_merge_skills` (move both to `github_identity.py` as `skills_from_github`/`merge_skills` and import them back into `profiles.py`).
- Produces:
  - `apply_github_data(db, profile, username, signals) -> bool` (sets username/signals/merged/verified, resets roadmap when skills change; returns skills_changed).
  - `async connect_github(db, user, profile) -> CandidateProfile` (HTTP 409 duplicate, 404 `GITHUB_NOT_CONNECTED`, 503 Clerk unavailable).
  - `revoke_github(db, profile) -> None`.
  - `unpublish_portfolio(db, user_id) -> bool`.
  - Endpoint `POST /profiles/github/connect` → `{"ok": true, "github_username": str, "github_connection": "verified"}`.

- [ ] **Step 1: Failing tests** (append; fixture mirrors `PortfolioApiTests.setUp`, with `Portfolio` published row):

```python
import uuid
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth import get_current_user
from app.database import Base, get_db
from app.main import app
from app.models import Portfolio, User
from app.services import github_identity

SIGNALS = {"languages": {"Python": 100}, "topics": ["fastapi"], "repos_detail": []}


class ConnectApiTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        db = self.Session()
        self.user = User(id=uuid.uuid4(), clerk_user_id="user_a", email="a@example.com", role="candidate")
        self.profile = CandidateProfile(user_id=self.user.id, cv_skills=["SQL"], merged_skills=["SQL"])
        db.add_all([self.user, self.profile]); db.commit(); db.close()

        def override_db():
            s = self.Session()
            try:
                yield s
            finally:
                s.close()

        app.dependency_overrides[get_db] = override_db
        app.dependency_overrides[get_current_user] = lambda: self.user
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()

    def _patches(self, gh_id=1001, login="octo"):
        return (
            patch("app.services.github_identity.fetch_verified_github_id", AsyncMock(return_value=gh_id)),
            patch("app.services.github_identity.fetch_login_by_id", AsyncMock(return_value=login)),
            patch("app.services.github_identity.fetch_github_signals", AsyncMock(return_value=SIGNALS)),
        )

    def test_connect_success_sets_identity_and_merges_skills(self):
        p1, p2, p3 = self._patches()
        with p1, p2, p3:
            res = self.client.post("/profiles/github/connect")
        self.assertEqual(res.status_code, 200, res.text)
        self.assertEqual(res.json()["github_username"], "octo")
        db = self.Session(); prof = db.query(CandidateProfile).one()
        self.assertEqual(prof.github_user_id, 1001)
        self.assertIsNotNone(prof.github_verified_at)
        self.assertFalse(prof.github_legacy_grandfathered)
        self.assertIn("Python", prof.merged_skills); self.assertIn("SQL", prof.merged_skills)
        db.close()

    def test_not_connected_in_clerk(self):
        p1, p2, p3 = self._patches(gh_id=None)
        with p1, p2, p3:
            res = self.client.post("/profiles/github/connect")
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.json()["detail"]["code"], "GITHUB_NOT_CONNECTED")

    def test_duplicate_github_rejected_without_leaking_owner(self):
        db = self.Session()
        other = User(id=uuid.uuid4(), clerk_user_id="user_b", email="b@example.com", role="candidate")
        db.add_all([other, CandidateProfile(user_id=other.id, github_user_id=1001, github_username="octo")]); db.commit(); db.close()
        p1, p2, p3 = self._patches()
        with p1, p2, p3:
            res = self.client.post("/profiles/github/connect")
        self.assertEqual(res.status_code, 409)
        self.assertNotIn("b@example.com", res.text)

    def test_account_change_unpublishes_portfolio(self):
        db = self.Session()
        prof = db.query(CandidateProfile).one(); prof.github_user_id = 7; prof.github_username = "old"
        db.add(Portfolio(user_id=self.user.id, public_id="pub1", status="published", draft_content={}, published_content={}))
        db.commit(); db.close()
        p1, p2, p3 = self._patches(gh_id=1001)
        with p1, p2, p3:
            self.assertEqual(self.client.post("/profiles/github/connect").status_code, 200)
        db = self.Session()
        self.assertEqual(db.query(Portfolio).one().status, "draft")
        self.assertEqual(db.query(CandidateProfile).one().github_user_id, 1001)
        db.close()

    def test_revoke_clears_github_data(self):
        db = self.Session()
        prof = db.query(CandidateProfile).one()
        prof.github_user_id = 1001; prof.github_username = "octo"; prof.github_signals = SIGNALS
        prof.verified_skills = [{"skill": "Python"}]; prof.merged_skills = ["Python", "SQL"]
        db.add(Portfolio(user_id=self.user.id, public_id="pub2", status="published", draft_content={}, published_content={}))
        db.commit()
        github_identity.revoke_github(db, prof)
        db.refresh(prof)
        self.assertIsNone(prof.github_user_id); self.assertIsNone(prof.github_signals)
        self.assertEqual(prof.verified_skills, []); self.assertEqual(prof.merged_skills, ["SQL"])
        self.assertEqual(db.query(Portfolio).one().status, "draft")
        db.close()
```

- [ ] **Step 2:** Run → FAIL (`connect_github`/endpoint missing → 404/AttributeError).

- [ ] **Step 3: Implement** in `github_identity.py` (add imports: `logging`, `datetime, timezone`, `HTTPException`, `IntegrityError`, `Session`, `Portfolio, RoadmapProgress, User`, `fetch_verified_github_id, ClerkApiError` from clerk_client, `fetch_login_by_id, fetch_github_signals` from github_client, `verify_skills`):

```python
logger = logging.getLogger(__name__)


def skills_from_github(signals: dict | None) -> list[str]:
    ...  # body moved verbatim from profiles._skills_from_github


def merge_skills(gh: list[str], cv: list[str]) -> list[str]:
    ...  # body moved verbatim from profiles._merge_skills


def apply_github_data(db: Session, profile: CandidateProfile, username: str | None, signals: dict | None) -> bool:
    old = {s.lower() for s in (profile.merged_skills or [])}
    merged = merge_skills(skills_from_github(signals), profile.cv_skills or [])
    profile.github_username = username
    profile.github_signals = signals
    profile.merged_skills = merged
    profile.verified_skills = verify_skills(signals, as_of=datetime.now(timezone.utc)) if signals else []
    changed = old != {s.lower() for s in merged}
    if changed:
        profile.roadmap_cached = None
        profile.roadmap_fingerprint = None
        db.query(RoadmapProgress).filter(RoadmapProgress.user_id == profile.user_id).delete()
    return changed


def unpublish_portfolio(db: Session, user_id) -> bool:
    portfolio = db.query(Portfolio).filter(Portfolio.user_id == user_id).first()
    if portfolio and portfolio.status == "published":
        portfolio.status = "draft"
        return True
    return False


async def connect_github(db: Session, user: User, profile: CandidateProfile) -> CandidateProfile:
    try:
        github_id = await fetch_verified_github_id(user.clerk_user_id)
    except ClerkApiError as exc:
        logger.warning("github_connect result=error reason=clerk_%s", type(exc).__name__)
        raise HTTPException(503, "Layanan login sedang bermasalah. Coba lagi sebentar.") from exc
    if github_id is None:
        logger.info("github_connect result=not_connected")
        raise HTTPException(404, {"code": "GITHUB_NOT_CONNECTED", "message": "Akun GitHub belum terhubung. Hubungkan GitHub dulu."})
    owner = db.query(CandidateProfile).filter(CandidateProfile.github_user_id == github_id, CandidateProfile.id != profile.id).first()
    if owner:
        logger.info("github_connect result=duplicate")
        raise HTTPException(409, "Akun GitHub ini sudah terhubung ke akun GitHire lain.")
    login = await fetch_login_by_id(github_id)
    signals = await fetch_github_signals(login)
    if profile.github_user_id is not None and profile.github_user_id != github_id:
        unpublish_portfolio(db, profile.user_id)
    profile.github_user_id = github_id
    profile.github_verified_at = datetime.now(timezone.utc)
    profile.github_legacy_grandfathered = False
    apply_github_data(db, profile, login, signals)
    profile.updated_at = datetime.utcnow()
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        logger.info("github_connect result=duplicate race=1")
        raise HTTPException(409, "Akun GitHub ini sudah terhubung ke akun GitHire lain.") from exc
    db.refresh(profile)
    logger.info("github_connect result=success")
    return profile


def revoke_github(db: Session, profile: CandidateProfile) -> None:
    profile.github_user_id = None
    profile.github_verified_at = None
    profile.github_legacy_grandfathered = False
    apply_github_data(db, profile, None, None)
    unpublish_portfolio(db, profile.user_id)
    db.commit()
    logger.info("github_revoke reason=webhook")
```

In `profiles.py`: delete `_skills_from_github`/`_merge_skills` bodies and `from app.services.github_identity import connect_github, merge_skills, skills_from_github` (update the two call sites to the new names). Add endpoint:

```python
@router.post("/github/connect")
async def connect_github_account(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role == "recruiter":
        raise HTTPException(403, "Hanya untuk kandidat.")
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).first()
    if not profile:
        profile = CandidateProfile(user_id=user.id)
        db.add(profile)
        db.flush()
    profile = await connect_github(db, user, profile)
    return {"ok": True, "github_username": profile.github_username, "github_connection": "verified"}
```

Note: `fetch_github_signals` must be imported into `github_identity` as a module-level name (`from app.services.github_client import fetch_github_signals, fetch_login_by_id`) so the tests can patch `app.services.github_identity.fetch_github_signals`.

- [ ] **Step 4:** Tests PASS; full suite OK (portfolio/logic tests still green after the helper move).
- [ ] **Step 5:** Commit `feat(github): connect verified GitHub identity via Clerk`.

---

### Task 4: Sync without mandatory GitHub (backward compatible)

**Files:** Modify `app/routers/profiles.py` (`sync_profile`). Test: `test_github_identity.py` (append).

Behavior:
- `cv: UploadFile | None = File(None)`, `github_url: str | None = Form(None)`.
- GitHub username source: `verified` → `profile.github_username` (refresh signals); `legacy_unverified` → stored username; `none` → `github_url` if provided (transition compatibility, keeps the live onboarding working until the frontend ships), else no GitHub.
- CV source: uploaded file (existing parse path) else existing `cv_skills`/`cv_data`.
- 400 `"Upload CV atau hubungkan GitHub terlebih dahulu."` if neither CV nor GitHub.
- A typed `github_url` never overrides a `verified` or `legacy_unverified` username.
- Profiles created via typed `github_url` during the transition get `github_legacy_grandfathered = True`.

- [ ] **Step 1: Failing tests** (append; reuse ConnectApiTests fixture via a subclass):

```python
PDF = b"%PDF-1.4 fake"


class SyncMatrixTests(ConnectApiTests):
    def _sync(self, data=None, with_cv=True):
        files = {"cv": ("cv.pdf", PDF, "application/pdf")} if with_cv else None
        with patch("app.routers.profiles.extract_text_from_pdf", return_value="x" * 50), \
             patch("app.routers.profiles.extract_skills_from_cv_text", return_value=["SQL"]), \
             patch("app.routers.profiles.extract_cv_data_from_text", return_value={"summary": "s"}), \
             patch("app.routers.profiles.reserve_ai_generation"), \
             patch("app.routers.profiles.github_client.fetch_github_signals", AsyncMock(return_value=SIGNALS)):
            return self.client.post("/profiles/sync", data=data or {}, files=files)

    def test_cv_only_without_github(self):
        res = self._sync()
        self.assertEqual(res.status_code, 200, res.text)
        self.assertIsNone(res.json()["github_username"])

    def test_nothing_returns_400(self):
        db = self.Session(); prof = db.query(CandidateProfile).one(); prof.cv_skills = None; prof.cv_data = None; db.commit(); db.close()
        self.assertEqual(self._sync(with_cv=False).status_code, 400)

    def test_verified_username_wins_over_typed(self):
        db = self.Session(); prof = db.query(CandidateProfile).one()
        prof.github_user_id = 1001; prof.github_username = "octo"; db.commit(); db.close()
        res = self._sync({"github_url": "someone-else"})
        self.assertEqual(res.json()["github_username"], "octo")

    def test_transition_typed_username_marks_legacy(self):
        res = self._sync({"github_url": "octo"})
        self.assertEqual(res.status_code, 200, res.text)
        db = self.Session(); self.assertTrue(db.query(CandidateProfile).one().github_legacy_grandfathered); db.close()
```

- [ ] **Step 2:** Run → FAIL (cv required / 422).
- [ ] **Step 3: Implement** in `sync_profile`: change signature; compute `state = connection_state(existing)`; pick `username` per rules; only parse PDF when `cv` provided (keep existing validation, size limit, fingerprint cache and AI quota code unchanged inside an `if cv is not None:` block; else reuse `existing.cv_skills`/`cv_data`); raise 400 when `not username and not cv_skills_available`; fetch signals only when `username`; replace the field assignments with `apply_github_data(db, profile, username, gh_signals)` after setting `profile.cv_skills`/`cv_data`; set `profile.github_legacy_grandfathered = True` when the username came from `github_url` and `state == "none"`; keep CV file fields only when a new file was uploaded; preserve the existing 60s cooldown and response shape (`github_username` may be `null`).
- [ ] **Step 4:** Tests PASS; full suite OK.
- [ ] **Step 5:** Commit `feat(profiles): make GitHub optional in profile sync`.

---

### Task 5: Clerk webhook with Svix verification

**Files:** Create `app/routers/webhooks.py`, `app/services/svix_verify.py`. Modify `app/main.py` (`include_router`). Test: `test_clerk_webhook.py`.

**Interfaces — Produces:** `svix_verify.verify(secret: str, headers: Mapping[str,str], body: bytes, now: int | None = None, tolerance: int = 300) -> bool`; `POST /webhooks/clerk`.

- [ ] **Step 1: Failing tests** `test_clerk_webhook.py`:

```python
import base64, hashlib, hmac, json, time, unittest

from app.services.svix_verify import verify

SECRET_BYTES = b"supersecretkey-for-tests-123456"
SECRET = "whsec_" + base64.b64encode(SECRET_BYTES).decode()


def sign(body: bytes, ts: int, msg_id: str = "msg_1") -> dict:
    sig = base64.b64encode(hmac.new(SECRET_BYTES, f"{msg_id}.{ts}.".encode() + body, hashlib.sha256).digest()).decode()
    return {"svix-id": msg_id, "svix-timestamp": str(ts), "svix-signature": f"v1,{sig}"}


class SvixTests(unittest.TestCase):
    def test_valid(self):
        body = b'{"type":"user.updated"}'; ts = int(time.time())
        self.assertTrue(verify(SECRET, sign(body, ts), body, now=ts))

    def test_tampered_body(self):
        ts = int(time.time())
        self.assertFalse(verify(SECRET, sign(b"{}", ts), b'{"x":1}', now=ts))

    def test_wrong_secret(self):
        body = b"{}"; ts = int(time.time())
        other = "whsec_" + base64.b64encode(b"another-secret-value-0000000").decode()
        self.assertFalse(verify(other, sign(body, ts), body, now=ts))

    def test_stale_timestamp(self):
        body = b"{}"; ts = int(time.time()) - 3600
        self.assertFalse(verify(SECRET, sign(body, ts), body, now=ts + 3600))

    def test_multiple_signatures_one_valid(self):
        body = b"{}"; ts = int(time.time()); h = sign(body, ts)
        h["svix-signature"] = "v1,AAAA " + h["svix-signature"]
        self.assertTrue(verify(SECRET, h, body, now=ts))
```

Plus an API test class (sqlite fixture as in Task 3) asserting: unsigned request → 401; signed `user.updated` without a GitHub account for a verified profile → 200 and profile revoked; signed `user.updated` still containing the same verified GitHub id → profile unchanged; signed `user.created` → 200 no-op. Patch `app.routers.webhooks.settings.clerk_webhook_secret` to `SECRET`.

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** `app/services/svix_verify.py`:

```python
"""Verifikasi tanda tangan webhook Svix (dipakai Clerk) tanpa dependency tambahan."""
from __future__ import annotations

import base64
import hashlib
import hmac
import time
from typing import Mapping


def verify(secret: str, headers: Mapping[str, str], body: bytes, now: int | None = None, tolerance: int = 300) -> bool:
    msg_id = headers.get("svix-id")
    timestamp = headers.get("svix-timestamp")
    signatures = headers.get("svix-signature")
    if not (secret and msg_id and timestamp and signatures):
        return False
    try:
        ts = int(timestamp)
        key = base64.b64decode(secret.removeprefix("whsec_"))
    except (ValueError, TypeError):
        return False
    current = int(time.time()) if now is None else now
    if abs(current - ts) > tolerance:
        return False
    expected = base64.b64encode(hmac.new(key, f"{msg_id}.{ts}.".encode() + body, hashlib.sha256).digest()).decode()
    for part in signatures.split():
        version, _, sig = part.partition(",")
        if version == "v1" and hmac.compare_digest(sig, expected):
            return True
    return False
```

`app/routers/webhooks.py`:

```python
import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import CandidateProfile, User
from app.services.clerk_client import verified_github_id
from app.services.github_identity import revoke_github
from app.services.svix_verify import verify

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
logger = logging.getLogger(__name__)


@router.post("/clerk")
async def clerk_webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    headers = {k.lower(): v for k, v in request.headers.items()}
    if not verify(settings.clerk_webhook_secret, headers, body):
        logger.warning("clerk_webhook rejected reason=signature")
        raise HTTPException(401, "invalid signature")
    event = json.loads(body or b"{}")
    if event.get("type") != "user.updated":
        return {"ok": True}
    data = event.get("data") or {}
    user = db.query(User).filter(User.clerk_user_id == data.get("id")).first()
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).first() if user else None
    if profile and profile.github_user_id is not None and verified_github_id(data) != profile.github_user_id:
        revoke_github(db, profile)
    return {"ok": True}
```

`app/main.py`: `from app.routers import webhooks` (follow the existing import style) and `app.include_router(webhooks.router)`.

- [ ] **Step 4:** Tests PASS; suite OK.
- [ ] **Step 5:** Commit `feat(github): revoke GitHub verification from Clerk webhook`.

---

### Task 6: Gating and verified flags in responses

**Files:** Modify `app/routers/portfolio.py` (generate endpoint and public view), `app/routers/recruiter.py` (candidate list/detail and application payload builders at lines ~76, ~382, ~668), `app/schemas.py` if a response model lists fields. Test: append to `test_github_identity.py`.

- [ ] **Step 1: Failing tests:** portfolio generate with `github_connection == "none"` → 409 with `detail.code == "GITHUB_REQUIRED"`; recruiter candidate search payload contains `github_verified` (True for a profile with `github_user_id`, False otherwise); public portfolio view contains `github_verified`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement:**
  - `portfolio.py` generate (`generate_my_portfolio`, before the cooldown check): `if connection_state(profile) == "none": raise HTTPException(409, {"code": "GITHUB_REQUIRED", "message": "Hubungkan GitHub dulu untuk membuat portfolio."})`. Keep the existing 400 for missing CV.
  - Public portfolio view (`public_view` in `services/portfolio.py` or its router caller): add `"github_verified": profile.github_user_id is not None`.
  - `recruiter.py`: wherever a candidate dict includes `"github": profile.github_username`, add `"github_verified": bool(profile and profile.github_user_id is not None)`.
- [ ] **Step 4:** Tests PASS; full suite OK.
- [ ] **Step 5:** Commit `feat(github): gate portfolio on GitHub and expose verified flag`.

---

### Task 7: Docs, env example, deploy (with approval)

- [ ] `backend/.env.example`: add `CLERK_SECRET_KEY=` and `CLERK_WEBHOOK_SECRET=` with one-line comments.
- [ ] Full suite green; `python -m compileall -q app`.
- [ ] Ask the user to approve the push. After deploy, verify on production: `/health` 200; `POST /webhooks/clerk` without signature → 401; `/me/profile` (logged-in session in the browser pane) contains `github_connection`.
- [ ] Hand off owner configuration steps (GitHub OAuth App in the org, Clerk GitHub connection with custom credentials, Railway `CLERK_SECRET_KEY` / `CLERK_WEBHOOK_SECRET`, Clerk webhook endpoint subscribed to `user.updated`), then start the frontend plan.
