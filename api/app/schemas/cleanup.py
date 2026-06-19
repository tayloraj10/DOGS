"""Cleanup schema."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.location import Coordinates, StructuredLocation
from app.schemas.status import ActivityStatus


class CleanupMetrics(BaseModel):
    small_bags: int | None = None
    large_bags: int | None = None
    pounds: float | None = None


class Cleanup(BaseModel):
    id: UUID
    title: str
    description: str | None = None
    location: StructuredLocation | None = None
    coordinates: Coordinates | None = None
    scheduled_start: datetime | None = None
    scheduled_end: datetime | None = None
    status: ActivityStatus | None = None
    photo_urls: list[str] = Field(default_factory=list)
    metrics: CleanupMetrics | None = None
    submitted_by_user_id: UUID | None = None
    organizer_user_ids: list[UUID] = Field(default_factory=list)
    rsvp_user_ids: list[UUID] = Field(default_factory=list)
    attended_user_ids: list[UUID] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class CleanupCreate(BaseModel):
    title: str
    description: str | None = None
    location: StructuredLocation | None = None
    scheduled_start: datetime | None = None
    scheduled_end: datetime | None = None
    status: ActivityStatus | None = None
    photo_urls: list[str] = Field(default_factory=list)
    metrics: CleanupMetrics | None = None
    submitted_by_user_id: UUID | None = None
    organizer_user_ids: list[UUID] = Field(default_factory=list)
    rsvp_user_ids: list[UUID] = Field(default_factory=list)
    attended_user_ids: list[UUID] = Field(default_factory=list)


class CleanupUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    location: StructuredLocation | None = None
    scheduled_start: datetime | None = None
    scheduled_end: datetime | None = None
    status: ActivityStatus | None = None
    photo_urls: list[str] | None = None
    metrics: CleanupMetrics | None = None
    submitted_by_user_id: UUID | None = None
    organizer_user_ids: list[UUID] | None = None
    rsvp_user_ids: list[UUID] | None = None
    attended_user_ids: list[UUID] | None = None
