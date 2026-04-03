from fastapi import APIRouter

from app.api.routes import (
    admin_photobooth,
    booths,
    devices,
    items,
    login,
    payments,
    photos,
    private,
    users,
    utils,
    websocket,
)
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(items.router)

# Photobooth routes
api_router.include_router(booths.router)
api_router.include_router(payments.router)
api_router.include_router(photos.router)
api_router.include_router(admin_photobooth.router)
api_router.include_router(websocket.router)
api_router.include_router(devices.router)


if settings.ENVIRONMENT == "local":
    api_router.include_router(private.router)
