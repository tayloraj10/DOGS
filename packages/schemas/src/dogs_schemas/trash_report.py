"""Trash report schema — shared contract only (no DOGS DB table in Phase 1)."""

from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, Field

from dogs_schemas.location import Coordinates


class TrashReportSeverity(StrEnum):
    low = "low"
    medium = "medium"
    high = "high"


class TrashReport(BaseModel):
    id: UUID
    location_text: str | None = None
    coordinates: Coordinates | None = None
    photo_urls: list[str] = Field(default_factory=list)
    severity: TrashReportSeverity | None = None
    status: str | None = None
    description: str | None = None
