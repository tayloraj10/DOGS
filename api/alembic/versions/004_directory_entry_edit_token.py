"""Add edit_token column to directory_entries."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "004_directory_entry_edit_token"
down_revision: Union[str, None] = "003_suggested_category"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = "dogs"


def upgrade() -> None:
    op.add_column(
        "directory_entries",
        sa.Column("edit_token", sa.String(64), nullable=True),
        schema=SCHEMA,
    )


def downgrade() -> None:
    op.drop_column("directory_entries", "edit_token", schema=SCHEMA)
