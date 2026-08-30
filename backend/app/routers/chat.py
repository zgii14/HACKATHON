from datetime import datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_user, is_admin_email
from app.database import get_db
from app.models import CandidateProfile, Conversation, Job, Message, RecruiterProfile, User

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatStartPayload(BaseModel):
    candidate_id: UUID
    job_id: UUID | None = None
    initial_message: str | None = None


class MessageCreate(BaseModel):
    body: str
    reply_to_id: UUID | None = None


def _is_premium(user: User) -> bool:
    return bool(getattr(user, "is_premium", False))


def _check_chat_quota(db: Session, user: User):
    # Hanya recruiter yang kena kuota; candidate bebas balas
    if user.role != "recruiter":
        return
    is_premium = _is_premium(user)
    limit = 100 if is_premium else 5
    week_ago = datetime.utcnow() - timedelta(days=7)
    count = db.query(func.count(Conversation.id)).filter(
        Conversation.recruiter_id == user.id,
        Conversation.created_at >= week_ago,
    ).scalar() or 0
    if count >= limit:
        raise HTTPException(
            429,
            f"Kuota chat mingguan habis ({count}/{limit}). Upgrade ke Premium untuk 100/minggu atau tunggu minggu depan.",
        )


def _is_expired(conv: Conversation) -> bool:
    if not conv.expires_at:
        return False
    from datetime import timezone
    exp = conv.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    return exp < datetime.now(timezone.utc)


def _resolve_other_display(db: Session, other_id: UUID, viewing_role: str):
    """Return (other_name, other_email, other_company, avatar_hint) for list."""
    other = db.query(User).filter(User.id == other_id).first()
    email = other.email if other else None
    # viewing_role == recruiter => other is candidate
    if viewing_role == "recruiter":
        prof = db.query(CandidateProfile).filter(CandidateProfile.user_id == other_id).first()
        name = None
        if prof and prof.bio_full_name and prof.bio_full_name.strip():
            name = prof.bio_full_name.strip()
        elif prof and prof.github_username:
            name = prof.github_username
        elif email:
            name = email.split("@")[0]
        else:
            name = "Kandidat"
        company = None
        # sub-label: github or short email
        if prof and prof.github_username:
            company = f"@{prof.github_username}"
        elif email:
            company = email
        return name, email, company, other
    else:
        # viewing_role == candidate => other is recruiter
        rprof = db.query(RecruiterProfile).filter(RecruiterProfile.user_id == other_id).first()
        if rprof and rprof.company_name and rprof.company_name.strip():
            name = rprof.company_name.strip()
            company = rprof.company_website or rprof.industry
        elif email:
            name = email.split("@")[0]
            company = email
        else:
            name = "Recruiter"
            company = None
        return name, email, company, other


