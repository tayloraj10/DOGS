from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import DirectoryEntry
from app.services.directory_service import find_orphaned_images, get_or_create_edit_token
from app.services.geocoding import geocode_location
from app.services.sheet_sync import sync_from_google_sheet
from app.services.storage import gcs_storage

router = APIRouter(prefix="/admin", tags=["admin"])


class BackfillEditTokensResponse(BaseModel):
    backfilled: int


class OrphanedImage(BaseModel):
    name: str
    url: str
    size_bytes: int


class OrphanedImagesResponse(BaseModel):
    orphans: list[OrphanedImage]


class DeleteOrphanedImagesResponse(BaseModel):
    deleted: int


class SheetSyncResponse(BaseModel):
    created: int
    updated: int
    skipped: int
    rows_seen: int
    geocoded: int
    geo_failed: int
    images_skipped: int
    errors: list[str]


@router.post("/sync-from-sheet", response_model=SheetSyncResponse)
async def sync_from_sheet(db: Session = Depends(get_db)):
    """Pull Directory of Good rows from Google Sheet, upsert, then geocode missing coordinates."""
    cred_path = settings.GOOGLE_APPLICATION_CREDENTIALS.strip() or None
    result = sync_from_google_sheet(
        db,
        spreadsheet_id=settings.GOOGLE_SHEETS_SPREADSHEET_ID,
        sheet_gid=settings.GOOGLE_SHEETS_SHEET_GID,
        credentials_path=cred_path,
    )

    geocoded = geo_failed = 0
    if settings.GOOGLE_MAPS_GEOCODING_API_KEY and result.rows_seen > 0:
        ungeocoded = (
            db.query(DirectoryEntry)
            .filter(DirectoryEntry.latitude.is_(None))
            .filter(DirectoryEntry.location.isnot(None))
            .all()
        )
        for entry in ungeocoded:
            coords = await geocode_location(entry.location)
            if coords:
                entry.latitude, entry.longitude = coords
                geocoded += 1
            else:
                geo_failed += 1
        if geocoded or geo_failed:
            db.commit()

    return SheetSyncResponse(
        created=result.created,
        updated=result.updated,
        skipped=result.skipped,
        rows_seen=result.rows_seen,
        geocoded=geocoded,
        geo_failed=geo_failed,
        images_skipped=result.images_skipped,
        errors=result.errors,
    )


@router.post("/backfill-edit-tokens", response_model=BackfillEditTokensResponse)
def backfill_edit_tokens(db: Session = Depends(get_db)):
    """Generate edit tokens for any existing entries that don't have one yet."""
    entries = db.query(DirectoryEntry).filter(DirectoryEntry.edit_token.is_(None)).all()
    for entry in entries:
        get_or_create_edit_token(db, entry)
    return BackfillEditTokensResponse(backfilled=len(entries))


@router.get("/orphaned-images", response_model=OrphanedImagesResponse)
def list_orphaned_images(db: Session = Depends(get_db)):
    """GCS-hosted directory photos no entry references anymore (left behind by re-hosts/replacements)."""
    orphans = find_orphaned_images(db)
    return OrphanedImagesResponse(
        orphans=[
            OrphanedImage(name=b.name, url=b.public_url, size_bytes=b.size or 0) for b in orphans
        ]
    )


@router.delete("/orphaned-images", response_model=DeleteOrphanedImagesResponse)
def delete_orphaned_images(db: Session = Depends(get_db)):
    """Delete GCS-hosted directory photos no entry references anymore."""
    orphans = find_orphaned_images(db)
    for blob in orphans:
        gcs_storage.delete_blob(blob.name)
    return DeleteOrphanedImagesResponse(deleted=len(orphans))
