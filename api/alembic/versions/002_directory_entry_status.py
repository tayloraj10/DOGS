"""Add status column to directory_entries."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002_directory_entry_status"
down_revision: Union[str, None] = "001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = "dogs"


def upgrade() -> None:
    op.add_column(
        "directory_entries",
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'published'"),
        ),
        schema=SCHEMA,
    )
    op.create_index(
        "ix_directory_entries_status",
        "directory_entries",
        ["status"],
        unique=False,
        schema=SCHEMA,
    )


def downgrade() -> None:
    op.drop_index("ix_directory_entries_status", table_name="directory_entries", schema=SCHEMA)
    op.drop_column("directory_entries", "status", schema=SCHEMA)
