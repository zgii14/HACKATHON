# Subdomain Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** User bisa mengklaim `nama.githire.my.id` yang menampilkan portfolio publiknya.

**Architecture:** Backend menyimpan `portfolios.subdomain` + tabel `subdomain_holds` (nama lama ditahan 30 hari), dengan endpoint klaim/cek (login) dan resolve (publik). Middleware Next.js membaca host; host `nama.githire.my.id` di-rewrite ke route `/s/[name]` yang me-resolve nama lalu merender komponen portfolio publik yang sama dengan `/p/[publicId]`. DNS dipindah ke Vercel agar wildcard `*.githire.my.id` punya SSL; sampai itu selesai, `public_url` tetap `/p/{id}` (flag `PORTFOLIO_SUBDOMAINS_LIVE`).

**Tech Stack:** FastAPI + SQLAlchemy 2 (unittest, sqlite StaticPool), Next.js 14 app router + Clerk middleware, React Query, `node --test` untuk helper TS.

Spec: `docs/superpowers/specs/2026-10-15-portfolio-subdomain-design.md`

## Global Constraints

- Nama: regex `^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$`, tanpa `--`, dinormalisasi trim + lowercase.
- Nama sistem diblokir: `www api app admin mail email smtp ftp clerk accounts clkmail dashboard auth help support docs blog status static assets cdn dev staging test githire p s`.
- Ganti nama maksimal sekali per 30 hari; nama lama ditahan 30 hari (redirect 308, tidak bisa diklaim orang lain); pemilik boleh mengklaim kembali nama lamanya.
- Akses gratis untuk semua kandidat; `users.plan` default `'free'` belum dipakai untuk gating.
- Migrasi DB hanya lewat DDL idempotent di `backend/app/main.py` `lifespan()` (tidak ada Alembic).
- Backend test: `python -m unittest` dari folder `backend` (pytest tidak terpasang).
- Copy UI Bahasa Indonesia, tanpa em-dash (`—`).
- Theme GitHire violet terkunci; pakai token yang ada.
- Jangan push ke remote tanpa persetujuan user.

## File Structure

| File | Tanggung jawab |
|---|---|
| `backend/app/services/subdomain.py` (baru) | Aturan nama (murni) + cek ketersediaan terhadap DB |
| `backend/app/models.py` | Kolom `Portfolio.subdomain`, `subdomain_changed_at`, model `SubdomainHold`, `User.plan` |
| `backend/app/main.py` | DDL migrasi |
| `backend/app/config.py` | `portfolio_root_domain`, `portfolio_subdomains_live` |
| `backend/app/schemas.py` | `SubdomainClaim`, field baru di `PortfolioOut` |
| `backend/app/routers/portfolio.py` | `GET /me/portfolio/subdomain/check`, `PUT /me/portfolio/subdomain`, `_as_out`, `subdomain` di portfolio publik |
| `backend/app/routers/public.py` | `GET /public/subdomains/{name}` |
| `backend/test_subdomain.py` (baru) | Test aturan + API |
| `linkify/src/utils/functions/subdomain-host.ts` (baru) | `subdomainFromHost`, `subdomainUrl`, `toSubdomainCandidate` (murni, tanpa alias import) |
| `linkify/tests/subdomain-host.test.mts` (baru) | Test helper di atas |
| `linkify/src/middleware.ts` | Rewrite/redirect host subdomain sebelum Clerk |
| `linkify/src/components/portfolio/public-portfolio-page.tsx` (baru) | Fetch + render portfolio publik (dipakai `/p` dan `/s`) |
| `linkify/src/app/p/[publicId]/page.tsx` | Jadi tipis, pakai komponen bersama + canonical |
| `linkify/src/app/s/[name]/page.tsx` (baru) | Resolve nama → render / redirect / 404 |
| `linkify/src/components/portfolio/types.ts` | Field baru `PortfolioRecord`, `PublicPortfolio.subdomain` |
| `linkify/src/components/portfolio/subdomain-card.tsx` (baru) | Kartu "Alamat portfolio" |
| `linkify/src/components/portfolio/portfolio-editor.tsx` | Pasang kartu, perbaiki `copyLink` untuk URL absolut |
| `docs/runbooks/2026-10-15-dns-vercel-migration.md` (baru) | Runbook migrasi DNS untuk pemilik |

---

### Task 1: Aturan nama subdomain (service murni)

**Files:**
- Create: `backend/app/services/subdomain.py`
- Test: `backend/test_subdomain.py`

**Interfaces:**
- Produces:
  - `normalize(name: str | None) -> str`
  - `invalid_reason(name: str) -> str | None` → `"invalid" | "reserved" | None`
  - `as_utc(value: datetime | None) -> datetime | None`
  - `next_change_at(changed_at: datetime | None, now: datetime) -> datetime | None` (None = boleh ganti sekarang)
  - konstanta `RESERVED_NAMES: frozenset[str]`, `CHANGE_COOLDOWN`, `HOLD_DURATION` (`timedelta(days=30)`)

- [ ] **Step 1: Write the failing test**

Create `backend/test_subdomain.py`:

```python
import unittest
from datetime import datetime, timedelta, timezone

from app.services import subdomain as sd


class NameRulesTests(unittest.TestCase):
    def test_normalize_trims_and_lowercases(self):
        self.assertEqual(sd.normalize("  RoZagi "), "rozagi")
        self.assertEqual(sd.normalize(None), "")

    def test_valid_names(self):
        for name in ["abc", "rozagi-dev", "a1b", "x" * 30, "123"]:
            self.assertIsNone(sd.invalid_reason(name), name)

    def test_invalid_names(self):
        for name in ["", "ab", "x" * 31, "-abc", "abc-", "ab--c", "ab_c", "ab.c", "ab c", "Rozagi"]:
            self.assertEqual(sd.invalid_reason(name), "invalid", name)

    def test_reserved_names(self):
        for name in ["www", "api", "clerk", "accounts", "clkmail", "admin", "dashboard"]:
            self.assertEqual(sd.invalid_reason(name), "reserved", name)

    def test_next_change_at(self):
        now = datetime(2026, 10, 15, 12, 0, tzinfo=timezone.utc)
        self.assertIsNone(sd.next_change_at(None, now))
        self.assertIsNone(sd.next_change_at(now - timedelta(days=31), now))
        self.assertEqual(sd.next_change_at(now - timedelta(days=29), now), now + timedelta(days=1))

    def test_next_change_at_accepts_naive_datetimes_from_sqlite(self):
        now = datetime(2026, 10, 15, 12, 0, tzinfo=timezone.utc)
        naive = (now - timedelta(days=29)).replace(tzinfo=None)
        self.assertEqual(sd.next_change_at(naive, now), now + timedelta(days=1))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run (dari `backend/`, venv aktif): `python -m unittest test_subdomain -v`
Expected: ERROR `ImportError: cannot import name 'subdomain' from 'app.services'`

- [ ] **Step 3: Write minimal implementation**

Create `backend/app/services/subdomain.py`:

```python
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m unittest test_subdomain -v`
Expected: 6 tests OK

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/subdomain.py backend/test_subdomain.py
git commit -m "feat(subdomain): name rules for portfolio subdomains"
```

