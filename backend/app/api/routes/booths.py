import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import SQLModel

from app import crud
from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Booth,
    BoothConfigUpdate,
    BoothCreate,
    BoothPublic,
    BoothsPublic,
    BoothUpdate,
    Message,
)

router = APIRouter(prefix="/booths", tags=["booths"])


class BoothAssignDevice(SQLModel):
    device_id: str


@router.get("/", response_model=BoothsPublic)
def read_booths(
    session: SessionDep, _current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve booths.
    """
    booths = crud.get_booths(session=session, skip=skip, limit=limit)
    return BoothsPublic(data=booths, count=len(booths))


@router.post("/", response_model=BoothPublic)
def create_booth(
    *, session: SessionDep, current_user: CurrentUser, booth_in: BoothCreate
) -> Any:
    """
    Create new booth.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    booth = crud.create_booth(session=session, booth_in=booth_in)
    return booth


@router.get("/{id}", response_model=BoothPublic)
def read_booth(session: SessionDep, _current_user: CurrentUser, id: uuid.UUID) -> Any:
    """
    Get booth by ID.
    """
    booth = crud.get_booth_by_id(session=session, booth_id=id)
    if not booth:
        raise HTTPException(status_code=404, detail="Booth not found")
    return booth


@router.put("/{id}", response_model=BoothPublic)
async def update_booth(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    booth_in: BoothUpdate,
) -> Any:
    """
    Update a booth.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    booth = crud.get_booth_by_id(session=session, booth_id=id)
    if not booth:
        raise HTTPException(status_code=404, detail="Booth not found")

    was_active = booth.is_active
    booth = crud.update_booth(session=session, db_booth=booth, booth_in=booth_in)

    # If booth was deactivated and has a device assigned, notify the device
    if was_active and not booth.is_active and booth.device_id:
        from app.api.routes import websocket

        await websocket.notify_device_assignment(
            device_id=booth.device_id,
            booth_id=None,  # Unassign
            reason="Booth deactivated",
        )

    return booth


@router.put("/{id}/config", response_model=BoothPublic)
def update_booth_config(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    config_in: BoothConfigUpdate,
) -> Any:
    """
    Update booth config.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    booth = crud.get_booth_by_id(session=session, booth_id=id)
    if not booth:
        raise HTTPException(status_code=404, detail="Booth not found")
    booth = crud.update_booth_config(
        session=session, db_booth=booth, config_in=config_in
    )
    return booth


@router.post("/{id}/assign", response_model=BoothPublic)
async def assign_device(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    assign_data: BoothAssignDevice,
) -> Any:
    """
    Assign a device to a booth.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    booth = crud.assign_device_to_booth(
        session=session, booth_id=id, device_id=assign_data.device_id
    )
    if not booth:
        raise HTTPException(status_code=404, detail="Booth not found")

    # Notify device via WebSocket
    from app.api.routes import websocket

    await websocket.notify_device_assignment(
        device_id=assign_data.device_id,
        booth_id=str(booth.id),
        booth_name=booth.name,
        booth_location=booth.location,
        booth_config=booth.config,
        booth_active=booth.is_active,
    )

    # Broadcast booth update to admin panel
    await websocket.broadcast_booth_update(str(booth.id), "device_assigned")

    return booth


@router.post("/{id}/unassign", response_model=BoothPublic)
async def unassign_device(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    """
    Unassign device from a booth.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Get device_id before unassigning
    booth = session.get(Booth, id)
    if not booth:
        raise HTTPException(status_code=404, detail="Booth not found")

    device_id = booth.device_id
    booth = crud.unassign_device(session=session, booth_id=id)

    # Notify device via WebSocket
    if device_id:
        from app.api.routes import websocket

        await websocket.notify_device_assignment(device_id=device_id, booth_id=None)

        # Broadcast booth update to admin panel
        if booth:
            await websocket.broadcast_booth_update(str(booth.id), "device_unassigned")

    return booth


@router.delete("/{id}")
def delete_booth(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Message:
    """
    Delete a booth.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    booth = crud.delete_booth(session=session, booth_id=id)
    if not booth:
        raise HTTPException(status_code=404, detail="Booth not found")
    return Message(message="Booth deleted successfully")
