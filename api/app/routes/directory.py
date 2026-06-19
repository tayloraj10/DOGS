from uuid import UUID

from app.schemas import CategorySlug, DirectoryEntry, DirectoryEntryCreate, DirectoryEntryUpdate
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import DirectoryEntry as DirectoryEntryModel
from app.services.directory_service import (
    apply_create_data,
    apply_update_data,
    entry_to_schema,
    get_entry,
    list_entries,
    set_entry_categories,
)
from app.services.geocoding import geocode_location

router = APIRouter(prefix="/directory", tags=["directory"])


@router.get("", response_model=list[DirectoryEntry])
async def list_directory(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    category: CategorySlug | None = Query(None),
    db: Session = Depends(get_db),
):
    entries = list_entries(db, limit=limit, offset=offset, category_slug=category)
    return [entry_to_schema(e) for e in entries]


@router.get("/{entry_id}", response_model=DirectoryEntry)
def get_directory_entry(entry_id: UUID, db: Session = Depends(get_db)):
    entry = get_entry(db, entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    return entry_to_schema(entry)


@router.post("", response_model=DirectoryEntry, status_code=status.HTTP_201_CREATED)
async def create_directory_entry(body: DirectoryEntryCreate, db: Session = Depends(get_db)):
    entry = DirectoryEntryModel()
    apply_create_data(entry, body)
    db.add(entry)
    db.flush()

    if body.categories:
        set_entry_categories(db, entry, body.categories)

    if body.location:
        coords = await geocode_location(entry.location)
        if coords:
            entry.latitude, entry.longitude = coords

    db.commit()
    db.refresh(entry)
    entry = get_entry(db, entry.id)
    assert entry is not None
    return entry_to_schema(entry)


@router.patch("/{entry_id}", response_model=DirectoryEntry)
async def update_directory_entry(
    entry_id: UUID,
    body: DirectoryEntryUpdate,
    db: Session = Depends(get_db),
):
    entry = get_entry(db, entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")

    location_before = dict(entry.location) if entry.location else None
    apply_update_data(entry, body)

    if body.categories is not None:
        set_entry_categories(db, entry, body.categories)

    location_changed = body.location is not None and (
        body.location.model_dump(exclude_none=True) != location_before
    )
    if location_changed or (entry.latitude is None and entry.location):
        coords = await geocode_location(entry.location)
        if coords:
            entry.latitude, entry.longitude = coords

    db.commit()
    db.refresh(entry)
    entry = get_entry(db, entry.id)
    assert entry is not None
    return entry_to_schema(entry)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_directory_entry(entry_id: UUID, db: Session = Depends(get_db)):
    entry = get_entry(db, entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    db.delete(entry)
    db.commit()