---

### Task 2: Data + endpoint klaim dan cek

**Files:**
- Modify: `backend/app/models.py` (class `User`, class `Portfolio`, tambah class `SubdomainHold` setelah `Portfolio`)
- Modify: `backend/app/main.py` (blok DDL baru setelah blok "identitas GitHub terverifikasi via Clerk")
- Modify: `backend/app/config.py` (class `Settings`)
- Modify: `backend/app/schemas.py` (`PortfolioOut`, tambah `SubdomainClaim`)
- Modify: `backend/app/services/subdomain.py` (tambah `is_taken`, `check`)
- Modify: `backend/app/routers/portfolio.py` (`_as_out`, 2 endpoint baru)
- Test: `backend/test_subdomain.py`

**Interfaces:**
- Consumes: Task 1 (`normalize`, `invalid_reason`, `as_utc`, `next_change_at`, `HOLD_DURATION`)
- Produces:
  - Model `SubdomainHold(name: str PK, portfolio_id: UUID, expires_at: datetime)`; `Portfolio.subdomain: str | None`, `Portfolio.subdomain_changed_at: datetime | None`; `User.plan: str`
  - `subdomain.check(db, raw_name: str, portfolio_id, now) -> {"name": str, "available": bool, "reason": str | None}`
  - `settings.portfolio_root_domain` (default `"githire.my.id"`), `settings.portfolio_subdomains_live` (default `False`)
  - JSON `PortfolioOut` bertambah: `subdomain`, `subdomain_changed_at`, `subdomain_url` (`https://{name}.{root}` atau null), `subdomain_live` (bool). `public_url` = `subdomain_url` bila live dan ada subdomain, selain itu `/p/{public_id}`.
  - `GET /me/portfolio/subdomain/check?name=` → bentuk `check()`
  - `PUT /me/portfolio/subdomain` body `{"name": str}` → `PortfolioOut`; error 404/409/422/429 dengan `detail` Bahasa Indonesia

- [ ] **Step 1: Write the failing tests**

Tambahkan ke `backend/test_subdomain.py` (import di atas file, class baru sebelum blok `if __name__`):

```python
import uuid
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth import get_current_user
from app.config import settings
from app.database import Base, get_db
from app.main import app
from app.models import CandidateProfile, Portfolio, SubdomainHold, User


class SubdomainApiTestCase(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, expire_on_commit=False)
        db = self.Session()
        self.u1 = User(id=uuid.uuid4(), clerk_user_id="u1", email="u1@example.com", role="candidate")
        self.u2 = User(id=uuid.uuid4(), clerk_user_id="u2", email="u2@example.com", role="candidate")
        self.u3 = User(id=uuid.uuid4(), clerk_user_id="u3", email="u3@example.com", role="candidate")
        self.p1 = Portfolio(
            id=uuid.uuid4(), user_id=self.u1.id, public_id="pub1", status="published",
            published_content={"name": "Satu", "headline": "Dev", "bio": ""},
        )
        self.p2 = Portfolio(id=uuid.uuid4(), user_id=self.u2.id, public_id="pub2", status="draft")
        db.add_all([
            self.u1, self.u2, self.u3, self.p1, self.p2,
            CandidateProfile(user_id=self.u1.id, github_legacy_grandfathered=True),
        ])
        db.commit()
        db.close()

        def override_db():
            session = self.Session()
            try:
                yield session
            finally:
                session.close()

        self.current = self.u1
        app.dependency_overrides[get_db] = override_db
        app.dependency_overrides[get_current_user] = lambda: self.current
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()

    def claim(self, name):
        return self.client.put("/me/portfolio/subdomain", json={"name": name})

    def check(self, name):
        return self.client.get("/me/portfolio/subdomain/check", params={"name": name}).json()

    def backdate_change(self, portfolio_id, days):
        db = self.Session()
        portfolio = db.get(Portfolio, portfolio_id)
        portfolio.subdomain_changed_at = datetime.now(timezone.utc) - timedelta(days=days)
        db.commit()
        db.close()

    def hold(self, name):
        db = self.Session()
        try:
            return db.get(SubdomainHold, name)
        finally:
            db.close()


class SubdomainClaimTests(SubdomainApiTestCase):
    def test_check_reports_availability_and_reasons(self):
        self.assertEqual(self.check(" Rozagi "), {"name": "rozagi", "available": True, "reason": None})
        self.assertEqual(self.check("www")["reason"], "reserved")
        self.assertEqual(self.check("a")["reason"], "invalid")

    def test_first_claim_sets_name_without_switching_public_url(self):
        res = self.claim("Rozagi")
        self.assertEqual(res.status_code, 200, res.text)
        body = res.json()
        self.assertEqual(body["subdomain"], "rozagi")
        self.assertEqual(body["subdomain_url"], "https://rozagi.githire.my.id")
        self.assertFalse(body["subdomain_live"])
        self.assertEqual(body["public_url"], "/p/pub1")
        self.assertIsNotNone(body["subdomain_changed_at"])

    def test_public_url_uses_subdomain_when_live(self):
        with patch.object(settings, "portfolio_subdomains_live", True):
            body = self.claim("rozagi").json()
        self.assertTrue(body["subdomain_live"])
        self.assertEqual(body["public_url"], "https://rozagi.githire.my.id")

    def test_taken_name_is_rejected(self):
        self.assertEqual(self.claim("rozagi").status_code, 200)
        self.current = self.u2
        res = self.claim("rozagi")
        self.assertEqual(res.status_code, 409, res.text)
        self.assertEqual(self.check("rozagi")["reason"], "taken")

    def test_invalid_and_reserved_names_are_rejected(self):
        self.assertEqual(self.claim("a").status_code, 422)
        self.assertEqual(self.claim("admin").status_code, 422)

    def test_claiming_current_name_again_is_a_noop(self):
        first = self.claim("rozagi").json()
        second = self.claim("ROZAGI")
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.json()["subdomain_changed_at"], first["subdomain_changed_at"])

    def test_change_within_30_days_is_rejected(self):
        self.claim("satu")
        res = self.claim("dua")
        self.assertEqual(res.status_code, 429, res.text)

    def test_change_after_cooldown_holds_old_name(self):
        self.claim("satu")
        self.backdate_change(self.p1.id, 31)
        self.assertEqual(self.claim("dua").status_code, 200)
        hold = self.hold("satu")
        self.assertIsNotNone(hold)
        self.assertEqual(hold.portfolio_id, self.p1.id)
        self.current = self.u2
        self.assertEqual(self.claim("satu").status_code, 409)

    def test_owner_can_reclaim_held_name(self):
        self.claim("satu")
        self.backdate_change(self.p1.id, 31)
        self.claim("dua")
        self.backdate_change(self.p1.id, 31)
        res = self.claim("satu")
        self.assertEqual(res.status_code, 200, res.text)
        self.assertIsNone(self.hold("satu"))
        self.assertIsNotNone(self.hold("dua"))

    def test_expired_hold_is_free_for_others(self):
        db = self.Session()
        db.add(SubdomainHold(name="lama", portfolio_id=self.p1.id, expires_at=datetime.now(timezone.utc) - timedelta(days=1)))
        db.commit()
        db.close()
        self.current = self.u2
        self.assertEqual(self.claim("lama").status_code, 200)

    def test_user_without_portfolio_gets_404(self):
        self.current = self.u3
        self.assertEqual(self.claim("tigaa").status_code, 404)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m unittest test_subdomain -v`
