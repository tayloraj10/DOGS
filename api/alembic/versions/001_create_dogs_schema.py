"""Create dogs schema, directory tables, and seed categories."""

import uuid
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001_create_dogs_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = "dogs"

SEED_CATEGORIES = [
    ("animals", "Animals"),
    ("environment", "Environment"),
    ("fitness", "Fitness"),
    ("nature", "Nature"),
    ("trash", "Trash"),
    ("water", "Water"),
]


def upgrade() -> None:
    op.execute(f"CREATE SCHEMA IF NOT EXISTS {SCHEMA}")

    op.create_table(
        "categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("slug", sa.String(50), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.UniqueConstraint("slug", name="uq_categories_slug"),
        sa.UniqueConstraint("name", name="uq_categories_name"),
        schema=SCHEMA,
    )

    op.create_table(
        "directory_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("focus", sa.Text(), nullable=True),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("location", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("latitude", sa.Double(), nullable=True),
        sa.Column("longitude", sa.Double(), nullable=True),
        sa.Column("social_links", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("featured", sa.Boolean(), nullable=False, server_default=sa.text("false")),
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
        "directory_entry_categories",
        sa.Column(
            "directory_entry_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(f"{SCHEMA}.directory_entries.id", ondelete="CASCADE"),
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

    op.create_index(
        "ix_directory_entries_name_lower",
        "directory_entries",
        [sa.text("lower(name)")],
        unique=False,
        schema=SCHEMA,
    )
    op.create_index(
        "ix_directory_entries_instagram",
        "directory_entries",
        [sa.text("(social_links->>'instagram')")],
        unique=False,
        schema=SCHEMA,
        postgresql_using="btree",
    )

    categories_table = sa.table(
        "categories",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("slug", sa.String),
        sa.column("name", sa.String),
        schema=SCHEMA,
    )
    op.bulk_insert(
        categories_table,
        [{"id": uuid.uuid4(), "slug": slug, "name": name} for slug, name in SEED_CATEGORIES],
    )


def downgrade() -> None:
    op.drop_index("ix_directory_entries_instagram", table_name="directory_entries", schema=SCHEMA)
    op.drop_index("ix_directory_entries_name_lower", table_name="directory_entries", schema=SCHEMA)
    op.drop_table("directory_entry_categories", schema=SCHEMA)
    op.drop_table("directory_entries", schema=SCHEMA)
    op.drop_table("categories", schema=SCHEMA)
    op.execute(f"DROP SCHEMA IF EXISTS {SCHEMA} CASCADE")
