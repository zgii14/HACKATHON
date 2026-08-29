import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    clerk_user_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    # NULL = user belum pilih role (tampilkan role picker). candidate | recruiter setelah dipilih.
    role: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False)  # B2B premium flag

    profile: Mapped["CandidateProfile | None"] = relationship(
        "CandidateProfile", back_populates="user", uselist=False
    )


class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True
    )
    github_username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    github_signals: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    cv_skills: Mapped[list | None] = mapped_column(JSON, nullable=True)
    merged_skills: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # Skill yang lolos verifikasi bukti commit GitHub (lihat services/skill_verification.py)
    verified_skills: Mapped[list | None] = mapped_column(JSON, nullable=True)
    roadmap_cached: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    roadmap_fingerprint: Mapped[str | None] = mapped_column(String(64), nullable=True)
    interests: Mapped[list | None] = mapped_column(JSON, nullable=True)  # e.g. ["backend", "ai_ml"]
    cv_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # ── CV asli (PDF yang diupload) + preferensi versi yang dipakai saat melamar ──
    cv_file: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    cv_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cv_uploaded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cv_preference: Mapped[str] = mapped_column(String(10), default="form")  # form | original
    # ── Bio data untuk surat lamaran ──────────────────────────────────────────
    bio_full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bio_birth_place: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bio_birth_date: Mapped[str | None] = mapped_column(String(100), nullable=True)
    bio_address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    bio_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    user: Mapped["User"] = relationship("User", back_populates="profile")


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(255))
    company: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    required_skills: Mapped[list] = mapped_column(JSON)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_remote: Mapped[bool] = mapped_column(Boolean, default=False)
    apply_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    # ── Info tambahan dari scraping ───────────────────────────────────────────
    salary: Mapped[str | None] = mapped_column(String(255), nullable=True)          # "Rp 8 jt-10 jt"
    min_education: Mapped[str | None] = mapped_column(String(255), nullable=True)   # "Minimal Sarjana (S1)"
    min_experience: Mapped[str | None] = mapped_column(String(255), nullable=True)  # "1 - 3 tahun pengalaman"
    work_type: Mapped[str | None] = mapped_column(String(100), nullable=True)       # "Hybrid" / "Remote" / "Kerja di kantor"
    recruiter_id: Mapped[str | None] = mapped_column(
        String(36), nullable=True  # VARCHAR(36) di DB — disimpan sebagai string UUID
    )
    is_closed: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, server_default="now()")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, server_default="now()")



class RoadmapProgress(Base):
    __tablename__ = "roadmap_progress"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # "_generic" untuk roadmap umum, atau UUID string job untuk roadmap per-job
    roadmap_key: Mapped[str] = mapped_column(String(64), default="_generic", server_default="_generic")
    step_index: Mapped[int] = mapped_column(Integer)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    __table_args__ = (UniqueConstraint("user_id", "roadmap_key", "step_index", name="uq_user_roadmap_step"),)


class JobApplication(Base):
    __tablename__ = "job_applications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[str] = mapped_column(String(32), default="applied")  # applied | interview | rejected | offer
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_letter: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_screening: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    screening_fingerprint: Mapped[str | None] = mapped_column(String(64), nullable=True)
    applied_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    __table_args__ = (UniqueConstraint("user_id", "job_id", name="uq_user_job_application"),)


class RecruiterProfile(Base):
    __tablename__ = "recruiter_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    company_name: Mapped[str] = mapped_column(String(255))
    company_website: Mapped[str] = mapped_column(String(255))
    company_size: Mapped[str] = mapped_column(String(50))  # 1-50 | 50-200 | 200+
    industry: Mapped[str] = mapped_column(String(100))
    wa_pic: Mapped[str] = mapped_column(String(50))
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | approved | rejected
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False)
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_by: Mapped[str | None] = mapped_column(String(320), nullable=True)

    user: Mapped["User"] = relationship("User", backref="recruiter_profile")


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recruiter_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    candidate_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    job_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (UniqueConstraint("recruiter_id", "candidate_id", "job_id", name="uq_conversation_participants"),)


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), index=True)
    sender_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    body: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(10), default="sent", server_default="sent")  # sent | read
    reply_to_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("messages.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
