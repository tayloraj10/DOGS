from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, ForeignKey, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import DOGS_SCHEMA, Base

if TYPE_CHECKING:
    from app.models.user import User


class ProjectMember(Base):
    __tablename__ = "project_members"
    __table_args__ = {"schema": DOGS_SCHEMA}

    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(f"{DOGS_SCHEMA}.projects.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(f"{DOGS_SCHEMA}.users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    shared_fields: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship()
