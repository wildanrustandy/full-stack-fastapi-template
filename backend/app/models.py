import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from pydantic import EmailStr
from sqlalchemy import JSON, DateTime, Numeric, Text
from sqlmodel import Field, Relationship, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# User (existing template models)
# ---------------------------------------------------------------------------


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    items: list["Item"] = Relationship(back_populates="owner", cascade_delete=True)


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID
    created_at: datetime | None = None


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# ---------------------------------------------------------------------------
# Item (existing template models)
# ---------------------------------------------------------------------------


# Shared properties
class ItemBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Properties to receive on item creation
class ItemCreate(ItemBase):
    pass


# Properties to receive on item update
class ItemUpdate(ItemBase):
    title: str | None = Field(default=None, min_length=1, max_length=255)  # type: ignore


# Database model, database table inferred from class name
class Item(ItemBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="items")


# Properties to return via API, id is always required
class ItemPublic(ItemBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime | None = None


class ItemsPublic(SQLModel):
    data: list[ItemPublic]
    count: int


# ---------------------------------------------------------------------------
# Booth
# ---------------------------------------------------------------------------

BOOTH_DEFAULT_CONFIG: dict[str, Any] = {
    "price_per_print": 35000,
    "timer_default": 5,
    "max_print": 10,
    "filters": ["normal", "grayscale", "sepia", "vintage", "bright"],
    "payment_timeout": 5,
}


class BoothBase(SQLModel):
    name: str = Field(min_length=1, max_length=100)
    location: str | None = Field(default=None, max_length=255)
    is_active: bool = True


class BoothCreate(BoothBase):
    config: dict[str, Any] | None = None


class BoothUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    location: str | None = Field(default=None, max_length=255)
    is_active: bool | None = None


class BoothConfigUpdate(SQLModel):
    price_per_print: int | None = None
    timer_default: int | None = None
    max_print: int | None = None
    filters: list[str] | None = None
    payment_timeout: int | None = None


class Booth(BoothBase, table=True):
    __tablename__ = "booths"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    device_id: str | None = Field(default=None, max_length=255, unique=True)
    current_session_id: uuid.UUID | None = Field(default=None)
    config: dict[str, Any] = Field(
        default_factory=lambda: dict(BOOTH_DEFAULT_CONFIG),
        sa_type=JSON,
    )
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    last_active_at: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),  # type: ignore
    )

    # Relationships
    device_sessions: list["DeviceSession"] = Relationship(
        back_populates="booth", cascade_delete=True
    )
    sessions: list["KioskSession"] = Relationship(
        back_populates="booth", cascade_delete=True
    )


class BoothPublic(BoothBase):
    id: uuid.UUID
    device_id: str | None = None
    current_session_id: uuid.UUID | None = None
    config: dict[str, Any] = Field(default_factory=lambda: dict(BOOTH_DEFAULT_CONFIG))
    created_at: datetime | None = None
    updated_at: datetime | None = None
    last_active_at: datetime | None = None


class BoothsPublic(SQLModel):
    data: list[BoothPublic]
    count: int


# ---------------------------------------------------------------------------
# DeviceSession
# ---------------------------------------------------------------------------


class DeviceSessionBase(SQLModel):
    device_id: str = Field(max_length=255)
    device_name: str | None = Field(default=None, max_length=255)


class DeviceSessionCreate(DeviceSessionBase):
    booth_id: uuid.UUID | None = None


class DeviceSession(DeviceSessionBase, table=True):
    __tablename__ = "device_sessions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    booth_id: uuid.UUID | None = Field(
        default=None, foreign_key="booths.id", ondelete="CASCADE"
    )
    session_token: str = Field(max_length=255, unique=True)
    pin: str | None = Field(
        default=None, max_length=6
    )  # 6-digit PIN for easy assignment
    is_active: bool = True
    connected_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    last_heartbeat: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )

    # Relationships
    booth: Booth | None = Relationship(back_populates="device_sessions")


class DeviceSessionPublic(DeviceSessionBase):
    id: uuid.UUID
    booth_id: uuid.UUID | None = None
    pin: str | None = None
    is_active: bool = True
    connected_at: datetime | None = None
    last_heartbeat: datetime | None = None


