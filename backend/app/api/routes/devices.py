import secrets
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.api.deps import SessionDep
from app import crud
from app.models import DeviceSession, DeviceSessionPublic

router = APIRouter(prefix="/devices", tags=["devices"])


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

    # Create new device session with a token
    session_token = secrets.token_urlsafe(32)
    device_session = crud.create_device_session(
        session=session,
        device_id=device_id,
        device_name=device_name,
        session_token=session_token,
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

    return {
        "device_id": device_id,
        "booth_id": device_session.booth_id,
        "booth_name": booth.name if booth else None,
        "is_assigned": device_session.booth_id is not None,
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
