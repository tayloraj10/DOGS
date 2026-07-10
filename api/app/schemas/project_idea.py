from datetime import datetime
from enum import StrEnum
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.categories import CategorySlug


class ProjectIdeaStatus(StrEnum):
    pending = "pending"
    approved = "approved"
    claimed = "claimed"
    converted = "converted"
    rejected = "rejected"
    merged = "merged"


class SimilarApp(BaseModel):
    id: UUID
    url: str
    name: str | None = None
    note: str | None = None
    added_by_user_id: UUID | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SimilarAppCreate(BaseModel):
    url: str
    name: str | None = None
    note: str | None = None


class IdeaInterest(BaseModel):
    user_id: UUID
    name: str | None = None
    photo_url: str | None = None
    shared_contact: dict[str, str] = {}
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IdeaInterestCreate(BaseModel):
    shared_fields: list[str] = []


class ProjectIdea(BaseModel):
    id: UUID
    name: str
    description: str
    categories: list[CategorySlug] = Field(default_factory=list)
    suggested_category: str | None = None
    status: ProjectIdeaStatus = ProjectIdeaStatus.pending
    submitter_user_id: UUID | None = None
    submitter_name: str | None = None
    merged_into_project_id: UUID | None = None
    interested: list[IdeaInterest] = Field(default_factory=list)
    similar_apps: list[SimilarApp] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectIdeaCreate(BaseModel):
    name: str
    description: str
    categories: list[CategorySlug] = Field(default_factory=list)
    suggested_category: str | None = None


class ProjectIdeaUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    categories: list[CategorySlug] | None = None
    suggested_category: str | None = None
    status: ProjectIdeaStatus | None = None


class ProjectIdeaPublicUpdate(BaseModel):
    """Fields a self-service edit link is allowed to change. Excludes status and
    merged_into_project_id, which stay admin-only."""

    name: str | None = None
    description: str | None = None
    categories: list[CategorySlug] | None = None
    suggested_category: str | None = None


class ProjectIdeaEditLink(BaseModel):
    token: str


class SimilarMatch(BaseModel):
    """One dedup search hit — either an existing idea or an existing published project."""

    kind: Literal["idea", "project"]
    id: UUID
    name: str
    description: str | None = None
    similarity: float
