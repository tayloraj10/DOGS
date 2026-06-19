from uuid import UUID

from app.schemas import (
    ActivityStatus,
    Cleanup,
    CleanupCreate,
    CleanupMetrics,
    CleanupUpdate,
    Coordinates,
    StructuredLocation,
)
from sqlalchemy.orm import Session

from app.models import Cleanup as CleanupModel


def _parse_user_ids(raw: list | None) -> list[UUID]:
    if not raw:
        return []
    return [UUID(str(item)) for item in raw]


def _serialize_user_ids(user_ids: list[UUID] | None) -> list[str] | None:
    if not user_ids:
        return None
    return [str(uid) for uid in user_ids]


def entry_to_schema(entry: CleanupModel) -> Cleanup:
    coordinates = None
    if entry.latitude is not None and entry.longitude is not None:
        coordinates = Coordinates(latitude=entry.latitude, longitude=entry.longitude)

    return Cleanup(
        id=entry.id,
        title=entry.title,
        description=entry.description,
        location=StructuredLocation(**entry.location) if entry.location else None,
        coordinates=coordinates,
        scheduled_start=entry.scheduled_start,
        scheduled_end=entry.scheduled_end,
        status=ActivityStatus(entry.status) if entry.status else None,
        photo_urls=entry.photo_urls or [],
        metrics=CleanupMetrics(**entry.metrics) if entry.metrics else None,
        submitted_by_user_id=entry.submitted_by_user_id,
        organizer_user_ids=_parse_user_ids(entry.organizer_user_ids),
        rsvp_user_ids=_parse_user_ids(entry.rsvp_user_ids),
        attended_user_ids=_parse_user_ids(entry.attended_user_ids),
    )


def get_entry(db: Session, entry_id: UUID) -> CleanupModel | None:
    return db.query(CleanupModel).filter(CleanupModel.id == entry_id).first()


def list_entries(db: Session, *, limit: int = 50, offset: int = 0) -> list[CleanupModel]:
    return (
        db.query(CleanupModel)
        .order_by(CleanupModel.scheduled_start.desc().nullslast())
        .offset(offset)
        .limit(limit)
        .all()
    )


def apply_create_data(entry: CleanupModel, body: CleanupCreate) -> None:
    entry.title = body.title[:255]
    entry.description = body.description
    entry.location = body.location.model_dump(exclude_none=True) if body.location else None
    entry.scheduled_start = body.scheduled_start
    entry.scheduled_end = body.scheduled_end
    entry.status = body.status.value if body.status else None
    entry.photo_urls = body.photo_urls or None
    entry.metrics = body.metrics.model_dump(exclude_none=True) if body.metrics else None
    entry.submitted_by_user_id = body.submitted_by_user_id
    entry.organizer_user_ids = _serialize_user_ids(body.organizer_user_ids)
    entry.rsvp_user_ids = _serialize_user_ids(body.rsvp_user_ids)
    entry.attended_user_ids = _serialize_user_ids(body.attended_user_ids)


def apply_update_data(entry: CleanupModel, body: CleanupUpdate) -> None:
    fields = body.model_fields_set
    if "title" in fields and body.title is not None:
        entry.title = body.title[:255]
    if "description" in fields:
        entry.description = body.description
    if "location" in fields:
        entry.location = body.location.model_dump(exclude_none=True) if body.location else None
    if "scheduled_start" in fields:
        entry.scheduled_start = body.scheduled_start
    if "scheduled_end" in fields:
        entry.scheduled_end = body.scheduled_end
    if "status" in fields:
        entry.status = body.status.value if body.status else None
    if "photo_urls" in fields and body.photo_urls is not None:
        entry.photo_urls = body.photo_urls or None
    if "metrics" in fields:
        entry.metrics = body.metrics.model_dump(exclude_none=True) if body.metrics else None
    if "submitted_by_user_id" in fields:
        entry.submitted_by_user_id = body.submitted_by_user_id
    if "organizer_user_ids" in fields and body.organizer_user_ids is not None:
        entry.organizer_user_ids = _serialize_user_ids(body.organizer_user_ids)
    if "rsvp_user_ids" in fields and body.rsvp_user_ids is not None:
        entry.rsvp_user_ids = _serialize_user_ids(body.rsvp_user_ids)
    if "attended_user_ids" in fields and body.attended_user_ids is not None:
        entry.attended_user_ids = _serialize_user_ids(body.attended_user_ids)
