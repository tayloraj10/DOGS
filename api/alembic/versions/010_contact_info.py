"""Add user contact fields (phone, social_links), replace project_members role/contact_info
with structured shared_fields, and add projects.originator_user_id."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "010_contact_info"
down_revision: Union[str, None] = "009_idea_claim"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = "dogs"


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("phone", sa.String(length=32), nullable=True),
        schema=SCHEMA,
    )
    op.add_column(
        "users",
        sa.Column("social_links", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        schema=SCHEMA,
    )

    op.add_column(
        "project_members",
        sa.Column(
            "shared_fields",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'"),
        ),
        schema=SCHEMA,
    )
    op.drop_column("project_members", "role", schema=SCHEMA)
    op.drop_column("project_members", "contact_info", schema=SCHEMA)

    op.add_column(
        "projects",
        sa.Column(
            "originator_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(f"{SCHEMA}.users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        schema=SCHEMA,
    )


def downgrade() -> None:
    op.drop_column("projects", "originator_user_id", schema=SCHEMA)

    op.add_column(
        "project_members",
        sa.Column("contact_info", sa.Text(), nullable=True),
        schema=SCHEMA,
    )
    op.add_column(
        "project_members",
        sa.Column("role", sa.String(20), nullable=False, server_default=sa.text("'member'")),
        schema=SCHEMA,
    )
    op.drop_column("project_members", "shared_fields", schema=SCHEMA)

    op.drop_column("users", "social_links", schema=SCHEMA)
    op.drop_column("users", "phone", schema=SCHEMA)
