from uuid import UUID

from app.schemas import Cleanup, CleanupCreate, CleanupUpdate
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Cleanup as CleanupModel
from app.services.cleanup_service import (
    apply_create_data,
    apply_update_data,
    entry_to_schema,
    get_entry,
    list_entries,
)
from app.services.geocoding import geocode_location

router = APIRouter(prefix="/cleanups", tags=["cleanups"])


@router.get("", response_model=list[Cleanup])
async def list_cleanups(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    entries = list_entries(db, limit=limit, offset=offset)
    return [entry_to_schema(e) for e in entries]


@router.get("/{entry_id}", response_model=Cleanup)
def get_cleanup(entry_id: UUID, db: Session = Depends(get_db)):
    entry = get_entry(db, entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cleanup not found")
    return entry_to_schema(entry)


@router.post("", response_model=Cleanup, status_code=status.HTTP_201_CREATED)
async def create_cleanup(body: CleanupCreate, db: Session = Depends(get_db)):
    entry = CleanupModel()
    apply_create_data(entry, body)

    if body.location:
        coords = await geocode_location(entry.location)
        if coords:
            entry.latitude, entry.longitude = coords

    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry_to_schema(entry)


@router.patch("/{entry_id}", response_model=Cleanup)
async def update_cleanup(entry_id: UUID, body: CleanupUpdate, db: Session = Depends(get_db)):
    entry = get_entry(db, entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cleanup not found")

    location_before = dict(entry.location) if entry.location else None
    apply_update_data(entry, body)

    location_changed = body.location is not None and (
        body.location.model_dump(exclude_none=True) != location_before
    )
    if location_changed:
        coords = await geocode_location(entry.location)
        if coords:
            entry.latitude, entry.longitude = coords

    db.commit()
    db.refresh(entry)
    return entry_to_schema(entry)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cleanup(entry_id: UUID, db: Session = Depends(get_db)):
    entry = get_entry(db, entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cleanup not found")
    db.delete(entry)
    db.commit()
