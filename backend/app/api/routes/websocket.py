import asyncio
import json
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["websocket"])

# Module-level connection stores
active_connections: dict[str, WebSocket] = {}
admin_connections: list[WebSocket] = []


@router.websocket("/ws/device/{device_id}")
async def device_websocket(websocket: WebSocket, device_id: str) -> None:
    await websocket.accept()
    print(f"DEBUG: WebSocket connected for device: {device_id}")
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


async def broadcast_transaction_update(transaction_data: dict) -> None:
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
    booth_config: dict | None = None,
    booth_active: bool = True,
    reason: str | None = None,
) -> bool:
    """Notify device about assignment/unassignment change."""
    print(
        f"DEBUG notify_device_assignment: device_id={device_id}, booth_id={booth_id}, active_connections={list(active_connections.keys())}"
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
                print(f"DEBUG: Sending assigned message: {message}")
                await ws.send_json(message)
            else:
                message = {
                    "type": "unassigned",
                    "reason": reason or "Device unassigned",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                print(f"DEBUG: Sending unassigned message: {message}")
                await ws.send_json(message)
            return True
        except Exception as e:
            print(f"DEBUG: Error sending WebSocket message: {e}")
    else:
        print(f"DEBUG: Device {device_id} not in active_connections")
    return False


async def broadcast_booth_update(booth_id: str, action: str = "updated") -> None:
    """Broadcast booth update to all admin connections."""
    message = {
        "type": "booth_update",
        "booth_id": booth_id,
        "action": action,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    print(
        f"DEBUG: Broadcasting booth update to {len(admin_connections)} admin connections: {message}"
    )
    disconnected = []
    for ws in admin_connections:
        try:
            await ws.send_json(message)
        except Exception as e:
            print(f"DEBUG: Error sending to admin: {e}")
            disconnected.append(ws)
    for ws in disconnected:
        if ws in admin_connections:
            admin_connections.remove(ws)
