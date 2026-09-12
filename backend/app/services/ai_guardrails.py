"""Quota AI lintas instance backend, disimpan di PostgreSQL.

Event dicatat sebelum request dikirim. Dengan begitu burst bersamaan tetap
dibatasi walaupun backend berjalan pada lebih dari satu process/container.
"""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.models import AiUsageEvent


class AiGenerationQuotaError(RuntimeError):
    def __init__(self, scope: str, retry_after_seconds: int):
        self.scope = scope
        self.retry_after_seconds = retry_after_seconds
        super().__init__(scope)


def _utc(value: datetime | None) -> datetime:
    current = value or datetime.now(timezone.utc)
    return current if current.tzinfo else current.replace(tzinfo=timezone.utc)


def reserve_ai_generation(
    db: Session,
    *,
    user_id: UUID,
    feature: str,
    user_daily_limit: int,
    global_rpm_limit: int,
    units: int = 1,
    now: datetime | None = None,
) -> None:
    """Simpan satu reservasi jika kuota pengguna dan project masih tersedia.

    `units` menghitung jumlah request model yang diperkirakan dari satu aksi,
    sedangkan limit pengguna menghitung jumlah aksi agar UX tetap mudah dipahami.
    """
    if units < 1:
        raise ValueError("units harus minimal 1")

    current = _utc(now)
    if db.bind and db.bind.dialect.name == "postgresql":
        # Serialkan read-then-insert agar dua instance tidak sama-sama lolos
        # setelah membaca saldo RPM yang identik.
        db.execute(text("SELECT pg_advisory_xact_lock(841927)"))

    day_start = current - timedelta(days=1)
    if user_daily_limit > 0:
        used_actions = (
            db.query(func.count(AiUsageEvent.id))
            .filter(
                AiUsageEvent.user_id == user_id,
                AiUsageEvent.feature == feature,
                AiUsageEvent.created_at >= day_start,
            )
            .scalar()
            or 0
        )
        if used_actions >= user_daily_limit:
            db.rollback()
            raise AiGenerationQuotaError("user", 60 * 60)

    if global_rpm_limit > 0:
        minute_start = current - timedelta(minutes=1)
        used_units = (
            db.query(func.coalesce(func.sum(AiUsageEvent.units), 0))
            .filter(AiUsageEvent.created_at >= minute_start)
            .scalar()
            or 0
        )
        if used_units + units > global_rpm_limit:
            db.rollback()
            raise AiGenerationQuotaError("global", 60)

    db.add(
        AiUsageEvent(
            user_id=user_id,
            feature=feature,
            units=units,
            created_at=current,
        )
    )
    db.commit()