Expected: ERROR `ImportError: cannot import name 'SubdomainHold' from 'app.models'`

- [ ] **Step 3: Model, config, migration**

`backend/app/models.py`, di class `User` setelah baris `is_premium`:

```python
    # Paket kandidat: free | premium. Belum dipakai untuk gating (subdomain gratis saat early access).
    plan: Mapped[str] = mapped_column(String(16), default="free", server_default="free")
```

Di class `Portfolio`, setelah `published_at`:

```python
    # Alamat nama.githire.my.id; NULL = belum diklaim.
    subdomain: Mapped[str | None] = mapped_column(String(30), unique=True, nullable=True)
    subdomain_changed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
```

Setelah class `Portfolio` (sebelum `class Job`):

```python
class SubdomainHold(Base):
    """Nama subdomain lama yang ditahan 30 hari: redirect ke nama baru, tidak bisa diklaim orang lain."""

    __tablename__ = "subdomain_holds"

    name: Mapped[str] = mapped_column(String(30), primary_key=True)
    portfolio_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("portfolios.id", ondelete="CASCADE"), index=True
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
```

`backend/app/config.py`, di class `Settings` setelah `admin_emails`:

```python
    portfolio_root_domain: str = "githire.my.id"
    # True setelah DNS wildcard *.githire.my.id aktif di Vercel; sebelum itu public_url tetap /p/{id}.
    portfolio_subdomains_live: bool = False
```

`backend/app/main.py`, setelah blok `# DDL Migration: identitas GitHub terverifikasi via Clerk` (setelah `conn.commit()` blok itu):

```python
    # DDL Migration: subdomain portfolio (nama.githire.my.id) + paket user
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS subdomain VARCHAR(30) NULL"))
        conn.execute(text("ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS subdomain_changed_at TIMESTAMPTZ NULL"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_portfolios_subdomain ON portfolios (subdomain)"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS subdomain_holds (
                name VARCHAR(30) PRIMARY KEY,
                portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
                expires_at TIMESTAMPTZ NOT NULL
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_subdomain_holds_portfolio ON subdomain_holds (portfolio_id)"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(16) NOT NULL DEFAULT 'free'"))
        conn.commit()
```

- [ ] **Step 4: Service cek ketersediaan**

Tambahkan ke `backend/app/services/subdomain.py` (import di atas, fungsi di bawah):

```python
from sqlalchemy.orm import Session

from app.models import Portfolio, SubdomainHold


def is_taken(db: Session, name: str, portfolio_id, now: datetime) -> bool:
    """Dipakai portfolio lain, atau sedang ditahan untuk portfolio lain."""
    other = db.query(Portfolio).filter(Portfolio.subdomain == name)
    if portfolio_id is not None:
        other = other.filter(Portfolio.id != portfolio_id)
    if other.first():
        return True
    hold = db.get(SubdomainHold, name)
    return bool(hold and as_utc(hold.expires_at) > now and hold.portfolio_id != portfolio_id)


def check(db: Session, raw_name: str, portfolio_id, now: datetime) -> dict:
    name = normalize(raw_name)
    reason = invalid_reason(name) or ("taken" if is_taken(db, name, portfolio_id, now) else None)
    return {"name": name, "available": reason is None, "reason": reason}
```

- [ ] **Step 5: Schema**

`backend/app/schemas.py`, ganti class `PortfolioOut` dan tambahkan `SubdomainClaim` setelahnya:

```python
class PortfolioOut(BaseModel):
    public_id: str
    status: Literal["draft", "published"]
    draft_content: dict | None = None
    published_content: dict | None = None
    has_photo: bool = False
    public_url: str
    published_at: datetime | None = None
    updated_at: datetime | None = None
    subdomain: str | None = None
    subdomain_changed_at: datetime | None = None
    subdomain_url: str | None = None
    subdomain_live: bool = False


class SubdomainClaim(BaseModel):
    name: str = Field(max_length=64)
```

`Field` sudah diimpor dari `pydantic` di `schemas.py`.

- [ ] **Step 6: Router**

`backend/app/routers/portfolio.py`:

Import (gabungkan dengan import yang ada):

```python
from sqlalchemy.exc import IntegrityError

from app.models import CandidateProfile, Portfolio, SubdomainHold, User
from app.schemas import PortfolioGenerateRequest, PortfolioOut, PortfolioPatch, SubdomainClaim
from app.services import subdomain as subdomain_rules
```

Ganti `return PortfolioOut(...)` di `_as_out` dengan:

```python
    subdomain_url = (
        f"https://{portfolio.subdomain}.{settings.portfolio_root_domain}" if portfolio.subdomain else None
    )
    live = settings.portfolio_subdomains_live
    return PortfolioOut(
        public_id=portfolio.public_id,
        status=portfolio.status,
        draft_content=draft_content,
        published_content=published_content,
        has_photo=bool(portfolio.draft_photo),
        public_url=subdomain_url if live and subdomain_url else f"/p/{portfolio.public_id}",
        published_at=portfolio.published_at,
        updated_at=portfolio.updated_at,
        subdomain=portfolio.subdomain,
        subdomain_changed_at=portfolio.subdomain_changed_at,
        subdomain_url=subdomain_url,
        subdomain_live=live,
    )
```

