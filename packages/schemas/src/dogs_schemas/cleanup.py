"""Cleanup schema — shared contract only (no DOGS DB table in Phase 1)."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from dogs_schemas.location import Coordinates


class CleanupMetrics(BaseModel):
    small_bags: int | None = None
    large_bags: int | None = None
    pounds: float | None = None
    value: float | None = None


class Cleanup(BaseModel):
    id: UUID
    title: str
    description: str | None = None
    location_text: str | None = None
    coordinates: Coordinates | None = None
    scheduled_start: datetime | None = None
    scheduled_end: datetime | None = None
    status: str | None = None
    photo_urls: list[str] = Field(default_factory=list)
    metrics: CleanupMetrics | None = None