@router.get("/quota", response_model=dict)
def get_quota(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "recruiter":
        return {"limit": None, "used": 0, "remaining": None, "is_premium": False}
    is_premium = _is_premium(user)
    limit = 100 if is_premium else 5
    week_ago = datetime.utcnow() - timedelta(days=7)
    used = db.query(func.count(Conversation.id)).filter(
        Conversation.recruiter_id == user.id,
        Conversation.created_at >= week_ago,
    ).scalar() or 0
    return {"limit": limit, "used": used, "remaining": max(0, limit - used), "is_premium": is_premium}


@router.post("/start", response_model=dict)
def start_conversation(
    body: ChatStartPayload,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Hanya recruiter (perusahaan) yang boleh memulai chat
    if user.role != "recruiter":
        raise HTTPException(403, "Hanya recruiter yang dapat memulai chat.")
    recruiter_id = user.id
    candidate_id = body.candidate_id
    # Validasi candidate ada
    cand = db.query(User).filter(User.id == candidate_id).first()
    if not cand:
        raise HTTPException(404, "Kandidat tidak ditemukan.")

    # Cek existing conversation
    existing = db.query(Conversation).filter(
        Conversation.recruiter_id == recruiter_id,
        Conversation.candidate_id == candidate_id,
        Conversation.job_id == body.job_id,
    ).first()
    if existing:
        return {"conversation_id": existing.id, "created": False}

    # Kuota hanya untuk pembuatan baru oleh recruiter
    if user.role == "recruiter":
        _check_chat_quota(db, user)

    from datetime import timezone
    conv = Conversation(
        recruiter_id=recruiter_id,
        candidate_id=candidate_id,
        job_id=body.job_id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=4),
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)

    if body.initial_message and body.initial_message.strip():
        msg = Message(conversation_id=conv.id, sender_id=user.id, body=body.initial_message.strip(), status="sent")
        db.add(msg)
        conv.updated_at = datetime.utcnow()
        db.commit()

    return {"conversation_id": conv.id, "created": True, "expires_at": conv.expires_at}


@router.get("/conversations", response_model=list[dict])
def list_conversations(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from datetime import timezone
    now = datetime.now(timezone.utc)
    # lazy TTL filter — hapus yang sudah lewat 4 hari dari hasil list
    if user.role == "recruiter":
        convs = db.query(Conversation).filter(Conversation.recruiter_id == user.id, (Conversation.expires_at.is_(None)) | (Conversation.expires_at > now)).order_by(Conversation.updated_at.desc()).all()
    else:
        convs = db.query(Conversation).filter(Conversation.candidate_id == user.id, (Conversation.expires_at.is_(None)) | (Conversation.expires_at > now)).order_by(Conversation.updated_at.desc()).all()

    out = []
    for c in convs:
        other_id = c.candidate_id if user.role == "recruiter" else c.recruiter_id
        other_name, other_email, other_company, _ = _resolve_other_display(db, other_id, user.role or "candidate")
        last_msg = db.query(Message).filter(Message.conversation_id == c.id).order_by(Message.created_at.desc()).first()
        # unread: messages sent by other participant with status != read
        unread = db.query(func.count(Message.id)).filter(
            Message.conversation_id == c.id,
            Message.sender_id != user.id,
            Message.status == "sent",
        ).scalar() or 0
        job_title = None
        job_company = None
        if c.job_id:
            j = db.query(Job).filter(Job.id == c.job_id).first()
            if j:
                job_title = j.title
                job_company = j.company
        out.append({
            "id": c.id,
            "other_user_id": other_id,
            "other_name": other_name,
            "other_email": other_email,
            "other_company": other_company,
            "job_id": c.job_id,
            "job_title": job_title,
            "job_company": job_company,
            "updated_at": c.updated_at,
            "expires_at": c.expires_at,
            "last_message": last_msg.body if last_msg else None,
            "last_message_at": last_msg.created_at if last_msg else c.created_at,
            "last_message_status": last_msg.status if last_msg else None,
            "unread_count": unread,
        })
    return out


@router.post("/start-admin", response_model=dict)
def start_admin_chat(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "recruiter":
        raise HTTPException(403, "Hanya recruiter yang dapat menghubungi admin.")
    # cari admin user (hardcode + allowlist)
    admin = db.query(User).filter(User.email == "admin.githire@gmail.com").first()
    if not admin:
        # fallback cari user dengan is_admin_email true
        candidates = db.query(User).all()
        for u in candidates:
            if u.email and is_admin_email(u.email):
                admin = u
                break
    if not admin:
        raise HTTPException(404, "Admin tidak ditemukan. Hubungi support.")
    # recruiter sebagai recruiter_id, admin sebagai candidate_id (admin juga recruiter role, tapi tetap participant)
    existing = db.query(Conversation).filter(
        Conversation.recruiter_id == user.id,
        Conversation.candidate_id == admin.id,
        Conversation.job_id.is_(None),
    ).first()
    if existing:
        return {"conversation_id": existing.id, "created": False}
    _check_chat_quota(db, user)
    from datetime import timezone
    conv = Conversation(recruiter_id=user.id, candidate_id=admin.id, job_id=None, expires_at=datetime.now(timezone.utc) + timedelta(days=4))
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return {"conversation_id": conv.id, "created": True, "expires_at": conv.expires_at}


@router.get("/{conversation_id}/messages", response_model=list[dict])
def get_messages(
    conversation_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(404, "Percakapan tidak ditemukan.")
    if _is_expired(conv):
        raise HTTPException(404, "Percakapan sudah kedaluwarsa (4 hari) dan terhapus.")
    if user.id not in (conv.recruiter_id, conv.candidate_id):
        raise HTTPException(403, "Bukan peserta percakapan ini.")
    # auto-mark read: pesan dari lawan yang masih sent → read saat dibuka
    db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.sender_id != user.id,
        Message.status == "sent",
    ).update({"status": "read"}, synchronize_session=False)
    db.commit()
    msgs = db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.created_at.asc()).all()
    return [{"id": m.id, "sender_id": m.sender_id, "body": m.body, "status": getattr(m, "status", "sent"), "reply_to_id": getattr(m, "reply_to_id", None), "created_at": m.created_at} for m in msgs]


@router.post("/{conversation_id}/read", response_model=dict)
def mark_read(
    conversation_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(404, "Percakapan tidak ditemukan.")
    if _is_expired(conv):
        raise HTTPException(404, "Percakapan sudah kedaluwarsa.")
    if user.id not in (conv.recruiter_id, conv.candidate_id):
        raise HTTPException(403, "Bukan peserta percakapan ini.")
    updated = db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.sender_id != user.id,
        Message.status == "sent",
    ).update({"status": "read"}, synchronize_session=False)
    db.commit()
    return {"updated": updated}


@router.post("/{conversation_id}/messages", response_model=dict)
def send_message(
    conversation_id: UUID,
    body: MessageCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not body.body.strip():
        raise HTTPException(400, "Pesan tidak boleh kosong.")
    if len(body.body) > 2000:
        raise HTTPException(400, "Pesan terlalu panjang (max 2000).")
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(404, "Percakapan tidak ditemukan.")
    if _is_expired(conv):
        raise HTTPException(404, "Percakapan sudah kedaluwarsa.")
    if user.id not in (conv.recruiter_id, conv.candidate_id):
        raise HTTPException(403, "Bukan peserta percakapan ini.")
    # validasi reply_to_id kalau ada
    if body.reply_to_id:
        ref = db.query(Message).filter(Message.id == body.reply_to_id, Message.conversation_id == conversation_id).first()
        if not ref:
            raise HTTPException(400, "Pesan yang dibalas tidak ditemukan.")
    msg = Message(conversation_id=conversation_id, sender_id=user.id, body=body.body.strip(), status="sent", reply_to_id=body.reply_to_id)
    db.add(msg)
    conv.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(msg)
    return {"id": msg.id, "status": msg.status, "created_at": msg.created_at}


@router.delete("/{conversation_id}", response_model=dict)
def delete_conversation(
    conversation_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(404, "Percakapan tidak ditemukan.")
    if _is_expired(conv):
        raise HTTPException(404, "Percakapan sudah kedaluwarsa.")
    if user.id not in (conv.recruiter_id, conv.candidate_id):
        raise HTTPException(403, "Bukan peserta percakapan ini.")
    db.delete(conv)
    db.commit()
    return {"deleted": str(conversation_id)}


@router.delete("/{conversation_id}/messages/{message_id}", response_model=dict)
def delete_message(
    conversation_id: UUID,
    message_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(404, "Percakapan tidak ditemukan.")
    if _is_expired(conv):
        raise HTTPException(404, "Percakapan sudah kedaluwarsa.")
    if user.id not in (conv.recruiter_id, conv.candidate_id):
        raise HTTPException(403, "Bukan peserta percakapan ini.")
    msg = db.query(Message).filter(Message.id == message_id, Message.conversation_id == conversation_id).first()
    if not msg:
        raise HTTPException(404, "Pesan tidak ditemukan.")
    if msg.sender_id != user.id:
        raise HTTPException(403, "Hanya pengirim yang bisa menghapus pesan.")
    db.delete(msg)
    db.commit()
    return {"deleted": str(message_id)}
