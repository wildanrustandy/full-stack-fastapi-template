import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlmodel import col, select

from app.api.deps import CurrentUserSuperUser, SessionDep
from app.models import DeviceSession

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])

# Module-level connection stores
active_connections: dict[str, WebSocket] = {}
admin_connections: list[WebSocket] = []


@router.get("/ws/online-devices")
def get_online_devices(
    session: SessionDep,
    _current_user: CurrentUserSuperUser,
) -> list[dict[str, Any]]:
    """Get list of currently connected device IDs (superuser only)."""
    online_device_ids = list(active_connections.keys())
    # Fetch device session info for online devices
    devices: list[dict[str, Any]] = []
    if online_device_ids:
        statement = select(DeviceSession).where(
            col(DeviceSession.device_id).in_(online_device_ids)
        )
        results = session.exec(statement).all()
        for d in results:
            devices.append(
                {
                    "device_id": d.device_id,
                    "device_name": d.device_name,
                    "booth_id": str(d.booth_id) if d.booth_id else None,
                    "last_heartbeat": d.last_heartbeat.isoformat()
                    if d.last_heartbeat
                    else None,
                }
            )
    return devices


@router.websocket("/ws/device/{device_id}")
async def device_websocket(websocket: WebSocket, device_id: str) -> None:
    await websocket.accept()
    logger.debug("WebSocket connected for device: %s", device_id)
    active_connections[device_id] = websocket

    await websocket.send_json(
        {
            "type": "connected",
            "device_id": device_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "heartbeat":
                await websocket.send_json(
                    {
                        "type": "heartbeat_ack",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                )
            elif msg_type == "ping":
                await websocket.send_json(
                    {
                        "type": "pong",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                )
    except WebSocketDisconnect:
        pass
    finally:
        active_connections.pop(device_id, None)


@router.websocket("/ws/admin")
async def admin_websocket(websocket: WebSocket) -> None:
    await websocket.accept()
    admin_connections.append(websocket)

    await websocket.send_json(
        {
            "type": "connected",
            "role": "admin",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "ping":
                await websocket.send_json(
                    {
                        "type": "pong",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                )
    except WebSocketDisconnect:
        pass
    finally:
        if websocket in admin_connections:
            admin_connections.remove(websocket)


async def broadcast_transaction_update(transaction_data: dict[str, Any]) -> None:
    message = {
        "type": "transaction_update",
        "data": transaction_data,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    disconnected = []
    for ws in admin_connections:
        try:
            await ws.send_json(message)
        except Exception:
            disconnected.append(ws)
    for ws in disconnected:
        if ws in admin_connections:
            admin_connections.remove(ws)


async def kick_device(device_id: str, reason: str = "Device kicked by admin") -> bool:
    if device_id in active_connections:
        ws = active_connections[device_id]
        try:
            await ws.send_json(
                {
                    "type": "kicked",
                    "reason": reason,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            )
            await ws.close(code=4001, reason=reason)
        except Exception:
            pass
        finally:
            active_connections.pop(device_id, None)
    return True


async def notify_device_assignment(
    device_id: str,
    booth_id: str | None,
    booth_name: str | None = None,
    booth_location: str | None = None,
    booth_config: dict[str, Any] | None = None,
    booth_active: bool = True,
    reason: str | None = None,
) -> bool:
    """Notify device about assignment/unassignment change."""
    logger.debug(
        "notify_device_assignment: device_id=%s, booth_id=%s, connections=%s",
        device_id,
        booth_id,
        list(active_connections.keys()),
    )
    if device_id in active_connections:
        ws = active_connections[device_id]
        try:
            if booth_id:
                message = {
                    "type": "assigned",
                    "booth_id": booth_id,
                    "booth_name": booth_name,
                    "booth_location": booth_location,
                    "booth_config": booth_config,
                    "booth_active": booth_active,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                logger.debug("Sending assigned message to device %s", device_id)
                await ws.send_json(message)
            else:
                message = {
                    "type": "unassigned",
                    "reason": reason or "Device unassigned",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                logger.debug("Sending unassigned message to device %s", device_id)
                await ws.send_json(message)
            return True
        except Exception as e:
            logger.error(
                "Error sending WebSocket message to device %s: %s", device_id, e
            )
    else:
        logger.debug("Device %s not in active_connections", device_id)
    return False


async def broadcast_booth_update(booth_id: str, action: str = "updated") -> None:
    """Broadcast booth update to all admin connections."""
    message = {
        "type": "booth_update",
        "booth_id": booth_id,
        "action": action,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    logger.debug(
        "Broadcasting booth update to %d admin connections", len(admin_connections)
    )
    disconnected = []
    for ws in admin_connections:
        try:
            await ws.send_json(message)
        except Exception:
            disconnected.append(ws)
    for ws in disconnected:
        if ws in admin_connections:
            admin_connections.remove(ws)
