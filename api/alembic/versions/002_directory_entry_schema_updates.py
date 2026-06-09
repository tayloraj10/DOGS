"""Rename focus to description; add user_ids to directory_entries."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "002_directory_entry_schema_updates"
down_revision: Union[str, None] = "001_create_dogs_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = "dogs"


def upgrade() -> None:
    op.alter_column(
        "directory_entries",
        "focus",
        new_column_name="description",
        schema=SCHEMA,
    )
    op.add_column(
        "directory_entries",
        sa.Column("user_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        schema=SCHEMA,
    )


def downgrade() -> None:
    op.drop_column("directory_entries", "user_ids", schema=SCHEMA)
    op.alter_column(
        "directory_entries",
        "description",
        new_column_name="focus",
        schema=SCHEMA,
    )