Tambahkan setelah endpoint `unpublish` (sebelum endpoint foto):

```python
SUBDOMAIN_ERRORS = {
    "invalid": "Alamat harus 3-30 karakter: huruf kecil, angka, atau tanda -, tidak diawali atau diakhiri -.",
    "reserved": "Alamat ini dipakai sistem GitHire. Pilih nama lain.",
    "taken": "Alamat ini sudah dipakai. Pilih nama lain.",
}


@router.get("/me/portfolio/subdomain/check")
def check_subdomain(
    name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_candidate(current_user)
    portfolio = db.query(Portfolio).filter(Portfolio.user_id == current_user.id).first()
    return subdomain_rules.check(db, name, portfolio.id if portfolio else None, datetime.now(timezone.utc))


@router.put("/me/portfolio/subdomain", response_model=PortfolioOut)
def claim_subdomain(
    payload: SubdomainClaim,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_candidate(current_user)
    portfolio = db.query(Portfolio).filter(Portfolio.user_id == current_user.id).first()
    if not portfolio:
        raise HTTPException(404, "Buat portfolio terlebih dahulu.")
    now = datetime.now(timezone.utc)
    result = subdomain_rules.check(db, payload.name, portfolio.id, now)
    name = result["name"]
    if name == portfolio.subdomain:
        return _as_out(portfolio)
    if result["reason"] in ("invalid", "reserved"):
        raise HTTPException(422, SUBDOMAIN_ERRORS[result["reason"]])
    if result["reason"] == "taken":
        raise HTTPException(409, SUBDOMAIN_ERRORS["taken"])
    allowed_at = subdomain_rules.next_change_at(portfolio.subdomain_changed_at, now) if portfolio.subdomain else None
    if allowed_at:
        raise HTTPException(429, f"Alamat bisa diganti lagi mulai {allowed_at:%d-%m-%Y}.")

    # Hold atas nama ini (milik sendiri atau sudah kedaluwarsa) dilepas.
    db.query(SubdomainHold).filter(SubdomainHold.name == name).delete()
    old_name = portfolio.subdomain
    if old_name:
        hold = db.get(SubdomainHold, old_name)
        if hold:
            hold.portfolio_id = portfolio.id
            hold.expires_at = now + subdomain_rules.HOLD_DURATION
        else:
            db.add(SubdomainHold(name=old_name, portfolio_id=portfolio.id, expires_at=now + subdomain_rules.HOLD_DURATION))
    portfolio.subdomain = name
    portfolio.subdomain_changed_at = now
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, SUBDOMAIN_ERRORS["taken"])
    db.refresh(portfolio)
    return _as_out(portfolio)
```

- [ ] **Step 7: Run tests**

Run: `python -m unittest test_subdomain -v`
Expected: semua test (6 aturan + 10 klaim) OK

Run juga: `python -m unittest test_portfolio -v`
Expected: OK (tidak ada regresi `_as_out`)

- [ ] **Step 8: Commit**

```bash
git add backend/app/models.py backend/app/main.py backend/app/config.py backend/app/schemas.py backend/app/services/subdomain.py backend/app/routers/portfolio.py backend/test_subdomain.py
git commit -m "feat(subdomain): claim and check portfolio subdomains"
```

---

### Task 3: Resolve publik + subdomain di portfolio publik

**Files:**
- Modify: `backend/app/routers/public.py`
- Modify: `backend/app/routers/portfolio.py` (`get_public_portfolio`)
- Test: `backend/test_subdomain.py`

**Interfaces:**
- Consumes: Task 2 (`SubdomainHold`, `Portfolio.subdomain`, `subdomain_rules.normalize/as_utc`)
- Produces:
  - `GET /public/subdomains/{name}` → 200 `{"public_id": str}` | 200 `{"redirect_to": str}` | 404; header `Cache-Control: public, max-age=60`
  - `GET /portfolios/{public_id}` JSON bertambah `"subdomain": str | null`

- [ ] **Step 1: Write the failing tests**

Tambahkan ke `backend/test_subdomain.py`:

```python
class SubdomainResolveTests(SubdomainApiTestCase):
    def test_resolves_published_portfolio(self):
        self.claim("rozagi")
        res = self.client.get("/public/subdomains/Rozagi")
        self.assertEqual(res.status_code, 200, res.text)
        self.assertEqual(res.json(), {"public_id": "pub1"})
        self.assertEqual(res.headers.get("cache-control"), "public, max-age=60")

    def test_unpublished_portfolio_is_404(self):
        self.current = self.u2
        self.claim("draf")
        self.assertEqual(self.client.get("/public/subdomains/draf").status_code, 404)

    def test_unknown_name_is_404(self):
        self.assertEqual(self.client.get("/public/subdomains/tidakada").status_code, 404)

    def test_held_name_redirects_to_new_name(self):
        self.claim("satu")
        self.backdate_change(self.p1.id, 31)
        self.claim("dua")
        res = self.client.get("/public/subdomains/satu")
        self.assertEqual(res.status_code, 200, res.text)
        self.assertEqual(res.json(), {"redirect_to": "dua"})

    def test_public_portfolio_includes_subdomain(self):
        self.claim("rozagi")
        res = self.client.get("/portfolios/pub1")
        self.assertEqual(res.status_code, 200, res.text)
        self.assertEqual(res.json()["subdomain"], "rozagi")
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m unittest test_subdomain.SubdomainResolveTests -v`
Expected: FAIL (404 untuk `/public/subdomains/...` yang belum ada; `KeyError: 'subdomain'`)

- [ ] **Step 3: Implement**

`backend/app/routers/public.py`, ganti import menjadi:

```python
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Job, Portfolio, SubdomainHold
from app.services.subdomain import as_utc, normalize
```

Tambahkan di akhir file:

```python
SUBDOMAIN_CACHE = {"Cache-Control": "public, max-age=60"}


@router.get("/subdomains/{name}")
def resolve_subdomain(name: str, db: Session = Depends(get_db)):
    """Petakan nama.githire.my.id ke portfolio publik, atau ke nama barunya bila sudah diganti."""
    name = normalize(name)
    portfolio = db.query(Portfolio).filter(Portfolio.subdomain == name).first()
    if portfolio:
        if portfolio.status == "published" and portfolio.published_content:
            return JSONResponse({"public_id": portfolio.public_id}, headers=SUBDOMAIN_CACHE)
    else:
        hold = db.get(SubdomainHold, name)
        if hold and as_utc(hold.expires_at) > datetime.now(timezone.utc):
            owner = db.get(Portfolio, hold.portfolio_id)
            if owner and owner.subdomain:
                return JSONResponse({"redirect_to": owner.subdomain}, headers=SUBDOMAIN_CACHE)
    return JSONResponse({"detail": "Alamat portfolio tidak ditemukan."}, status_code=404, headers=SUBDOMAIN_CACHE)
```

