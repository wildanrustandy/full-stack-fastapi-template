import uuid

from sqlmodel import Session

from app.models import ActivityLog


def log_activity(
    *,
    session: Session,
    admin_id: uuid.UUID | None = None,
    admin_username: str | None = None,
    action: str,
    entity_type: str | None = None,
    entity_id: str | None = None,
    description: str | None = None,
    extra_data: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> ActivityLog:
    activity_log = ActivityLog(
        admin_id=admin_id,
        admin_username=admin_username,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        extra_data=extra_data,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    session.add(activity_log)
    session.commit()
    session.refresh(activity_log)
    return activity_log
