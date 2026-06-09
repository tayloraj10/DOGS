from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from dogs_schemas.categories import CategorySlug
from dogs_schemas.location import Coordinates, SocialLinks, StructuredLocation


class DirectoryEntry(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    image_url: str | None = None
    location: StructuredLocation | None = None
    coordinates: Coordinates | None = None
    social_links: SocialLinks | None = None
    categories: list[CategorySlug] = Field(default_factory=list)
    featured: bool = False
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
    featured: bool = False
    user_ids: list[UUID] = Field(default_factory=list)


class DirectoryEntryUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    image_url: str | None = None
    location: StructuredLocation | None = None
    social_links: SocialLinks | None = None
    categories: list[CategorySlug] | None = None
    featured: bool | None = None
    user_ids: list[UUID] | None = None


class Category(BaseModel):
    id: UUID
    slug: CategorySlug
    name: str

    model_config = ConfigDict(from_attributes=True)
