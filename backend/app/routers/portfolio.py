import asyncio
import copy
import secrets
from datetime import datetime, timezone
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse, Response
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.auth import get_current_user
from app.database import get_db
from app.models import CandidateProfile, Portfolio, User
from app.schemas import PortfolioGenerateRequest, PortfolioOut, PortfolioPatch
from app.services.gemini_service import generate_portfolio_copy
from app.services.github_client import fetch_repo_readme
from app.services.portfolio import (
    build_fallback_draft,
    merge_draft,
    public_view,
    select_repositories,
    validate_publish,
)


router = APIRouter(tags=["portfolio"])
ALLOWED_PHOTO_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_PHOTO_BYTES = 2 * 1024 * 1024
GENERATE_COOLDOWN_SECONDS = 60


def _require_candidate(user: User) -> None:
    if user.role == "recruiter":
        raise HTTPException(403, "Portfolio hanya tersedia untuk kandidat.")


def _profile(db: Session, user_id) -> CandidateProfile:
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(400, "Lengkapi CV dan GitHub di onboarding terlebih dahulu.")
    return profile


def _new_public_id(db: Session) -> str:
    for _ in range(8):
        public_id = secrets.token_urlsafe(9).replace("_", "").replace("-", "")[:12]
        if len(public_id) >= 8 and not db.query(Portfolio).filter(Portfolio.public_id == public_id).first():
            return public_id
    raise HTTPException(503, "Gagal membuat link portfolio. Silakan coba lagi.")


def _as_out(portfolio: Portfolio) -> PortfolioOut:
    draft_content = {
        key: value
        for key, value in (portfolio.draft_content or {}).items()
        if not key.startswith("_")
    } or None
    published_content = {
        key: value
        for key, value in (portfolio.published_content or {}).items()
        if not key.startswith("_")
    } or None
    return PortfolioOut(
        public_id=portfolio.public_id,
        status=portfolio.status,
        draft_content=draft_content,
        published_content=published_content,
        has_photo=bool(portfolio.draft_photo),
        public_url=f"/p/{portfolio.public_id}",
        published_at=portfolio.published_at,
        updated_at=portfolio.updated_at,
    )


def _stored_repo_map(profile: CandidateProfile) -> dict[str, dict]:
    signals = profile.github_signals if isinstance(profile.github_signals, dict) else {}
    return {
        repo["name"]: repo
        for repo in signals.get("repos_detail") or []
        if isinstance(repo, dict) and isinstance(repo.get("name"), str)
    }


def _normalize_projects(profile: CandidateProfile, projects: list[dict]) -> list[dict]:
    stored = _stored_repo_map(profile)
    normalized: list[dict] = []
    for project in projects:
        repo = stored.get(project.get("repo_name"))
        if not repo or project.get("url") != repo.get("html_url"):
            raise HTTPException(422, "Project harus berasal dari repository GitHub milik kandidat.")
        normalized.append(
            {
                "repo_name": repo["name"],
                "url": repo["html_url"],
                "description": project.get("description") or "",
                "tech_stack": list((repo.get("languages") or {}).keys())[:8],
                "stars": max(int(repo.get("stars") or 0), 0),
                "own_commits": max(int(repo.get("own_commits") or 0), 0),
            }
        )
    return normalized


def _valid_http_url(value: str, hosts: tuple[str, ...] | None = None) -> bool:
    try:
        parsed = urlparse(value)
    except ValueError:
        return False
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return False
    return hosts is None or parsed.netloc.lower() in hosts


def _matches_image_signature(content: bytes, content_type: str) -> bool:
    if content_type == "image/jpeg":
        return content.startswith(b"\xff\xd8\xff")
    if content_type == "image/png":
        return content.startswith(b"\x89PNG\r\n\x1a\n")
    if content_type == "image/webp":
        return len(content) >= 12 and content.startswith(b"RIFF") and content[8:12] == b"WEBP"
    return False


def _validate_contacts(contacts: dict | None) -> None:
    if not contacts:
        return
    for key, entry in contacts.items():
        if not isinstance(entry, dict) or not entry.get("enabled"):
            continue
        value = str(entry.get("value") or "").strip()
        valid = bool(value)
        if key == "github":
            valid = _valid_http_url(value, ("github.com", "www.github.com"))
        elif key == "linkedin":
            valid = _valid_http_url(value, ("linkedin.com", "www.linkedin.com"))
        elif key == "website":
            valid = _valid_http_url(value)
        elif key == "email":
            valid = "@" in value and "\n" not in value and "\r" not in value
        elif key == "whatsapp":
            valid = value.lstrip("+").isdigit() and 8 <= len(value.lstrip("+")) <= 15
        if not valid:
            raise HTTPException(422, f"Kontak {key} tidak valid.")


