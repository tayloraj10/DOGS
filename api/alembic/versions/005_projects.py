"""Create projects, project_categories, and project_directory_entries tables."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "005_projects"
down_revision: Union[str, None] = "004_directory_entry_edit_token"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = "dogs"


def upgrade() -> None:
    op.create_table(
        "projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("location", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("latitude", sa.Double(), nullable=True),
        sa.Column("longitude", sa.Double(), nullable=True),
        sa.Column("social_links", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("stage", sa.String(20), nullable=True),
        sa.Column(
            "status", sa.String(20), nullable=False, server_default=sa.text("'published'")
        ),
        sa.Column("suggested_category", sa.String(255), nullable=True),
        sa.Column("edit_token", sa.String(64), nullable=True),
        sa.Column("featured", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("user_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        schema=SCHEMA,
    )

    op.create_table(
        "project_categories",
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(f"{SCHEMA}.projects.id", ondelete="CASCADE"),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "category_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(f"{SCHEMA}.categories.id", ondelete="CASCADE"),
            primary_key=True,
            nullable=False,
        ),
        schema=SCHEMA,
    )

    op.create_table(
        "project_directory_entries",
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(f"{SCHEMA}.projects.id", ondelete="CASCADE"),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "directory_entry_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(f"{SCHEMA}.directory_entries.id", ondelete="CASCADE"),
            primary_key=True,
            nullable=False,
        ),
        schema=SCHEMA,
    )

    op.create_index(
        "ix_projects_name_lower",
        "projects",
        [sa.text("lower(name)")],
        unique=False,
        schema=SCHEMA,
    )


def downgrade() -> None:
    op.drop_index("ix_projects_name_lower", table_name="projects", schema=SCHEMA)
    op.drop_table("project_directory_entries", schema=SCHEMA)
    op.drop_table("project_categories", schema=SCHEMA)
    op.drop_table("projects", schema=SCHEMA)
