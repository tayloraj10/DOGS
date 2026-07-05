from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import DOGS_SCHEMA, Base

if TYPE_CHECKING:
    from app.models.category import Category
    from app.models.directory import DirectoryEntry


class Project(Base):
    __tablename__ = "projects"
    __table_args__ = {"schema": DOGS_SCHEMA}

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    latitude: Mapped[float | None] = mapped_column(nullable=True)
    longitude: Mapped[float | None] = mapped_column(nullable=True)
    social_links: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    stage: Mapped[str | None] = mapped_column(String(20), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="published", nullable=False)
    suggested_category: Mapped[str | None] = mapped_column(String(255), nullable=True)
    edit_token: Mapped[str | None] = mapped_column(String(64), nullable=True)
    featured: Mapped[bool] = mapped_column(default=False, nullable=False)
    user_ids: Mapped[list | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    categories: Mapped[list["Category"]] = relationship(
        secondary=f"{DOGS_SCHEMA}.project_categories",
        back_populates="projects",
    )
    directory_entries: Mapped[list["DirectoryEntry"]] = relationship(
        secondary=f"{DOGS_SCHEMA}.project_directory_entries",
    )


class ProjectCategory(Base):
    __tablename__ = "project_categories"
    __table_args__ = {"schema": DOGS_SCHEMA}

    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(f"{DOGS_SCHEMA}.projects.id", ondelete="CASCADE"),
        primary_key=True,
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(f"{DOGS_SCHEMA}.categories.id", ondelete="CASCADE"),
        primary_key=True,
    )


class ProjectDirectoryEntry(Base):
    __tablename__ = "project_directory_entries"
    __table_args__ = {"schema": DOGS_SCHEMA}

    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(f"{DOGS_SCHEMA}.projects.id", ondelete="CASCADE"),
        primary_key=True,
    )
    directory_entry_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(f"{DOGS_SCHEMA}.directory_entries.id", ondelete="CASCADE"),
        primary_key=True,
    )
