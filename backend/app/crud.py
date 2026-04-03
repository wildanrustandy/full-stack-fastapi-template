import uuid
from datetime import datetime
from typing import Any

from sqlalchemy.orm import selectinload
from sqlmodel import Session, col, select

from app.core.security import get_password_hash, verify_password
from app.models import (
    BOOTH_DEFAULT_CONFIG,
    Booth,
    BoothConfigUpdate,
    BoothCreate,
    BoothUpdate,
    DeviceSession,
    Item,
    ItemCreate,
    KioskSession,
    KioskSessionCreate,
    KioskSessionUpdate,
    Payment,
    PaymentCreate,
    Photo,
    PhotoCreate,
    User,
    UserCreate,
    UserUpdate,
)


def create_user(*, session: Session, user_create: UserCreate) -> User:
    db_obj = User.model_validate(
        user_create, update={"hashed_password": get_password_hash(user_create.password)}
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def update_user(*, session: Session, db_user: User, user_in: UserUpdate) -> Any:
    user_data = user_in.model_dump(exclude_unset=True)
    extra_data = {}
    if "password" in user_data:
        password = user_data["password"]
        hashed_password = get_password_hash(password)
        extra_data["hashed_password"] = hashed_password
    db_user.sqlmodel_update(user_data, update=extra_data)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


def get_user_by_email(*, session: Session, email: str) -> User | None:
    statement = select(User).where(User.email == email)
    session_user = session.exec(statement).first()
    return session_user


# Dummy hash to use for timing attack prevention when user is not found
# This is an Argon2 hash of a random password, used to ensure constant-time comparison
DUMMY_HASH = "$argon2id$v=19$m=65536,t=3,p=4$MjQyZWE1MzBjYjJlZTI0Yw$YTU4NGM5ZTZmYjE2NzZlZjY0ZWY3ZGRkY2U2OWFjNjk"


def authenticate(*, session: Session, email: str, password: str) -> User | None:
    db_user = get_user_by_email(session=session, email=email)
    if not db_user:
        # Prevent timing attacks by running password verification even when user doesn't exist
        # This ensures the response time is similar whether or not the email exists
        verify_password(password, DUMMY_HASH)
        return None
    verified, updated_password_hash = verify_password(password, db_user.hashed_password)
    if not verified:
        return None
    if updated_password_hash:
        db_user.hashed_password = updated_password_hash
        session.add(db_user)
        session.commit()
        session.refresh(db_user)
    return db_user


def create_item(*, session: Session, item_in: ItemCreate, owner_id: uuid.UUID) -> Item:
    db_item = Item.model_validate(item_in, update={"owner_id": owner_id})
    session.add(db_item)
    session.commit()
    session.refresh(db_item)
    return db_item


# ---------------------------------------------------------------------------
# Photobooth CRUD
# ---------------------------------------------------------------------------


def create_booth(*, session: Session, booth_in: BoothCreate) -> Booth:
    db_booth = Booth.model_validate(
        booth_in, update={"config": booth_in.config or BOOTH_DEFAULT_CONFIG}
    )
    session.add(db_booth)
    session.commit()
    session.refresh(db_booth)
    return db_booth


def get_booth_by_id(*, session: Session, booth_id: uuid.UUID) -> Booth | None:
    return session.get(Booth, booth_id)


def get_booths(*, session: Session, skip: int = 0, limit: int = 100) -> list[Booth]:
    statement = (
        select(Booth).order_by(col(Booth.created_at).desc()).offset(skip).limit(limit)
    )
    return list(session.exec(statement).all())


def update_booth(*, session: Session, db_booth: Booth, booth_in: BoothUpdate) -> Booth:
    booth_data = booth_in.model_dump(exclude_unset=True)
    db_booth.sqlmodel_update(booth_data)
    session.add(db_booth)
    session.commit()
    session.refresh(db_booth)
    return db_booth


def update_booth_config(
    *, session: Session, db_booth: Booth, config_in: BoothConfigUpdate
) -> Booth:
    update_data = config_in.model_dump(exclude_unset=True)
    current_config = db_booth.config or dict(BOOTH_DEFAULT_CONFIG)
    current_config.update(update_data)
    db_booth.config = current_config
    session.add(db_booth)
    session.commit()
    session.refresh(db_booth)
    return db_booth


def delete_booth(*, session: Session, booth_id: uuid.UUID) -> bool:
    booth = session.get(Booth, booth_id)
    if booth:
        session.delete(booth)
        session.commit()
        return True
    return False


def assign_device_to_booth(
    *, session: Session, booth_id: uuid.UUID, device_id: str
) -> Booth | None:
    booth = session.get(Booth, booth_id)
    if not booth:
        return None
    device_statement = select(DeviceSession).where(DeviceSession.device_id == device_id)
    device_session = session.exec(device_statement).first()
    if not device_session:
        return None

    # Clear previous booth's device_id if this device was assigned elsewhere
    if device_session.booth_id and device_session.booth_id != booth_id:
        prev_booth = session.get(Booth, device_session.booth_id)
        if prev_booth:
            prev_booth.device_id = None
            session.add(prev_booth)

    # Clear previous device assigned to this booth (if any)
    if booth.device_id and booth.device_id != device_id:
        prev_device_statement = select(DeviceSession).where(
            DeviceSession.device_id == booth.device_id
        )
        prev_device = session.exec(prev_device_statement).first()
        if prev_device:
            prev_device.booth_id = None
            session.add(prev_device)

    booth.device_id = device_id
    device_session.booth_id = booth.id
    session.add(booth)
    session.add(device_session)
    session.commit()
    session.refresh(booth)
    return booth


def unassign_device(*, session: Session, booth_id: uuid.UUID) -> Booth | None:
    booth = session.get(Booth, booth_id)
    if not booth or not booth.device_id:
        return booth

    device_statement = select(DeviceSession).where(
        DeviceSession.device_id == booth.device_id
    )
    device_session = session.exec(device_statement).first()
    if device_session:
        device_session.booth_id = None
        session.add(device_session)

    booth.device_id = None
    session.add(booth)
    session.commit()
    session.refresh(booth)
    return booth


def create_kiosk_session(
    *, session: Session, session_in: KioskSessionCreate
) -> KioskSession:
    db_session = KioskSession.model_validate(session_in)
    session.add(db_session)
    session.commit()
    session.refresh(db_session)
    return db_session


def get_kiosk_session(
    *, session: Session, session_id: uuid.UUID
) -> KioskSession | None:
    return session.get(KioskSession, session_id)


def update_kiosk_session(
    *,
    session: Session,
    db_session: KioskSession,
    session_in: KioskSessionUpdate,
) -> KioskSession:
    update_data = session_in.model_dump(exclude_unset=True)
    db_session.sqlmodel_update(update_data)
    session.add(db_session)
    session.commit()
    session.refresh(db_session)
    return db_session


def create_payment(
    *,
    session: Session,
    payment_in: PaymentCreate,
    reference_id: str | None = None,
    qr_string: str | None = None,
    transaction_id: str | None = None,
    expires_at: datetime | None = None,
) -> Payment:
    db_payment = Payment.model_validate(
        payment_in,
        update={
            "reference_id": reference_id,
            "qr_string": qr_string,
            "transaction_id": transaction_id,
            "expires_at": expires_at,
        },
    )
    session.add(db_payment)
    session.commit()
    session.refresh(db_payment)
    return db_payment


def get_payment_by_transaction_id(
    *, session: Session, transaction_id: str
) -> Payment | None:
    statement = select(Payment).where(Payment.transaction_id == transaction_id)
    return session.exec(statement).first()


def update_payment_status(
    *,
    session: Session,
    db_payment: Payment,
    status: str,
    paid_at: datetime | None = None,
) -> Payment:
    db_payment.status = status
    if paid_at is not None:
        db_payment.paid_at = paid_at
    session.add(db_payment)
    session.commit()
    session.refresh(db_payment)
    return db_payment


def create_photo(*, session: Session, photo_in: PhotoCreate) -> Photo:
    db_photo = Photo.model_validate(photo_in)
    session.add(db_photo)
    session.commit()
    session.refresh(db_photo)
    return db_photo


def get_photos_by_session(*, session: Session, session_id: uuid.UUID) -> list[Photo]:
    statement = (
        select(Photo).where(Photo.session_id == session_id).order_by(Photo.order)
    )
    return list(session.exec(statement).all())


def get_transactions(
    *,
    session: Session,
    booth_id: uuid.UUID | None = None,
    status: str | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[Payment]:
    statement = select(Payment).options(
        selectinload(Payment.session).selectinload(KioskSession.booth)  # type: ignore[attr-defined]
    )
    if booth_id is not None:
        statement = statement.where(Payment.booth_id == booth_id)
    if status is not None:
        statement = statement.where(Payment.status == status)
    statement = (
        statement.order_by(col(Payment.created_at).desc()).offset(skip).limit(limit)
    )
    return list(session.exec(statement).all())


def create_device_session(
    *,
    session: Session,
    device_id: str,
    device_name: str | None = None,
    session_token: str = "",
    pin: str | None = None,
) -> DeviceSession:
    db_device = DeviceSession(
        device_id=device_id,
        device_name=device_name,
        session_token=session_token,
        pin=pin,
    )
    session.add(db_device)
    session.commit()
    session.refresh(db_device)
    return db_device


def get_device_session(*, session: Session, device_id: str) -> DeviceSession | None:
    statement = select(DeviceSession).where(DeviceSession.device_id == device_id)
    return session.exec(statement).first()


def update_device_heartbeat(
    *, session: Session, device_id: str
) -> DeviceSession | None:
    """Update device last heartbeat timestamp."""
    from datetime import datetime, timezone

    device_session = get_device_session(session=session, device_id=device_id)
    if not device_session:
        return None
    device_session.last_heartbeat = datetime.now(timezone.utc)
    session.add(device_session)
    session.commit()
    session.refresh(device_session)
    return device_session


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

DEMO_BOOTH_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


def ensure_demo_booth(*, session: Session) -> Booth:
    """Return the demo booth, creating it if it doesn't exist."""
    booth = session.get(Booth, DEMO_BOOTH_ID)
    if booth:
        return booth
    booth = Booth(
        id=DEMO_BOOTH_ID,
        name="Demo Booth",
        location="Local Development",
        is_active=True,
    )
    session.add(booth)
    session.commit()
    session.refresh(booth)
    return booth