@router.get("/me/portfolio", response_model=PortfolioOut | None)
def get_my_portfolio(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_candidate(user)
    portfolio = db.query(Portfolio).filter(Portfolio.user_id == user.id).first()
    return _as_out(portfolio) if portfolio else None


@router.post("/me/portfolio/generate", response_model=PortfolioOut)
async def generate_my_portfolio(
    payload: PortfolioGenerateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_candidate(user)
    profile = _profile(db, user.id)
    if not profile.cv_data or not profile.github_signals:
        raise HTTPException(400, "CV dan GitHub wajib disinkronkan sebelum generate portfolio.")

    portfolio = db.query(Portfolio).filter(Portfolio.user_id == user.id).first()
    generated_at = (portfolio.draft_content or {}).get("_generated_at") if portfolio else None
    if isinstance(generated_at, str):
        try:
            previous = datetime.fromisoformat(generated_at)
            if previous.tzinfo is None:
                previous = previous.replace(tzinfo=timezone.utc)
            remaining = GENERATE_COOLDOWN_SECONDS - (datetime.now(timezone.utc) - previous).total_seconds()
            if remaining > 0:
                raise HTTPException(429, f"Tunggu {int(remaining) + 1} detik sebelum generate ulang.")
        except ValueError:
            pass

    signals = dict(profile.github_signals)
    try:
        ranked = select_repositories(signals.get("repos_detail"), payload.repo_names)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    signals["repos_detail"] = ranked
    draft = build_fallback_draft(
        profile.cv_data,
        signals,
        profile.verified_skills or [],
        profile.bio_full_name,
        payload.language,
    )
    if draft is None:
        raise HTTPException(400, "Data CV dan GitHub belum cukup untuk membuat portfolio.")

    try:
        readmes = await asyncio.gather(
            *(fetch_repo_readme(profile.github_username or "", repo["name"]) for repo in ranked)
        )
        evidence = [{**repo, "readme": readme} for repo, readme in zip(ranked, readmes)]
        generated = await run_in_threadpool(
            generate_portfolio_copy,
            profile.cv_data,
            evidence,
            profile.verified_skills or [],
            payload.language,
        )
        descriptions = {
            item["repo_name"]: item["description"]
            for item in generated.get("projects") or []
            if isinstance(item, dict) and item.get("repo_name") and item.get("description")
        }
        draft["headline"] = generated.get("headline") or draft["headline"]
        draft["bio"] = generated.get("bio") or draft["bio"]
        for project in draft["projects"]:
            project["description"] = descriptions.get(project["repo_name"], project["description"])
        draft["ai_enhanced"] = True
    except Exception:
        draft["ai_enhanced"] = False

    draft["_generated_at"] = datetime.now(timezone.utc).isoformat()
    if not portfolio:
        portfolio = Portfolio(user_id=user.id, public_id=_new_public_id(db), status="draft")
        db.add(portfolio)
    portfolio.draft_content = draft
    portfolio.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(portfolio)
    return _as_out(portfolio)


@router.patch("/me/portfolio", response_model=PortfolioOut)
def patch_my_portfolio(
    payload: PortfolioPatch,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_candidate(user)
    profile = _profile(db, user.id)
    portfolio = db.query(Portfolio).filter(Portfolio.user_id == user.id).first()
    if not portfolio or not portfolio.draft_content:
        raise HTTPException(404, "Generate portfolio terlebih dahulu.")

    changes = payload.model_dump(exclude_unset=True)
    save_mode = changes.get("save_mode", "draft")
    if "projects" in changes:
        changes["projects"] = _normalize_projects(profile, changes["projects"] or [])
    if "contacts" in changes:
        _validate_contacts(changes["contacts"])
    draft = merge_draft(portfolio.draft_content, changes)
    portfolio.draft_content = draft
    portfolio.updated_at = datetime.now(timezone.utc)
    if save_mode == "publish":
        error = validate_publish(draft)
        if error:
            raise HTTPException(422, error)
        portfolio.published_content = copy.deepcopy(draft)
        portfolio.published_content["_verified_skills_snapshot"] = copy.deepcopy(profile.verified_skills or [])
        portfolio.published_photo = portfolio.draft_photo
        portfolio.published_photo_content_type = portfolio.draft_photo_content_type
        portfolio.status = "published"
        portfolio.published_at = portfolio.published_at or datetime.now(timezone.utc)
    db.commit()
    db.refresh(portfolio)
    return _as_out(portfolio)


@router.post("/me/portfolio/publish", response_model=PortfolioOut)
def publish_my_portfolio(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_candidate(user)
    portfolio = db.query(Portfolio).filter(Portfolio.user_id == user.id).first()
    if not portfolio:
        raise HTTPException(404, "Generate portfolio terlebih dahulu.")
    profile = _profile(db, user.id)
    error = validate_publish(portfolio.draft_content)
    if error:
        raise HTTPException(422, error)
    portfolio.published_content = copy.deepcopy(portfolio.draft_content)
    portfolio.published_content["_verified_skills_snapshot"] = copy.deepcopy(profile.verified_skills or [])
    portfolio.published_photo = portfolio.draft_photo
    portfolio.published_photo_content_type = portfolio.draft_photo_content_type
    portfolio.status = "published"
    portfolio.published_at = portfolio.published_at or datetime.now(timezone.utc)
    db.commit()
    db.refresh(portfolio)
    return _as_out(portfolio)


@router.post("/me/portfolio/unpublish", response_model=PortfolioOut)
def unpublish_my_portfolio(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_candidate(user)
    portfolio = db.query(Portfolio).filter(Portfolio.user_id == user.id).first()
    if not portfolio:
        raise HTTPException(404, "Portfolio belum dibuat.")
    portfolio.status = "draft"
    db.commit()
    db.refresh(portfolio)
    return _as_out(portfolio)


@router.post("/me/portfolio/photo", response_model=PortfolioOut)
async def upload_portfolio_photo(
    photo: UploadFile = File(...),
    save_mode: str = Form("draft"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_candidate(user)
    portfolio = db.query(Portfolio).filter(Portfolio.user_id == user.id).first()
    if not portfolio:
        raise HTTPException(404, "Generate portfolio terlebih dahulu.")
    if photo.content_type not in ALLOWED_PHOTO_TYPES:
        raise HTTPException(400, "Foto harus berformat JPG, PNG, atau WebP.")
    content = await photo.read(MAX_PHOTO_BYTES + 1)
    if len(content) > MAX_PHOTO_BYTES:
        raise HTTPException(400, "Ukuran foto maksimal 2MB.")
    if not content:
        raise HTTPException(400, "File foto kosong.")
    if not _matches_image_signature(content, photo.content_type):
        raise HTTPException(400, "Isi file tidak cocok dengan format gambar.")
    portfolio.draft_photo = content
    portfolio.draft_photo_content_type = photo.content_type
    if save_mode == "publish" and portfolio.status == "published":
        portfolio.published_photo = content
        portfolio.published_photo_content_type = photo.content_type
    db.commit()
    db.refresh(portfolio)
    return _as_out(portfolio)


@router.get("/me/portfolio/photo")
def get_my_portfolio_photo(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_candidate(user)
    portfolio = db.query(Portfolio).filter(Portfolio.user_id == user.id).first()
    if not portfolio or not portfolio.draft_photo:
        raise HTTPException(404, "Foto portfolio belum tersedia.")
    return Response(portfolio.draft_photo, media_type=portfolio.draft_photo_content_type or "image/jpeg")


@router.delete("/me/portfolio/photo", response_model=PortfolioOut)
def delete_my_portfolio_photo(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_candidate(user)
    portfolio = db.query(Portfolio).filter(Portfolio.user_id == user.id).first()
    if not portfolio:
        raise HTTPException(404, "Portfolio belum dibuat.")
    portfolio.draft_photo = None
    portfolio.draft_photo_content_type = None
    db.commit()
    db.refresh(portfolio)
    return _as_out(portfolio)


@router.get("/portfolios/{public_id}/photo")
def get_public_portfolio_photo(public_id: str, db: Session = Depends(get_db)):
    portfolio = db.query(Portfolio).filter(
        Portfolio.public_id == public_id,
        Portfolio.status == "published",
    ).first()
    if not portfolio or not portfolio.published_photo:
        raise HTTPException(404, "Foto portfolio tidak tersedia.")
    return Response(
        portfolio.published_photo,
        media_type=portfolio.published_photo_content_type or "image/jpeg",
        headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow"},
    )


@router.get("/portfolios/{public_id}")
def get_public_portfolio(public_id: str, db: Session = Depends(get_db)):
    portfolio = db.query(Portfolio).filter(
        Portfolio.public_id == public_id,
        Portfolio.status == "published",
    ).first()
    if not portfolio or not portfolio.published_content:
        raise HTTPException(404, "Portfolio tidak tersedia.")
    return JSONResponse(
        public_view(
            portfolio.public_id,
            portfolio.published_content,
            portfolio.published_content.get("_verified_skills_snapshot") or [],
            bool(portfolio.published_photo),
        ),
        headers={"Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow"},
    )
