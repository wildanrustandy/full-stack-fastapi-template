import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import SQLModel

from app import crud
from app.api.deps import SessionDep
from app.models import (
    KioskSessionUpdate,
    Photo,
    PhotoCreate,
    PhotoPublic,
    PhotosPublic,
)

router = APIRouter(prefix="/photos", tags=["photos"])


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------


class PhotoUploadItem(SQLModel):
    data_url: str
    order: int


class PhotoUploadBody(SQLModel):
    session_id: uuid.UUID
    photos: list[PhotoUploadItem]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("/upload", response_model=PhotosPublic)
def upload_photos(body: PhotoUploadBody, session: SessionDep) -> Any:
    """Upload multiple photos for a session and mark the session as completed."""
    # Validate that the kiosk session exists
    kiosk_session = crud.get_kiosk_session(session=session, session_id=body.session_id)
    if not kiosk_session:
        raise HTTPException(status_code=404, detail="Kiosk session not found")

    created_photos: list[Photo] = []
    for item in body.photos:
        photo_in = PhotoCreate(
            session_id=body.session_id,
            file_url=item.data_url,
            order=item.order,
        )
        photo = crud.create_photo(session=session, photo_in=photo_in)
        created_photos.append(photo)

    # Mark the kiosk session as completed
    crud.update_kiosk_session(
        session=session,
        db_session=kiosk_session,
        session_in=KioskSessionUpdate(status="completed"),
    )

    return PhotosPublic(
        data=[PhotoPublic.model_validate(p) for p in created_photos],
        count=len(created_photos),
    )


@router.get("/session/{session_id}", response_model=PhotosPublic)
def get_photos_by_session(session_id: uuid.UUID, session: SessionDep) -> Any:
    """Get all photos for a given session, ordered by `order`."""
    photos = crud.get_photos_by_session(session=session, session_id=session_id)
    return PhotosPublic(
        data=[PhotoPublic.model_validate(p) for p in photos],
        count=len(photos),
    )


@router.get("/{photo_id}", response_model=PhotoPublic)
def get_photo(photo_id: uuid.UUID, session: SessionDep) -> Any:
    """Get a single photo by its ID."""
    photo = session.get(Photo, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    return photo
