from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ProjectMember(BaseModel):
    user_id: UUID
    name: str | None = None
    photo_url: str | None = None
    is_originator: bool = False
    shared_contact: dict[str, str] = {}
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectMemberJoin(BaseModel):
    shared_fields: list[str] = []


class ProjectMemberUpdate(BaseModel):
    """Self-service update for which of a member's own contact fields are shared."""

    shared_fields: list[str] | None = None
