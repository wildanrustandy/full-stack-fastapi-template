import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Query
from sqlalchemy import func
from sqlmodel import col, select

from app import crud
from app.api.deps import CurrentUserSuperUser, SessionDep
from app.models import (
    Booth,
    KioskSession,
    KioskSessionPublic,
    Payment,
    PaymentPublic,
)

router = APIRouter(prefix="/photobooth", tags=["photobooth-admin"])


@router.get("/dashboard/overview")
def get_dashboard_overview(
    session: SessionDep,
    _current_user: CurrentUserSuperUser,
) -> dict[str, Any]:
    """Get dashboard overview stats (superuser only)."""

    # Total sessions
    total_sessions = session.exec(select(func.count()).select_from(KioskSession)).one()

    # Total revenue (sum of successful payments)
    revenue_result = session.exec(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.status == "success"
        )
    ).one()

    # Active booths
    active_booths = session.exec(
        select(func.count()).select_from(Booth).where(Booth.is_active == True)  # noqa: E712
    ).one()

    # Today's sessions
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    today_sessions = session.exec(
        select(func.count())
        .select_from(KioskSession)
        .where(col(KioskSession.created_at) >= today_start)
    ).one()

    return {
        "total_sessions": total_sessions,
        "total_revenue": float(revenue_result),
        "active_booths": active_booths,
        "today_sessions": today_sessions,
    }


@router.get("/dashboard/recent-transactions")
def get_recent_transactions(
    session: SessionDep,
    _current_user: CurrentUserSuperUser,
    limit: int = Query(default=10, ge=1, le=100),
) -> list[PaymentPublic]:
    """Get recent transactions (superuser only)."""
    payments = crud.get_transactions(session=session, skip=0, limit=limit)
    return [PaymentPublic.model_validate(p) for p in payments]


@router.get("/sessions/active")
def get_active_sessions(
    session: SessionDep,
    _current_user: CurrentUserSuperUser,
) -> list[KioskSessionPublic]:
    """Get active sessions with status 'pending' or 'paid' (superuser only)."""
    statement = (
        select(KioskSession)
        .where(col(KioskSession.status).in_(["pending", "paid"]))  # type: ignore[union-attr]
        .order_by(col(KioskSession.created_at).desc())
    )
    results = session.exec(statement).all()
    return [KioskSessionPublic.model_validate(s) for s in results]


@router.get("/sessions/recent")
def get_recent_sessions(
    session: SessionDep,
    _current_user: CurrentUserSuperUser,
    limit: int = Query(default=20, ge=1, le=100),
) -> list[KioskSessionPublic]:
    """Get recent sessions ordered by created_at descending (superuser only)."""
    statement = (
        select(KioskSession).order_by(col(KioskSession.created_at).desc()).limit(limit)
    )
    results = session.exec(statement).all()
    return [KioskSessionPublic.model_validate(s) for s in results]


@router.get("/transactions")
def get_transactions(
    session: SessionDep,
    _current_user: CurrentUserSuperUser,
    booth_id: uuid.UUID | None = None,
    status: str | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
) -> list[PaymentPublic]:
    """Get all transactions with optional filters (superuser only)."""
    payments = crud.get_transactions(
        session=session,
        booth_id=booth_id,
        status=status,
        skip=0,
        limit=100,
    )
    # Apply date filters in-memory since crud doesn't support them
    if start_date is not None:
        payments = [p for p in payments if p.created_at and p.created_at >= start_date]
    if end_date is not None:
        payments = [p for p in payments if p.created_at and p.created_at <= end_date]
    return [PaymentPublic.model_validate(p) for p in payments]


@router.get("/reports/revenue")
def get_revenue_report(
    session: SessionDep,
    _current_user: CurrentUserSuperUser,
    start_date: datetime = Query(..., description="Start date for the report"),
    end_date: datetime = Query(..., description="End date for the report"),
) -> list[dict[str, Any]]:
    """Get revenue report aggregated by date (superuser only)."""
    statement = (
        select(
            func.date(Payment.created_at).label("date"),
            func.count().label("count"),
            func.coalesce(func.sum(Payment.amount), 0).label("revenue"),
        )
        .where(Payment.status == "success")
        .where(col(Payment.created_at) >= start_date)
        .where(col(Payment.created_at) <= end_date)
        .group_by(func.date(Payment.created_at))
        .order_by(func.date(Payment.created_at))
    )
    results = session.exec(statement).all()
    return [
        {
            "date": str(row[0]),
            "count": row[1],
            "revenue": float(row[2]),
        }
        for row in results
    ]
