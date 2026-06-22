from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.categories import CategorySlug
from app.schemas.location import (
    Coordinates,
    SocialLinks,
    StructuredLocation,
    is_us_country,
    validate_us_state,
)


class DirectoryEntryStatus(StrEnum):
    pending = "pending"
    published = "published"


def _validate_location(location: StructuredLocation | None) -> StructuredLocation | None:
    if location and location.state and is_us_country(location.country):
        location.state = validate_us_state(location.state)
    return location


class DirectoryEntry(BaseModel):
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
    featured: bool = False
    status: DirectoryEntryStatus = DirectoryEntryStatus.published
    user_ids: list[UUID] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DirectoryEntryCreate(BaseModel):
    name: str
    description: str | None = None
    image_url: str | None = None
    location: StructuredLocation | None = None
    social_links: SocialLinks | None = None
    categories: list[CategorySlug] = Field(default_factory=list)
    suggested_category: str | None = None
    featured: bool = False
    status: DirectoryEntryStatus = DirectoryEntryStatus.published
    user_ids: list[UUID] = Field(default_factory=list)

    @field_validator("location")
    @classmethod
    def _check_location(cls, v: StructuredLocation | None) -> StructuredLocation | None:
        return _validate_location(v)


class DirectoryEntryUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    image_url: str | None = None
    location: StructuredLocation | None = None
    social_links: SocialLinks | None = None
    categories: list[CategorySlug] | None = None
    suggested_category: str | None = None
    featured: bool | None = None
    status: DirectoryEntryStatus | None = None
    user_ids: list[UUID] | None = None

    @field_validator("location")
    @classmethod
    def _check_location(cls, v: StructuredLocation | None) -> StructuredLocation | None:
        return _validate_location(v)


class DirectoryEntryPublicUpdate(BaseModel):
    """Fields a self-service edit link is allowed to change. Excludes status, featured,
    and user_ids, which stay admin-only."""

    name: str | None = None
    description: str | None = None
    image_url: str | None = None
    location: StructuredLocation | None = None
    social_links: SocialLinks | None = None
    categories: list[CategorySlug] | None = None
    suggested_category: str | None = None

    @field_validator("location")
    @classmethod
    def _check_location(cls, v: StructuredLocation | None) -> StructuredLocation | None:
        return _validate_location(v)


class DirectoryEntryEditLink(BaseModel):
    token: str


class Category(BaseModel):
    id: UUID
    slug: CategorySlug
    name: str

    model_config = ConfigDict(from_attributes=True)