`backend/app/routers/portfolio.py`, di `get_public_portfolio` setelah baris `view["github_verified"] = ...`:

```python
    view["subdomain"] = portfolio.subdomain
```

- [ ] **Step 4: Run tests**

Run: `python -m unittest test_subdomain test_public_jobs test_portfolio -v`
Expected: OK

Run seluruh suite: `python -m unittest discover -p "test_*.py"`
Expected: OK (sama jumlah gagal dengan sebelum perubahan, idealnya 0)

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/public.py backend/app/routers/portfolio.py backend/test_subdomain.py
git commit -m "feat(subdomain): public resolve endpoint"
```

---

### Task 4: Helper host (frontend, murni)

**Files:**
- Create: `linkify/src/utils/functions/subdomain-host.ts`
- Test: `linkify/tests/subdomain-host.test.mts`

**Interfaces:**
- Produces:
  - `ROOT_DOMAIN: string` (`process.env.NEXT_PUBLIC_ROOT_DOMAIN || "githire.my.id"`)
  - `subdomainFromHost(host: string | null | undefined, rootDomain?: string): string | null`
  - `subdomainUrl(name: string, rootDomain?: string): string` → `https://{name}.{root}`
  - `toSubdomainCandidate(value: string | null | undefined): string | null`

- [ ] **Step 1: Write the failing test**

Create `linkify/tests/subdomain-host.test.mts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { subdomainFromHost, subdomainUrl, toSubdomainCandidate } from "../src/utils/functions/subdomain-host.ts";

test("subdomainFromHost membaca nama dari host portfolio", () => {
    assert.equal(subdomainFromHost("rozagi.githire.my.id", "githire.my.id"), "rozagi");
    assert.equal(subdomainFromHost("Rozagi.GitHire.my.id:443", "githire.my.id"), "rozagi");
    assert.equal(subdomainFromHost("rozagi.localhost:3000", "githire.my.id"), "rozagi");
});

test("subdomainFromHost mengabaikan host aplikasi", () => {
    for (const host of ["githire.my.id", "www.githire.my.id", "localhost:3000", "linkify-abc.vercel.app", "a.b.githire.my.id", "", null, undefined]) {
        assert.equal(subdomainFromHost(host, "githire.my.id"), null, String(host));
    }
});

test("subdomainUrl", () => {
    assert.equal(subdomainUrl("rozagi", "githire.my.id"), "https://rozagi.githire.my.id");
});

test("toSubdomainCandidate merapikan username GitHub", () => {
    assert.equal(toSubdomainCandidate("Rozagi_Dev"), "rozagi-dev");
    assert.equal(toSubdomainCandidate("--a..b--"), "a-b");
    assert.equal(toSubdomainCandidate("ab"), null);
    assert.equal(toSubdomainCandidate(null), null);
    assert.equal(toSubdomainCandidate("x".repeat(40)), "x".repeat(30));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (dari `linkify/`): `node --test tests/subdomain-host.test.mts`
Expected: FAIL `Cannot find module .../subdomain-host.ts`

- [ ] **Step 3: Implement**

Create `linkify/src/utils/functions/subdomain-host.ts`:

```ts
/** Domain tempat portfolio tinggal sebagai nama.githire.my.id. */
export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "githire.my.id";

const APP_LABELS = new Set(["www"]);

/**
 * Nama subdomain portfolio dari header Host, atau null untuk host aplikasi
 * (root, www, preview Vercel, localhost biasa). `nama.localhost` dipakai saat dev.
 */
export function subdomainFromHost(host: string | null | undefined, rootDomain: string = ROOT_DOMAIN): string | null {
    if (!host) return null;
    const hostname = host.split(":")[0].toLowerCase();
    for (const root of [rootDomain.toLowerCase(), "localhost"]) {
        if (!hostname.endsWith(`.${root}`)) continue;
        const label = hostname.slice(0, -(root.length + 1));
        if (!label || label.includes(".") || APP_LABELS.has(label)) return null;
        return label;
    }
    return null;
}

export function subdomainUrl(name: string, rootDomain: string = ROOT_DOMAIN): string {
    return `https://${name}.${rootDomain}`;
}

