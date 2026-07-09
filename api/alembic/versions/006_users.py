"""Create users table."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "006_users"
down_revision: Union[str, None] = "005_projects"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = "dogs"


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("firebase_uid", sa.String(128), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=True),
        sa.Column("photo_url", sa.Text(), nullable=True),
        sa.Column("admin", sa.Boolean(), nullable=False, server_default=sa.text("false")),
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
    op.create_index("ix_users_firebase_uid", "users", ["firebase_uid"], unique=True, schema=SCHEMA)
    op.create_index("ix_users_email", "users", ["email"], unique=True, schema=SCHEMA)


def downgrade() -> None:
    op.drop_index("ix_users_email", table_name="users", schema=SCHEMA)
    op.drop_index("ix_users_firebase_uid", table_name="users", schema=SCHEMA)
    op.drop_table("users", schema=SCHEMA)
