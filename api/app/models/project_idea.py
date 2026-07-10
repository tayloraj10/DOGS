from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import DOGS_SCHEMA, Base

if TYPE_CHECKING:
    from app.models.category import Category
    from app.models.user import User


class ProjectIdea(Base):
    __tablename__ = "project_ideas"
    __table_args__ = {"schema": DOGS_SCHEMA}

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    submitter_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(f"{DOGS_SCHEMA}.users.id", ondelete="SET NULL"),
        nullable=True,
    )
    edit_token: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    merged_into_project_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(f"{DOGS_SCHEMA}.projects.id", ondelete="SET NULL"),
        nullable=True,
    )
    suggested_category: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    categories: Mapped[list["Category"]] = relationship(
        secondary=f"{DOGS_SCHEMA}.idea_categories",
        back_populates="ideas",
    )
    similar_apps: Mapped[list["IdeaSimilarApp"]] = relationship(
        back_populates="idea",
        cascade="all, delete-orphan",
        order_by="IdeaSimilarApp.created_at",
    )
    interests: Mapped[list["IdeaInterest"]] = relationship(
        back_populates="idea",
        cascade="all, delete-orphan",
        order_by="IdeaInterest.created_at",
    )
    submitter: Mapped["User | None"] = relationship(foreign_keys=[submitter_user_id])


class IdeaCategory(Base):
    __tablename__ = "idea_categories"
    __table_args__ = {"schema": DOGS_SCHEMA}

    idea_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(f"{DOGS_SCHEMA}.project_ideas.id", ondelete="CASCADE"),
        primary_key=True,
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(f"{DOGS_SCHEMA}.categories.id", ondelete="CASCADE"),
        primary_key=True,
    )


class IdeaSimilarApp(Base):
    __tablename__ = "idea_similar_apps"
    __table_args__ = {"schema": DOGS_SCHEMA}

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    idea_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(f"{DOGS_SCHEMA}.project_ideas.id", ondelete="CASCADE"),
        nullable=False,
    )
    url: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    added_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(f"{DOGS_SCHEMA}.users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    idea: Mapped["ProjectIdea"] = relationship(back_populates="similar_apps")


class IdeaInterest(Base):
    """Anyone signed in can mark themselves interested in an approved idea — not exclusive,
    any number of people can be interested in the same idea at once."""

    __tablename__ = "idea_interests"
    __table_args__ = {"schema": DOGS_SCHEMA}

    idea_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(f"{DOGS_SCHEMA}.project_ideas.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(f"{DOGS_SCHEMA}.users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    shared_fields: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    idea: Mapped["ProjectIdea"] = relationship(back_populates="interests")
    user: Mapped["User"] = relationship()
