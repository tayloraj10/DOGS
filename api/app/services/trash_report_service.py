from uuid import UUID

from app.schemas import (
    ActivityStatus,
    Coordinates,
    StructuredLocation,
    TrashReport,
    TrashReportCreate,
    TrashReportSeverity,
    TrashReportUpdate,
)
from sqlalchemy.orm import Session

from app.models import TrashReport as TrashReportModel


def entry_to_schema(entry: TrashReportModel) -> TrashReport:
    coordinates = None
    if entry.latitude is not None and entry.longitude is not None:
        coordinates = Coordinates(latitude=entry.latitude, longitude=entry.longitude)

    return TrashReport(
        id=entry.id,
        title=entry.title,
        description=entry.description,
        location=StructuredLocation(**entry.location) if entry.location else None,
        coordinates=coordinates,
        image_urls=entry.image_urls or [],
        severity=TrashReportSeverity(entry.severity) if entry.severity else None,
        status=ActivityStatus(entry.status) if entry.status else None,
        reported_at=entry.reported_at,
        submitted_by_user_id=entry.submitted_by_user_id,
        resolved_by_user_id=entry.resolved_by_user_id,
        resolved_by_cleanup_id=entry.resolved_by_cleanup_id,
        resolved_at=entry.resolved_at,
    )


def get_entry(db: Session, entry_id: UUID) -> TrashReportModel | None:
    return db.query(TrashReportModel).filter(TrashReportModel.id == entry_id).first()


def list_entries(db: Session, *, limit: int = 50, offset: int = 0) -> list[TrashReportModel]:
    return (
        db.query(TrashReportModel)
        .order_by(TrashReportModel.reported_at.desc().nullslast())
        .offset(offset)
        .limit(limit)
        .all()
    )


def apply_create_data(entry: TrashReportModel, body: TrashReportCreate) -> None:
    entry.title = body.title[:255]
    entry.description = body.description
    entry.location = body.location.model_dump(exclude_none=True) if body.location else None
    entry.image_urls = body.image_urls or None
    entry.severity = body.severity.value if body.severity else None
    entry.status = body.status.value if body.status else None
    entry.reported_at = body.reported_at
    entry.submitted_by_user_id = body.submitted_by_user_id


def apply_update_data(entry: TrashReportModel, body: TrashReportUpdate) -> None:
    fields = body.model_fields_set
    if "title" in fields and body.title is not None:
        entry.title = body.title[:255]
    if "description" in fields:
        entry.description = body.description
    if "location" in fields:
        entry.location = body.location.model_dump(exclude_none=True) if body.location else None
    if "image_urls" in fields and body.image_urls is not None:
        entry.image_urls = body.image_urls or None
    if "severity" in fields:
        entry.severity = body.severity.value if body.severity else None
    if "status" in fields:
        entry.status = body.status.value if body.status else None
    if "reported_at" in fields:
        entry.reported_at = body.reported_at
    if "submitted_by_user_id" in fields:
        entry.submitted_by_user_id = body.submitted_by_user_id
    if "resolved_by_user_id" in fields:
        entry.resolved_by_user_id = body.resolved_by_user_id
    if "resolved_by_cleanup_id" in fields:
        entry.resolved_by_cleanup_id = body.resolved_by_cleanup_id
    if "resolved_at" in fields:
        entry.resolved_at = body.resolved_at