/** Usulan nama dari username GitHub; null bila hasilnya kurang dari 3 karakter. */
export function toSubdomainCandidate(value: string | null | undefined): string | null {
    const cleaned = (value ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 30)
        .replace(/-$/, "");
    return cleaned.length >= 3 ? cleaned : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/subdomain-host.test.mts`
Expected: 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add linkify/src/utils/functions/subdomain-host.ts linkify/tests/subdomain-host.test.mts
git commit -m "feat(subdomain): host parsing helpers"
```

---

### Task 5: Routing subdomain (middleware, `/s/[name]`, komponen bersama)

**Files:**
- Create: `linkify/src/components/portfolio/public-portfolio-page.tsx`
- Modify: `linkify/src/app/p/[publicId]/page.tsx` (ganti seluruh isi)
- Create: `linkify/src/app/s/[name]/page.tsx`
- Modify: `linkify/src/middleware.ts` (ganti seluruh isi)
- Modify: `linkify/src/components/portfolio/types.ts` (`PublicPortfolio`)

**Interfaces:**
- Consumes: Task 3 (`GET /public/subdomains/{name}`, `subdomain` di `/portfolios/{id}`), Task 4 (`subdomainFromHost`, `subdomainUrl`, `ROOT_DOMAIN`)
- Produces:
  - `fetchPublicPortfolio(publicId: string): Promise<PublicPortfolio | null>`
  - `<PublicPortfolioPage publicId theme? embed? />` (async server component)
  - `portfolioMetadata(portfolio: PublicPortfolio | null): Metadata`

- [ ] **Step 1: Tipe**

`linkify/src/components/portfolio/types.ts`, di `PublicPortfolio` setelah `github_verified?: boolean;`:

```ts
    /** Alamat nama.githire.my.id bila sudah diklaim. */
    subdomain?: string | null;
```

- [ ] **Step 2: Komponen bersama**

Create `linkify/src/components/portfolio/public-portfolio-page.tsx` (logika dipindah dari `/p/[publicId]/page.tsx`):

```tsx
import { PublicPortfolioView } from "@/components/portfolio/public-portfolio";
import type { PortfolioTheme, PublicPortfolio } from "@/components/portfolio/types";
import { subdomainUrl } from "@/utils/functions/subdomain-host";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

const THEMES: PortfolioTheme[] = ["editorial", "developer", "professional", "maestro"];

export const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

/** Fetch identik di generateMetadata dan page di-memoize Next, jadi hanya satu request. */
export async function fetchPublicPortfolio(publicId: string): Promise<PublicPortfolio | null> {
    const response = await fetch(`${apiBase}/portfolios/${encodeURIComponent(publicId)}`, { cache: "no-store" });
    return response.ok ? ((await response.json()) as PublicPortfolio) : null;
}

export function portfolioMetadata(portfolio: PublicPortfolio | null): Metadata {
    return {
        title: portfolio?.content.name ? `${portfolio.content.name} · Portfolio` : "Developer Portfolio · GitHire",
        robots: { index: false, follow: false },
        alternates: portfolio?.subdomain ? { canonical: subdomainUrl(portfolio.subdomain) } : undefined,
    };
}

type Props = { publicId: string; theme?: string; embed?: boolean };

export async function PublicPortfolioPage({ publicId, theme, embed = false }: Props) {
    const fetched = await fetchPublicPortfolio(publicId);
    if (!fetched) notFound();

    // ?theme= hanya mengganti tampilan (pratinjau di landing); isi tetap milik pemilik.
    // ?embed=1 dipakai iframe landing: tanpa email dan tanpa chip mengambang.
    const themeOverride = THEMES.find((item) => item === theme);
    const contacts = { ...(fetched.content.contacts ?? {}) };
    if (embed) delete contacts.email;
    const portfolio: PublicPortfolio = {
        ...fetched,
        content: { ...fetched.content, theme: themeOverride ?? fetched.content.theme, contacts },
    };

    // Tema Editorial sudah punya stiker "GitHub verified" sendiri.
    const showVerifiedChip = fetched.github_verified && !embed && portfolio.content.theme !== "editorial";

    return (
        <>
            <PublicPortfolioView portfolio={portfolio} apiBase={apiBase} />
            {showVerifiedChip && (
                // Di luar tema supaya konsisten di semua tampilan portfolio.
                <p className="fixed bottom-4 right-4 z-40 rounded-full border border-zinc-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-zinc-800 shadow-sm">
                    <span className="text-emerald-600">✓</span> GitHub terverifikasi oleh GitHire
                </p>
            )}
        </>
    );
}
```

- [ ] **Step 3: `/p/[publicId]` jadi tipis**

Replace `linkify/src/app/p/[publicId]/page.tsx`:

```tsx
import { fetchPublicPortfolio, PublicPortfolioPage, portfolioMetadata } from "@/components/portfolio/public-portfolio-page";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = {
    params: { publicId: string };
    searchParams: { theme?: string; embed?: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    return portfolioMetadata(await fetchPublicPortfolio(params.publicId));
}

export default function PublicPortfolioRoute({ params, searchParams }: Props) {
    return <PublicPortfolioPage publicId={params.publicId} theme={searchParams.theme} embed={searchParams.embed === "1"} />;
}
```

- [ ] **Step 4: Route `/s/[name]`**

Create `linkify/src/app/s/[name]/page.tsx`:

```tsx
import { apiBase, fetchPublicPortfolio, PublicPortfolioPage, portfolioMetadata } from "@/components/portfolio/public-portfolio-page";
import { subdomainUrl } from "@/utils/functions/subdomain-host";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { params: { name: string } };
type Resolved = { public_id?: string; redirect_to?: string };

// Dipanggil lewat rewrite middleware dari nama.githire.my.id.
async function resolve(name: string): Promise<Resolved | null> {
    const response = await fetch(`${apiBase}/public/subdomains/${encodeURIComponent(name)}`, { next: { revalidate: 60 } });
    return response.ok ? ((await response.json()) as Resolved) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const resolved = await resolve(params.name);
    return portfolioMetadata(resolved?.public_id ? await fetchPublicPortfolio(resolved.public_id) : null);
}

export default async function SubdomainPortfolioRoute({ params }: Props) {
    const resolved = await resolve(params.name);
    if (resolved?.redirect_to) permanentRedirect(subdomainUrl(resolved.redirect_to));
    if (!resolved?.public_id) notFound();
    return <PublicPortfolioPage publicId={resolved.public_id} />;
}
```

- [ ] **Step 5: Middleware**

Replace `linkify/src/middleware.ts`:

```ts
import { subdomainFromHost, ROOT_DOMAIN } from "@/utils/functions/subdomain-host";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

const isDashboardRoute = createRouteMatcher(["/dashboard(.*)"]);

const clerk = clerkMiddleware(async (auth, req) => {
    if (isDashboardRoute(req)) {
        await auth().protect();
    }
});

export default function middleware(req: NextRequest, event: NextFetchEvent) {
    // nama.githire.my.id hanya melayani portfolio publik; Clerk tidak dijalankan di sana.
    const name = subdomainFromHost(req.headers.get("host"));
    if (name) {
        if (req.nextUrl.pathname === "/") {
            return NextResponse.rewrite(new URL(`/s/${name}`, req.url));
        }
        return NextResponse.redirect(new URL(`${req.nextUrl.pathname}${req.nextUrl.search}`, `https://www.${ROOT_DOMAIN}`), 307);
    }
    return clerk(req, event);
}

export const config = {
    matcher: [
        "/((?!.*\\..*|_next).*)",
        "/(api|trpc)(.*)",
        "/dashboard(.*)",
        "/",
        "/auth/sign-in",
        "/auth/sign-up",
    ],
};
```

- [ ] **Step 6: Typecheck dan build**

Run (dari `linkify/`): `npx tsc --noEmit`
Expected: exit 0

Run: hentikan server lain di port 3100 dulu, lalu `NEXT_PUBLIC_API_URL=https://githire.up.railway.app npx next build`
Expected: build sukses; `/s/[name]` dan `/p/[publicId]` tercantum sebagai `ƒ` (dynamic)

- [ ] **Step 7: Uji host lokal tanpa DNS**

Jalankan `NEXT_PUBLIC_API_URL=https://githire.up.railway.app npx next start -p 3100` (background), lalu:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: tidakada.localhost:3100" http://localhost:3100/
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" -H "Host: tidakada.localhost:3100" http://localhost:3100/dashboard
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100/p/kBvAyQPhGD
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100/
```

Expected:
- `404` (nama belum ada; production API belum punya endpoint baru sampai backend ter-deploy, 404 juga benar)
- `307 https://www.githire.my.id/dashboard`
- `200` (route lama tetap jalan)
- `200` (landing tidak terpengaruh)