# ---------------------------------------------------------------------------
# KioskSession (renamed from Session to avoid SQLModel conflict)
# ---------------------------------------------------------------------------


class KioskSessionBase(SQLModel):
    print_count: int = Field(default=1, ge=1, le=10)
    filter_name: str = Field(default="normal", max_length=50)
    timer: int = Field(default=5)


class KioskSessionCreate(KioskSessionBase):
    booth_id: uuid.UUID
    device_id: str = Field(max_length=255)
    total_price: float


class KioskSessionUpdate(SQLModel):
    status: str | None = Field(default=None, max_length=20)
    print_count: int | None = Field(default=None, ge=1, le=10)
    total_price: float | None = None
    filter_name: str | None = Field(default=None, max_length=50)
    timer: int | None = None


class KioskSession(KioskSessionBase, table=True):
    __tablename__ = "kiosk_sessions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    booth_id: uuid.UUID = Field(
        foreign_key="booths.id", nullable=False, ondelete="CASCADE"
    )
    device_id: str = Field(max_length=255)
    status: str = Field(
        default="pending", max_length=20
    )  # pending, paid, completed, cancelled
    total_price: float | None = Field(
        default=None,
        sa_type=Numeric(10, 2),  # type: ignore
    )
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    completed_at: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),  # type: ignore
    )

    # Relationships
    booth: Booth | None = Relationship(back_populates="sessions")
    payment: Optional["Payment"] = Relationship(
        back_populates="session", cascade_delete=True
    )
    photos: list["Photo"] = Relationship(back_populates="session", cascade_delete=True)


class KioskSessionPublic(KioskSessionBase):
    id: uuid.UUID
    booth_id: uuid.UUID
    device_id: str
    status: str
    total_price: float | None = None
    created_at: datetime | None = None
    completed_at: datetime | None = None


class KioskSessionsPublic(SQLModel):
    data: list[KioskSessionPublic]
    count: int


# ---------------------------------------------------------------------------
# Photo
# ---------------------------------------------------------------------------


class PhotoBase(SQLModel):
    file_url: str = Field(min_length=1)
    order: int = Field(ge=1, le=4)


class PhotoCreate(PhotoBase):
    session_id: uuid.UUID


class Photo(PhotoBase, table=True):
    __tablename__ = "photos"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    session_id: uuid.UUID = Field(
        foreign_key="kiosk_sessions.id", nullable=False, ondelete="CASCADE"
    )
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )

    # Relationships
    session: KioskSession | None = Relationship(back_populates="photos")


class PhotoPublic(PhotoBase):
    id: uuid.UUID
    session_id: uuid.UUID
    created_at: datetime | None = None


class PhotosPublic(SQLModel):
    data: list[PhotoPublic]
    count: int


# ---------------------------------------------------------------------------
# Payment
# ---------------------------------------------------------------------------


class PaymentBase(SQLModel):
    amount: float
    provider: str = Field(default="qris", max_length=50)


class PaymentCreate(PaymentBase):
    session_id: uuid.UUID
    booth_id: uuid.UUID


class PaymentUpdate(SQLModel):
    status: str | None = Field(default=None, max_length=20)
    qr_string: str | None = None
    transaction_id: str | None = Field(default=None, max_length=255)
    paid_at: datetime | None = None


class Payment(PaymentBase, table=True):
    __tablename__ = "payments"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    session_id: uuid.UUID = Field(
        foreign_key="kiosk_sessions.id", nullable=False, ondelete="CASCADE", unique=True
    )
    booth_id: uuid.UUID = Field(
        foreign_key="booths.id", nullable=False, ondelete="CASCADE"
    )
    amount: float = Field(sa_type=Numeric(10, 2))  # type: ignore
    status: str = Field(
        default="pending", max_length=20
    )  # pending, success, failed, expired
    reference_id: str | None = Field(default=None, max_length=100)
    qr_string: str | None = Field(default=None, sa_type=Text)
    transaction_id: str | None = Field(default=None, max_length=255)
    paid_at: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    expires_at: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )

    # Relationships
    session: KioskSession | None = Relationship(back_populates="payment")


class PaymentPublic(PaymentBase):
    id: uuid.UUID
    session_id: uuid.UUID
    booth_id: uuid.UUID
    status: str
    reference_id: str | None = None
    qr_string: str | None = None
    transaction_id: str | None = None
    paid_at: datetime | None = None
    expires_at: datetime | None = None
    created_at: datetime | None = None


