from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from dogs_schemas.categories import CategorySlug
from dogs_schemas.location import Coordinates, SocialLinks, StructuredLocation


class DirectoryEntry(BaseModel):
    id: UUID
    name: str
    focus: str | None = None
    image_url: str | None = None
    location: StructuredLocation | None = None
    coordinates: Coordinates | None = None
    social_links: SocialLinks | None = None
    category_slugs: list[CategorySlug] = Field(default_factory=list)
    featured: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DirectoryEntryCreate(BaseModel):
    name: str
    focus: str | None = None
    image_url: str | None = None
    location: StructuredLocation | None = None
    social_links: SocialLinks | None = None
    category_slugs: list[CategorySlug] = Field(default_factory=list)
    featured: bool = False


class DirectoryEntryUpdate(BaseModel):
    name: str | None = None
    focus: str | None = None
    image_url: str | None = None
    location: StructuredLocation | None = None
    social_links: SocialLinks | None = None
    category_slugs: list[CategorySlug] | None = None
    featured: bool | None = None


class Category(BaseModel):
    id: UUID
    slug: CategorySlug
    name: str

    model_config = ConfigDict(from_attributes=True)
