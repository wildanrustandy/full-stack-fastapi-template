import random
import secrets
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app import crud
from app.models import DeviceSession, DeviceSessionPublic, BoothPublic

router = APIRouter(prefix="/devices", tags=["devices"])


def generate_pin() -> str:
    """Generate a random 6-digit PIN."""
    return f"{random.randint(0, 999999):06d}"


@router.post("/register", response_model=DeviceSessionPublic)
def register_device(
    *,
    session: SessionDep,
    device_data: dict[str, Any],
) -> Any:
    """
    Register a new device or return existing device session.
    This is called from the kiosk when it first loads.
    """
    device_id = device_data.get("device_id")
    device_name = device_data.get("device_name", "Kiosk")

    if not device_id:
        raise HTTPException(status_code=400, detail="device_id is required")

    # Check if device already exists
    existing_device = crud.get_device_session(session=session, device_id=device_id)
    if existing_device:
        # Update last heartbeat
        existing_device = crud.update_device_heartbeat(
            session=session, device_id=device_id
        )
        return existing_device

    # Create new device session with a token and PIN
    session_token = secrets.token_urlsafe(32)
    pin = generate_pin()

    device_session = crud.create_device_session(
        session=session,
        device_id=device_id,
        device_name=device_name,
        session_token=session_token,
        pin=pin,
    )
    return device_session


@router.get("/check-assignment/{device_id}", response_model=dict[str, Any])
def check_device_assignment(
    *,
    session: SessionDep,
    device_id: str,
) -> Any:
    """
    Check if a device is assigned to a booth.
    Returns booth info if assigned, or null booth_id if not.
    """
    device_session = crud.get_device_session(session=session, device_id=device_id)
    if not device_session:
        raise HTTPException(status_code=404, detail="Device not found")

    booth = None
    if device_session.booth_id:
        booth = session.get(crud.Booth, device_session.booth_id)

    # Consider booth inactive if booth exists but is not active
    booth_active = booth.is_active if booth else False
    is_effectively_assigned = device_session.booth_id is not None and booth_active

    return {
        "device_id": device_id,
        "booth_id": str(device_session.booth_id) if device_session.booth_id else None,
        "booth_name": booth.name if booth else None,
        "booth_location": booth.location if booth else None,
        "booth_active": booth_active,
        "is_assigned": is_effectively_assigned,
        "pin": device_session.pin,
    }


@router.post("/{device_id}/heartbeat", response_model=DeviceSessionPublic)
def device_heartbeat(
    *,
    session: SessionDep,
    device_id: str,
) -> Any:
    """
    Update device last heartbeat timestamp.
    Called periodically by the kiosk to show it's still active.
    """
    device = crud.update_device_heartbeat(session=session, device_id=device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device


@router.post("/assign-by-pin", response_model=BoothPublic)
async def assign_device_by_pin(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    data: dict[str, Any],
) -> Any:
    """
    Assign a device to a booth using its 6-digit PIN.
    This is more user-friendly than entering the full device ID.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    pin = data.get("pin")
    booth_id = data.get("booth_id")

    if not pin or not booth_id:
        raise HTTPException(status_code=400, detail="pin and booth_id are required")

    if len(pin) != 6 or not pin.isdigit():
        raise HTTPException(status_code=400, detail="PIN must be 6 digits")

    # Find device by PIN
    statement = select(DeviceSession).where(DeviceSession.pin == pin)
    device_session = session.exec(statement).first()

    if not device_session:
        raise HTTPException(status_code=404, detail="Device not found with this PIN")

    # Assign device to booth
    booth = crud.assign_device_to_booth(
        session=session,
        booth_id=uuid.UUID(booth_id),
        device_id=device_session.device_id,
    )

    if not booth:
        raise HTTPException(status_code=404, detail="Booth not found")

    # Notify device via WebSocket
    from app.api.routes import websocket

    await websocket.notify_device_assignment(
        device_id=device_session.device_id,
        booth_id=str(booth.id),
        booth_name=booth.name,
        booth_location=booth.location,
        booth_active=booth.is_active,
    )

    # Broadcast booth update to admin panel
    await websocket.broadcast_booth_update(str(booth.id), "device_assigned")

    return booth
