import io
import mimetypes
from uuid import UUID

from app.schemas import (
    CategorySlug,
    DirectoryEntry,
    DirectoryEntryCreate,
    DirectoryEntryStatus,
    DirectoryEntryUpdate,
    DirectoryPhotoFromUrlRequest,
    DirectoryPhotoUploadResponse,
    StructuredLocation,
)
import httpx
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
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
from app.services.geocoding import geocode_location, lookup_location
from app.services.storage import ALLOWED_CONTENT_TYPES, gcs_storage

router = APIRouter(prefix="/directory", tags=["directory"])

MAX_PHOTO_BYTES = 10 * 1024 * 1024


@router.post(
    "/photos", response_model=DirectoryPhotoUploadResponse, status_code=status.HTTP_201_CREATED
)
async def upload_directory_photo(file: UploadFile = File(...)):
    if not gcs_storage:
        raise HTTPException(status_code=500, detail="Cloud storage is not configured")
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    is_valid, error_msg = gcs_storage.validate_image_file(file.filename)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid content type. Allowed: {', '.join(sorted(ALLOWED_CONTENT_TYPES))}",
        )

    try:
        url = gcs_storage.upload_directory_entry_photo(file.file, file.filename, file.content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload photo: {e}")
    return DirectoryPhotoUploadResponse(url=url)


@router.post(
    "/photos/from-url",
    response_model=DirectoryPhotoUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def fetch_and_upload_directory_photo(body: DirectoryPhotoFromUrlRequest):
    """Fetch an image from an external URL (e.g. a scraped og:image) and re-host it in our
    own bucket, since externally-hosted photo URLs are prone to breaking or disappearing."""
    if not gcs_storage:
        raise HTTPException(status_code=500, detail="Cloud storage is not configured")
    if not (body.url.startswith("http://") or body.url.startswith("https://")):
        raise HTTPException(status_code=400, detail="url must start with http:// or https://")

    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(
                body.url, headers={"User-Agent": "Mozilla/5.0 (compatible; DOGSBot/1.0)"}
            )
            response.raise_for_status()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=400, detail=f"Could not fetch image: {e}")

    content_type = response.headers.get("content-type", "").split(";")[0].strip()
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"URL did not return a supported image type (got {content_type or 'unknown'})",
        )
    if len(response.content) > MAX_PHOTO_BYTES:
        raise HTTPException(status_code=400, detail="Image is too large (max 10MB)")

    ext = mimetypes.guess_extension(content_type) or ".jpg"
    try:
        url = gcs_storage.upload_directory_entry_photo(
            io.BytesIO(response.content), f"image{ext}", content_type
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload photo: {e}")
    return DirectoryPhotoUploadResponse(url=url)


@router.get("", response_model=list[DirectoryEntry])
async def list_directory(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    category: CategorySlug | None = Query(None),
    status: DirectoryEntryStatus | None = Query(None),
    needs_photo: bool = Query(False),
    db: Session = Depends(get_db),
):
    entries = list_entries(
        db, limit=limit, offset=offset, category_slug=category, status=status, needs_photo=needs_photo
    )
    return [entry_to_schema(e) for e in entries]


@router.post("/location/lookup", response_model=StructuredLocation)
async def lookup_directory_location(body: StructuredLocation):
    """Fill in missing location fields (city/state/zip/country) from whatever's already
    entered, using the Geocoding API. Never overwrites fields the caller already filled in."""
    merged = await lookup_location(body.model_dump(exclude_none=True))
    if not merged:
        raise HTTPException(
            status_code=404, detail="Could not find a matching location for the info provided"
        )
    return StructuredLocation(**merged)


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
