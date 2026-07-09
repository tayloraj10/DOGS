from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class User(BaseModel):
    id: UUID
    email: str
    name: str | None = None
    photo_url: str | None = None
    admin: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    """Self-service profile update. `admin` and `firebase_uid` are never client-settable."""

    name: str | None = None
    photo_url: str | None = None