Hentikan server setelahnya (bunuh proses yang listen di port 3100, bukan hanya task shell-nya).

- [ ] **Step 8: Commit**

```bash
git add linkify/src/components/portfolio/public-portfolio-page.tsx "linkify/src/app/p/[publicId]/page.tsx" "linkify/src/app/s/[name]/page.tsx" linkify/src/middleware.ts linkify/src/components/portfolio/types.ts
git commit -m "feat(subdomain): route nama.githire.my.id to public portfolios"
```

---

### Task 6: Kartu "Alamat portfolio" di editor

**Files:**
- Create: `linkify/src/components/portfolio/subdomain-card.tsx`
- Modify: `linkify/src/components/portfolio/types.ts` (`PortfolioRecord`)
- Modify: `linkify/src/components/portfolio/portfolio-editor.tsx` (type `Profile`, `copyLink`, aside)

**Interfaces:**
- Consumes: Task 2 (`GET /me/portfolio/subdomain/check`, `PUT /me/portfolio/subdomain`, field `PortfolioRecord`), Task 4 (`toSubdomainCandidate`, `ROOT_DOMAIN`)
- Produces: `<SubdomainCard portfolio={PortfolioRecord} suggestion={string | null} />`

- [ ] **Step 1: Tipe**

`linkify/src/components/portfolio/types.ts`, di `PortfolioRecord` setelah `updated_at`:

```ts
    subdomain: string | null;
    subdomain_changed_at: string | null;
    subdomain_url: string | null;
    /** false sampai DNS wildcard aktif; public_url masih /p/{id}. */
    subdomain_live: boolean;
```

- [ ] **Step 2: Komponen kartu**

Create `linkify/src/components/portfolio/subdomain-card.tsx`:

```tsx
"use client";

import { useApi } from "@/hooks/use-api";
import { ApiError } from "@/lib/api";
import { ROOT_DOMAIN, toSubdomainCandidate } from "@/utils/functions/subdomain-host";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import type { PortfolioRecord } from "./types";

type Check = { name: string; available: boolean; reason: "invalid" | "reserved" | "taken" | null };

const REASON_COPY: Record<NonNullable<Check["reason"]>, string> = {
    invalid: "3-30 karakter: huruf kecil, angka, atau tanda -, tidak diawali atau diakhiri -.",
    reserved: "Nama ini dipakai sistem GitHire.",
    taken: "Sudah dipakai orang lain.",
};

/** Klaim atau ganti alamat nama.githire.my.id untuk portfolio publik. */
export function SubdomainCard({ portfolio, suggestion }: { portfolio: PortfolioRecord; suggestion: string | null }) {
    const { withAuth } = useApi();
    const queryClient = useQueryClient();
    const current = portfolio.subdomain;
    const [value, setValue] = useState(current ?? toSubdomainCandidate(suggestion) ?? "");
    const [check, setCheck] = useState<Check | null>(null);
    const [saving, setSaving] = useState(false);
    const name = value.trim().toLowerCase();
    const unchanged = name === (current ?? "");

    useEffect(() => {
        setCheck(null);
        if (!name || unchanged) return;
        const timer = window.setTimeout(() => {
            withAuth<Check>(`/me/portfolio/subdomain/check?name=${encodeURIComponent(name)}`)
                .then((result) => setCheck(result.name === name ? result : null))
                .catch(() => setCheck(null));
        }, 400);
        return () => window.clearTimeout(timer);
    }, [name, unchanged, withAuth]);

    const save = async () => {
        setSaving(true);
        try {
            const record = await withAuth<PortfolioRecord>("/me/portfolio/subdomain", {
                method: "PUT",
                body: JSON.stringify({ name }),
            });
            queryClient.setQueryData(["portfolio"], record);
            toast.success(`Alamat portfolio: ${record.subdomain}.${ROOT_DOMAIN}`);
        } catch (error) {
            toast.error(error instanceof ApiError ? error.message : "Gagal menyimpan alamat. Coba lagi.");
        } finally {
            setSaving(false);
        }
    };

    const copy = async () => {
        if (!portfolio.subdomain_url) return;
        await navigator.clipboard.writeText(portfolio.subdomain_url);
        toast.success("Alamat disalin.");
    };

    return (
        <section className="border border-border p-4">
            <p className="text-meta uppercase tracking-wide text-muted-foreground">Alamat portfolio</p>
            <div className="mt-3 flex items-center rounded-md border border-border bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
                <input
                    aria-label="Nama alamat portfolio"
                    className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none"
                    value={value}
                    maxLength={30}
                    placeholder="namamu"
                    onChange={(event) => setValue(event.target.value)}
                />
                <span className="shrink-0 pr-3 text-xs text-muted-foreground">.{ROOT_DOMAIN}</span>
            </div>
            <p role="status" className="mt-1.5 min-h-4 text-xs">
                {check?.available && <span className="text-emerald-600">Tersedia.</span>}
                {check?.reason && <span className="text-destructive">{REASON_COPY[check.reason]}</span>}
            </p>
            <button
                type="button"
                className="mt-2 w-full rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={saving || unchanged || !check?.available}
                onClick={save}
            >
                {saving ? "Menyimpan…" : current ? "Ganti alamat" : "Pakai alamat ini"}
            </button>
            {portfolio.subdomain_url && (
                <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                    <a className="truncate font-semibold text-primary hover:underline" href={portfolio.subdomain_url} target="_blank" rel="noreferrer">
                        {portfolio.subdomain}.{ROOT_DOMAIN}
                    </a>
                    <button type="button" className="shrink-0 text-muted-foreground hover:text-foreground" onClick={copy}>Salin</button>
                </div>
            )}
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {!portfolio.subdomain_live
                    ? "Alamat ini aktif segera. Sambil menunggu, link /p/ tetap bisa dibagikan."
                    : portfolio.status !== "published"
                        ? "Alamat aktif setelah portfolio dipublish."
                        : "Bisa diganti sekali per 30 hari. Alamat lama tetap mengarah ke yang baru selama 30 hari."}
            </p>
        </section>
    );
}
```

- [ ] **Step 3: Pasang di editor**

`linkify/src/components/portfolio/portfolio-editor.tsx`:

1. Import (di bawah import `ThemePreviewCards`):

```tsx
import { SubdomainCard } from "./subdomain-card";
```

2. Type `Profile`, tambah field:

