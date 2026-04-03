from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import CandidateProfile, Job, JobMatch, User
from app.schemas import JobDetailOut, JobOut
from app.services.matching import explain_match, jaccard_score

router = APIRouter(tags=["jobs"])


def _profile_skills(db: Session, user: User) -> list[str] | None:
    p = db.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).first()
    if not p or not p.merged_skills:
        return None
    return list(p.merged_skills)


@router.get("/jobs", response_model=list[JobOut])
def list_jobs(
    q: str | None = None,
    remote: bool | None = None,
    include_match: bool = False,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Job)
    if remote is not None:
        query = query.filter(Job.is_remote == remote)
    jobs = query.order_by(Job.title).all()
    skills = _profile_skills(db, user) if include_match else None

    out: list[JobOut] = []
    for job in jobs:
        if q and q.lower() not in (job.title + job.company + job.description).lower():
            continue
        score = None
        if include_match and skills is not None:
            score = jaccard_score(skills, job.required_skills or [])
        out.append(
            JobOut(
                id=job.id,
                title=job.title,
                company=job.company,
                description=job.description[:200] + "..."
                if len(job.description) > 200
                else job.description,
                required_skills=list(job.required_skills or []),
                location=job.location,
                is_remote=job.is_remote,
                apply_url=job.apply_url,
                match_score=score,
                salary=job.salary,
                min_education=job.min_education,
                min_experience=job.min_experience,
                work_type=job.work_type,
            )
        )
    return out


@router.get("/jobs/recommended", response_model=list[JobOut])
def recommended_jobs(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    skills = _profile_skills(db, user)
    if skills is None:
        return []

    jobs = db.query(Job).all()
    scored: list[tuple[Job, float]] = []
    for job in jobs:
        s = jaccard_score(skills, job.required_skills or [])
        scored.append((job, s))
    scored.sort(key=lambda x: x[1], reverse=True)

    return [
        JobOut(
            id=j.id,
            title=j.title,
            company=j.company,
            description=j.description[:200] + "..." if len(j.description) > 200 else j.description,
            required_skills=list(j.required_skills or []),
            location=j.location,
            is_remote=j.is_remote,
            apply_url=j.apply_url,
            match_score=s,
            salary=j.salary,
            min_education=j.min_education,
            min_experience=j.min_experience,
            work_type=j.work_type,
        )
        for j, s in scored[:10]
    ]


@router.get("/jobs/{job_id}", response_model=JobDetailOut)
def job_detail(
    job_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "Lowongan pekerjaan tidak ditemukan")

    skills = _profile_skills(db, user) or []
    req = list(job.required_skills or [])
    score = jaccard_score(skills, req) if skills else 0.0
    reasons, missing = explain_match(skills, req)

    return JobDetailOut(
        id=job.id,
        title=job.title,
        company=job.company,
        description=job.description,
        required_skills=req,
        location=job.location,
        is_remote=job.is_remote,
        apply_url=job.apply_url,
        match_score=score,
        match_reasons=reasons,
        missing_skills=missing,
        salary=job.salary,
        min_education=job.min_education,
        min_experience=job.min_experience,
        work_type=job.work_type,
    )
