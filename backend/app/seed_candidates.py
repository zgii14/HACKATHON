import asyncio
import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import CandidateProfile, User
from app.services import github_client
from app.services.skill_verification import verify_skills

logger = logging.getLogger(__name__)

# 5 dummy Indonesia + 5 GitHub real usernames (diverse stack)
DUMMY = [
    {"full_name": "Siti Rahayu", "email": "dummy.candidate.06@githire.test", "github_username": "sindresorhus", "city": "Bandung", "phone": "0812-3000-0006", "interests": ["frontend"]},
    {"full_name": "Rizky Pratama", "email": "dummy.candidate.07@githire.test", "github_username": "tiangolo", "city": "Jakarta", "phone": "0812-3000-0007", "interests": ["backend"]},
    {"full_name": "Andi Wijaya", "email": "dummy.candidate.08@githire.test", "github_username": "shadcn", "city": "Surabaya", "phone": "0812-3000-0008", "interests": ["frontend"]},
    {"full_name": "Maya Kusuma", "email": "dummy.candidate.09@githire.test", "github_username": "kamranahmedse", "city": "Yogyakarta", "phone": "0812-3000-0009", "interests": ["backend"]},
    {"full_name": "Farhan Malik", "email": "dummy.candidate.10@githire.test", "github_username": "torvalds", "city": "Bali", "phone": "0812-3000-0010", "interests": ["devops"]},
]

def _now():
    return datetime.now(timezone.utc)

async def _fetch_signals(username: str):
    try:
        return await github_client.fetch_github_signals(username)
    except Exception as e:
        logger.warning("[seed] github fetch fail %s: %s", username, e)
        return None

def _build_cv_data(full_name: str, city: str, signals: dict | None, email: str):
    langs = list((signals or {}).get("languages", {}).keys())[:6] if signals else ["Python"]
    return {
        "summary": f"Developer {full_name} dari {city} dengan pengalaman di {', '.join(langs[:3])}.",
        "education": [{"institution": "Universitas Indonesia", "location": f"{city}, Indonesia", "major": "Informatics", "degree": "Bachelor", "period": "2019 - 2023", "gpa": "3.75/4.00"}],
        "work_experience": [{"company": "Startup Kita", "role": "Software Engineer", "location": f"{city} (Remote)", "period": "Jan 2024 - Present", "bullets": [f"Build fitur dengan {langs[0] if langs else 'Python'}"]}],
        "org_experience": [],
        "training": [],
        "skills": {"soft_skills": ["Communication", "Teamwork"], "hard_skills": langs, "languages": ["Bahasa Indonesia (Native)", "English (Intermediate)"]},
        "certifications": [],
        "email": email,
        "linkedin": None,
    }

def seed_candidates_if_empty(db: Session, count: int = 5):
    # idempoten: cek dummy 06 exists
    if db.query(User).filter(User.email == DUMMY[0]["email"]).first():
        logger.warning("[seed] candidates already seeded, skip")
        return 0
    created = 0
    for entry in DUMMY[:count]:
        username = entry["github_username"]
        # real fetch via GITHUB_TOKEN env yang sudah ada
        signals = None
        try:
            signals = asyncio.run(_fetch_signals(username))
        except RuntimeError:
            # jika sudah di event loop (lifespan async), fallback
            try:
                import asyncio as _a
                signals = _a.get_event_loop().run_until_complete(_fetch_signals(username))
            except Exception as e:
                logger.warning("[seed] async fallback fail %s: %s", username, e)
        if not signals:
            # fallback synthetic minimal biar tetap muncul di search
            signals = {"username": username, "languages": {"Python": 50000}, "topics": [], "commits": 60, "stars": 5, "public_repos": 5, "followers": 3, "repos_detail": []}
        # merged_skills: languages + topics
        gh_langs = list(signals.get("languages", {}).keys())
        topics = signals.get("topics", [])[:5]
        cv_skills = gh_langs[:3]
        # dedup lower
        seen = set()
        merged = []
        for s in gh_langs + topics + cv_skills:
            low = s.lower()
            if low not in seen:
                seen.add(low)
                merged.append(s)
        verified = []
        try:
            verified = verify_skills(signals, as_of=_now())
        except Exception as e:
            logger.warning("[seed] verify fail %s: %s", username, e)
        cv_data = _build_cv_data(entry["full_name"], entry["city"], signals, entry["email"])
        # User
        uid = uuid.uuid4()
        user = User(id=uid, clerk_user_id=f"clerk_dummy_candidate_{entry['email'].split('@')[0]}_{uuid.uuid4().hex[:6]}", email=entry["email"], role="candidate", is_premium=False)
        db.add(user)
        db.flush()
        profile = CandidateProfile(
            user_id=user.id,
            github_username=username,
            github_signals=signals,
            cv_skills=cv_skills,
            merged_skills=merged,
            verified_skills=verified,
            interests=entry["interests"],
            cv_data=cv_data,
            bio_full_name=entry["full_name"],
            bio_birth_place=entry["city"],
            bio_birth_date="15 Jan 1998",
            bio_address=f"Jl. Merdeka No. 10, {entry['city']}, Indonesia",
            bio_phone=entry["phone"],
            cv_filename=f"cv_{username}.pdf",
            cv_uploaded_at=_now(),
            cv_preference="form",
        )
        db.add(profile)
        created += 1
    db.commit()
    logger.warning("[seed] seeded %d dummy candidates (real GitHub fetch)", created)
    return created

def reseed_candidates(db: Session):
    # hapus dummy 06-10 lalu seed ulang
    for entry in DUMMY:
        u = db.query(User).filter(User.email == entry["email"]).first()
        if u:
            db.delete(u)
    db.commit()
    return seed_candidates_if_empty(db)