class PaymentsPublic(SQLModel):
    data: list[PaymentPublic]
    count: int


# ---------------------------------------------------------------------------
# PaymentConfig
# ---------------------------------------------------------------------------


class PaymentConfigBase(SQLModel):
    name: str = Field(default="default", max_length=100)
    mode: str = Field(default="sandbox", max_length=20)  # sandbox or production


class PaymentConfigCreate(PaymentConfigBase):
    sandbox_va: str | None = Field(default=None, max_length=50)
    sandbox_key: str | None = Field(default=None, max_length=100)
    sandbox_url: str | None = Field(
        default="https://sandbox.ipaymu.com", max_length=255
    )
    production_va: str | None = Field(default=None, max_length=50)
    production_key: str | None = Field(default=None, max_length=100)
    production_url: str | None = Field(default="https://my.ipaymu.com", max_length=255)
    notify_url: str | None = Field(default=None)


class PaymentConfigUpdate(SQLModel):
    name: str | None = Field(default=None, max_length=100)
    mode: str | None = Field(default=None, max_length=20)
    sandbox_va: str | None = Field(default=None, max_length=50)
    sandbox_key: str | None = Field(default=None, max_length=100)
    sandbox_url: str | None = Field(default=None, max_length=255)
    production_va: str | None = Field(default=None, max_length=50)
    production_key: str | None = Field(default=None, max_length=100)
    production_url: str | None = Field(default=None, max_length=255)
    notify_url: str | None = None
    is_active: bool | None = None


class PaymentConfig(PaymentConfigBase, table=True):
    __tablename__ = "payment_configs"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    sandbox_va: str | None = Field(default=None, max_length=50)
    sandbox_key: str | None = Field(default=None, max_length=100)
    sandbox_url: str = Field(default="https://sandbox.ipaymu.com", max_length=255)
    production_va: str | None = Field(default=None, max_length=50)
    production_key: str | None = Field(default=None, max_length=100)
    production_url: str = Field(default="https://my.ipaymu.com", max_length=255)
    notify_url: str | None = Field(default=None, sa_type=Text)
    is_active: bool = True
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )


class PaymentConfigPublic(PaymentConfigBase):
    id: uuid.UUID
    sandbox_va: str | None = None
    sandbox_key: str | None = None  # masked in API response
    sandbox_url: str = "https://sandbox.ipaymu.com"
    production_va: str | None = None
    production_key: str | None = None  # masked in API response
    production_url: str = "https://my.ipaymu.com"
    notify_url: str | None = None
    is_active: bool = True
    created_at: datetime | None = None
    updated_at: datetime | None = None


# ---------------------------------------------------------------------------
# ActivityLog
# ---------------------------------------------------------------------------


class ActivityLogBase(SQLModel):
    action: str = Field(max_length=50)
    entity_type: str | None = Field(default=None, max_length=50)
    entity_id: str | None = Field(default=None, max_length=100)
    description: str | None = None


class ActivityLogCreate(ActivityLogBase):
    admin_id: uuid.UUID | None = None
    admin_username: str | None = Field(default=None, max_length=50)
    extra_data: str | None = None
    ip_address: str | None = Field(default=None, max_length=45)
    user_agent: str | None = Field(default=None, max_length=255)


class ActivityLog(ActivityLogBase, table=True):
    __tablename__ = "activity_logs"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    admin_id: uuid.UUID | None = Field(
        default=None, foreign_key="user.id", ondelete="SET NULL"
    )
    admin_username: str | None = Field(default=None, max_length=50)
    extra_data: str | None = Field(default=None, sa_type=Text)
    ip_address: str | None = Field(default=None, max_length=45)
    user_agent: str | None = Field(default=None, max_length=255)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )


class ActivityLogPublic(ActivityLogBase):
    id: uuid.UUID
    admin_id: uuid.UUID | None = None
    admin_username: str | None = None
    extra_data: str | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    created_at: datetime | None = None


class ActivityLogsPublic(SQLModel):
    data: list[ActivityLogPublic]
    count: int


# ---------------------------------------------------------------------------
# Generic / Auth models (existing template)
# ---------------------------------------------------------------------------


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)
