"""Add claimed_by_user_id and claimed_at to project_ideas, for the self-service claim flow."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "009_idea_claim"
down_revision: Union[str, None] = "008_project_members"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = "dogs"


def upgrade() -> None:
    op.add_column(
        "project_ideas",
        sa.Column(
            "claimed_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(f"{SCHEMA}.users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        schema=SCHEMA,
    )
    op.add_column(
        "project_ideas",
        sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=True),
        schema=SCHEMA,
    )


def downgrade() -> None:
    op.drop_column("project_ideas", "claimed_at", schema=SCHEMA)
    op.drop_column("project_ideas", "claimed_by_user_id", schema=SCHEMA)
