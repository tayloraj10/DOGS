"""Trash report schema."""

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.location import Coordinates, StructuredLocation
from app.schemas.status import ActivityStatus


class TrashReportSeverity(StrEnum):
    low = "low"
    medium = "medium"
    high = "high"


class TrashReport(BaseModel):
    id: UUID
    title: str
    description: str | None = None
    location: StructuredLocation | None = None
    coordinates: Coordinates | None = None
    image_urls: list[str] = Field(default_factory=list)
    severity: TrashReportSeverity | None = None
    status: ActivityStatus | None = None
    reported_at: datetime | None = None
    submitted_by_user_id: UUID | None = None
    resolved_by_user_id: UUID | None = None
    resolved_by_cleanup_id: UUID | None = None
    resolved_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class TrashReportCreate(BaseModel):
    title: str
    description: str | None = None
    location: StructuredLocation | None = None
    image_urls: list[str] = Field(default_factory=list)
    severity: TrashReportSeverity | None = None
    status: ActivityStatus | None = None
    reported_at: datetime | None = None
    submitted_by_user_id: UUID | None = None


class TrashReportUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    location: StructuredLocation | None = None
    image_urls: list[str] | None = None
    severity: TrashReportSeverity | None = None
    status: ActivityStatus | None = None
    reported_at: datetime | None = None
    submitted_by_user_id: UUID | None = None
    resolved_by_user_id: UUID | None = None
    resolved_by_cleanup_id: UUID | None = None
    resolved_at: datetime | None = None
