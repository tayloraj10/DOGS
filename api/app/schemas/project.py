from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.categories import CategorySlug
from app.schemas.directory import DirectoryEntryStatus
from app.schemas.location import (
    Coordinates,
    SocialLinks,
    StructuredLocation,
    validate_location,
)


class ProjectStage(StrEnum):
    active = "active"
    in_development = "in_development"
    beta = "beta"
    sunset = "sunset"


class LinkedDirectoryEntry(BaseModel):
    id: UUID
    name: str

    model_config = ConfigDict(from_attributes=True)


class Project(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    image_url: str | None = None
    image_is_external: bool = False
    location: StructuredLocation | None = None
    coordinates: Coordinates | None = None
    social_links: SocialLinks | None = None
    categories: list[CategorySlug] = Field(default_factory=list)
    suggested_category: str | None = None
    stage: ProjectStage | None = None
    featured: bool = False
    status: DirectoryEntryStatus = DirectoryEntryStatus.published
    user_ids: list[UUID] = Field(default_factory=list)
    directory_entries: list[LinkedDirectoryEntry] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    image_url: str | None = None
    location: StructuredLocation | None = None
    social_links: SocialLinks | None = None
    categories: list[CategorySlug] = Field(default_factory=list)
    suggested_category: str | None = None
    stage: ProjectStage | None = None
    featured: bool = False
    status: DirectoryEntryStatus = DirectoryEntryStatus.published
    user_ids: list[UUID] = Field(default_factory=list)
    directory_entry_ids: list[UUID] = Field(default_factory=list)

    @field_validator("location")
    @classmethod
    def _check_location(cls, v: StructuredLocation | None) -> StructuredLocation | None:
        return validate_location(v)


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    image_url: str | None = None
    location: StructuredLocation | None = None
    social_links: SocialLinks | None = None
    categories: list[CategorySlug] | None = None
    suggested_category: str | None = None
    stage: ProjectStage | None = None
    featured: bool | None = None
    status: DirectoryEntryStatus | None = None
    user_ids: list[UUID] | None = None
    directory_entry_ids: list[UUID] | None = None

    @field_validator("location")
    @classmethod
    def _check_location(cls, v: StructuredLocation | None) -> StructuredLocation | None:
        return validate_location(v)


class ProjectPublicUpdate(BaseModel):
    """Fields a self-service edit link is allowed to change. Excludes status, featured,
    and user_ids, which stay admin-only."""

    name: str | None = None
    description: str | None = None
    image_url: str | None = None
    location: StructuredLocation | None = None
    social_links: SocialLinks | None = None
    categories: list[CategorySlug] | None = None
    suggested_category: str | None = None
    stage: ProjectStage | None = None
    directory_entry_ids: list[UUID] | None = None

    @field_validator("location")
    @classmethod
    def _check_location(cls, v: StructuredLocation | None) -> StructuredLocation | None:
        return validate_location(v)


class ProjectEditLink(BaseModel):
    token: str
