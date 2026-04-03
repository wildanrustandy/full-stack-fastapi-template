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
    device_id: str, booth_id: str | None, booth_name: str | None = None
) -> bool:
    """Notify device about assignment/unassignment change."""
    if device_id in active_connections:
        ws = active_connections[device_id]
        try:
            if booth_id:
                await ws.send_json(
                    {
                        "type": "assigned",
                        "booth_id": booth_id,
                        "booth_name": booth_name,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                )
            else:
                await ws.send_json(
                    {
                        "type": "unassigned",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                )
            return True
        except Exception:
            pass
    return False
