from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import DirectoryEntry
from app.services.geocoding import geocode_location
from app.services.sheet_sync import sync_from_google_sheet

router = APIRouter(prefix="/admin", tags=["admin"])


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
