from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Double, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.database import DOGS_SCHEMA, Base


class Cleanup(Base):
    __tablename__ = "cleanups"
    __table_args__ = {"schema": DOGS_SCHEMA}

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    latitude: Mapped[float | None] = mapped_column(Double, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Double, nullable=True)
    scheduled_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    scheduled_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    photo_urls: Mapped[list | None] = mapped_column(JSON, nullable=True)
    metrics: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    submitted_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), nullable=True
    )
    organizer_user_ids: Mapped[list | None] = mapped_column(JSON, nullable=True)
    rsvp_user_ids: Mapped[list | None] = mapped_column(JSON, nullable=True)
    attended_user_ids: Mapped[list | None] = mapped_column(JSON, nullable=True)
