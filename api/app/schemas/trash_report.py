"""Trash report schema — shared contract only (no DOGS DB table in Phase 1)."""

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.location import Coordinates
from app.schemas.status import ActivityStatus


class TrashReportSeverity(StrEnum):
    low = "low"
    medium = "medium"
    high = "high"


class TrashReport(BaseModel):
    id: UUID
    title: str
    description: str | None = None
    location_text: str | None = None
    coordinates: Coordinates | None = None
    image_urls: list[str] = Field(default_factory=list)
    severity: TrashReportSeverity | None = None
    status: ActivityStatus | None = None
    reported_at: datetime | None = None
