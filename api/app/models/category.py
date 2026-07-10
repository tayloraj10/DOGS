from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import DOGS_SCHEMA, Base

if TYPE_CHECKING:
    from app.models.directory import DirectoryEntry
    from app.models.project import Project
    from app.models.project_idea import ProjectIdea


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = {"schema": DOGS_SCHEMA}

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)

    directory_entries: Mapped[list["DirectoryEntry"]] = relationship(
        secondary=f"{DOGS_SCHEMA}.directory_entry_categories",
        back_populates="categories",
    )
    projects: Mapped[list["Project"]] = relationship(
        secondary=f"{DOGS_SCHEMA}.project_categories",
        back_populates="categories",
    )
    ideas: Mapped[list["ProjectIdea"]] = relationship(
        secondary=f"{DOGS_SCHEMA}.idea_categories",
        back_populates="categories",
    )