```tsx
    github_username?: string | null;
```

3. Ganti isi `copyLink`:

```tsx
    const copyLink = async () => {
        if (!portfolio) return;
        // public_url bisa absolut (subdomain) atau relatif (/p/{id}).
        const url = portfolio.public_url.startsWith("http") ? portfolio.public_url : `${window.location.origin}${portfolio.public_url}`;
        await navigator.clipboard.writeText(url);
        toast.success("Link portfolio disalin.");
    };
```

4. Di `<aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">`, sebagai anak pertama (sebelum section "Pilih presentasi"):

```tsx
                    {portfolio && <SubdomainCard portfolio={portfolio} suggestion={profile?.github_username ?? null} />}
```

- [ ] **Step 4: Verifikasi**

Run (dari `linkify/`): `npx tsc --noEmit` → exit 0
Run: `npx eslint src/components/portfolio/subdomain-card.tsx src/components/portfolio/portfolio-editor.tsx` → tanpa error baru
Run: `node --test tests/*.test.mts` → semua pass
Run: `grep -rn "—" src/components/portfolio/subdomain-card.tsx` → tidak ada output

- [ ] **Step 5: Commit**

```bash
git add linkify/src/components/portfolio/subdomain-card.tsx linkify/src/components/portfolio/types.ts linkify/src/components/portfolio/portfolio-editor.tsx
git commit -m "feat(subdomain): address card in portfolio editor"
```

---

### Task 7: Runbook migrasi DNS

**Files:**
- Create: `docs/runbooks/2026-10-15-dns-vercel-migration.md`

- [ ] **Step 1: Kumpulkan record yang ada sekarang**

Run (masing-masing, catat hasilnya ke runbook):

```bash
nslookup -type=A githire.my.id
nslookup -type=CNAME www.githire.my.id
nslookup -type=MX githire.my.id
nslookup -type=TXT githire.my.id
nslookup -type=CNAME clerk.githire.my.id
nslookup -type=CNAME accounts.githire.my.id
nslookup -type=CNAME clkmail.githire.my.id
nslookup -type=CNAME clk._domainkey.githire.my.id
nslookup -type=CNAME clk2._domainkey.githire.my.id
nslookup -type=TXT zmail._domainkey.githire.my.id
```

Catatan: daftar ini belum tentu lengkap (TXT verifikasi lain, DKIM Zoho dengan selector lain). Runbook wajib meminta pemilik mengekspor/menyalin semua record dari panel sitequ sebagai sumber kebenaran.

- [ ] **Step 2: Tulis runbook**

Create `docs/runbooks/2026-10-15-dns-vercel-migration.md` berisi:
1. Tabel semua record hasil Step 1 (tipe, nama, nilai, TTL) + instruksi "cocokkan dengan panel sitequ, tambahkan yang belum ada di tabel".
2. Langkah: Vercel → Project `linkify` → Settings → Domains: pastikan `githire.my.id` dan `www.githire.my.id` terdaftar; Vercel → Domains → `githire.my.id` → DNS Records: buat ulang setiap record dari tabel (kecuali A/CNAME root dan `www`, yang otomatis diurus Vercel setelah nameserver pindah).
3. Turunkan TTL di sitequ ke nilai terendah, tunggu sebesar TTL lama.
4. Di panel sitequ, ganti nameserver ke `ns1.vercel-dns.com` dan `ns2.vercel-dns.com`.
5. Verifikasi (perintah persis): `nslookup -type=NS githire.my.id` menunjukkan vercel-dns; `nslookup -type=MX githire.my.id` tetap Zoho; kirim email ke dan dari alamat `@githire.my.id`; dashboard Clerk → Domains semua hijau; login di `https://www.githire.my.id/auth/sign-in` berhasil.
6. Vercel → Project `linkify` → Domains → Add `*.githire.my.id`.
7. Railway → service `HACKATHON` → Variables: `PORTFOLIO_SUBDOMAINS_LIVE=true` (redeploy otomatis).
8. Uji: klaim nama di editor, buka `https://{nama}.githire.my.id`, pastikan portfolio tampil dan console bebas error. (Redirect nama lama tidak bisa diuji langsung karena cooldown 30 hari; sudah dicakup unittest.)
9. Rollback: kembalikan nameserver ke `ns1-ns4.sitequ.id` (record lama masih ada di sitequ, jangan dihapus sampai migrasi dinyatakan stabil 7 hari); set `PORTFOLIO_SUBDOMAINS_LIVE=false`.

- [ ] **Step 3: Commit**

```bash
git add docs/runbooks/2026-10-15-dns-vercel-migration.md
git commit -m "docs: DNS migration runbook for portfolio subdomains"
```

---

### Task 8: Deploy dan verifikasi production (butuh persetujuan user)

- [ ] **Step 1:** Minta persetujuan user untuk push. Setelah "gas": `git push origin master`, tunggu status commit (`/repos/zgii14/HACKATHON/commits/<sha>/status`) `success` untuk Vercel dan Railway.
- [ ] **Step 2:** Verifikasi backend production:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://githire.up.railway.app/public/subdomains/tidakada
```
Expected: `404`

- [ ] **Step 3:** Verifikasi `/p/kBvAyQPhGD` dan landing (`/`) masih 200, dan editor portfolio menampilkan kartu "Alamat portfolio" (minta user membuka `/dashboard/portfolio` karena butuh login).
- [ ] **Step 4:** Serahkan runbook Task 7 ke user. Setelah user selesai migrasi DNS + set env, uji `https://{nama}.githire.my.id` dan cek console bebas error Clerk.

---

## Self-Review

- Spec §1 Data → Task 2 (kolom, tabel, `users.plan`, aturan nama di Task 1).
- Spec §2 API → Task 2 (check, claim, 404/409/422/429, hold) + Task 3 (resolve, `subdomain` di portfolio publik).
- Spec §3 Routing → Task 4 (helper host) + Task 5 (middleware rewrite/redirect, `/s/[name]`, komponen bersama, canonical, `/p` tetap hidup).
- Spec §4 UI → Task 6 (kartu, debounce 400 ms, pesan per reason, pesan 429 dari backend, salin, keterangan cooldown/belum publish, `copyLink` absolut).
- Spec §5 DNS → Task 7 runbook + Task 8 Step 4.
- Spec §6 Testing → Task 1-3 unittest, Task 4 node test, Task 5 Step 7 uji host, Task 8 production.
- Tambahan di luar spec yang perlu diketahui: flag `PORTFOLIO_SUBDOMAINS_LIVE` agar `public_url` tidak mengarah ke subdomain sebelum DNS siap.
