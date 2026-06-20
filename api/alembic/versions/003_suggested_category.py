"""Add suggested_category column to directory_entries."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003_suggested_category"
down_revision: Union[str, None] = "002_directory_entry_status"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = "dogs"


def upgrade() -> None:
    op.add_column(
        "directory_entries",
        sa.Column("suggested_category", sa.String(255), nullable=True),
        schema=SCHEMA,
    )


def downgrade() -> None:
    op.drop_column("directory_entries", "suggested_category", schema=SCHEMA)
