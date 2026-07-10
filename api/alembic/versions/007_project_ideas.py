"""Create project_ideas, idea_categories, idea_similar_apps tables and enable pg_trgm."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "007_project_ideas"
down_revision: Union[str, None] = "006_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = "dogs"


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    op.create_table(
        "project_ideas",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column(
            "submitter_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(f"{SCHEMA}.users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("edit_token", sa.String(64), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default=sa.text("'pending'")),
        sa.Column(
            "merged_into_project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(f"{SCHEMA}.projects.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("suggested_category", sa.String(255), nullable=True),
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
        "idea_categories",
        sa.Column(
            "idea_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(f"{SCHEMA}.project_ideas.id", ondelete="CASCADE"),
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
        "idea_similar_apps",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "idea_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(f"{SCHEMA}.project_ideas.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("name", sa.String(255), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "added_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(f"{SCHEMA}.users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        schema=SCHEMA,
    )

    op.create_index(
        "ix_idea_similar_apps_idea_id",
        "idea_similar_apps",
        ["idea_id"],
        unique=False,
        schema=SCHEMA,
    )

    # Trigram indexes for dedup search — both the new ideas table and the existing
    # projects table, since a submission can duplicate either.
    op.execute(
        f"CREATE INDEX ix_project_ideas_name_trgm ON {SCHEMA}.project_ideas "
        f"USING gin (name gin_trgm_ops)"
    )
    op.execute(
        f"CREATE INDEX ix_project_ideas_description_trgm ON {SCHEMA}.project_ideas "
        f"USING gin (description gin_trgm_ops)"
    )
    op.execute(
        f"CREATE INDEX ix_projects_name_trgm ON {SCHEMA}.projects "
        f"USING gin (name gin_trgm_ops)"
    )
    op.execute(
        f"CREATE INDEX ix_projects_description_trgm ON {SCHEMA}.projects "
        f"USING gin (description gin_trgm_ops)"
    )


def downgrade() -> None:
    op.execute(f"DROP INDEX IF EXISTS {SCHEMA}.ix_projects_description_trgm")
    op.execute(f"DROP INDEX IF EXISTS {SCHEMA}.ix_projects_name_trgm")
    op.execute(f"DROP INDEX IF EXISTS {SCHEMA}.ix_project_ideas_description_trgm")
    op.execute(f"DROP INDEX IF EXISTS {SCHEMA}.ix_project_ideas_name_trgm")
    op.drop_index("ix_idea_similar_apps_idea_id", table_name="idea_similar_apps", schema=SCHEMA)
    op.drop_table("idea_similar_apps", schema=SCHEMA)
    op.drop_table("idea_categories", schema=SCHEMA)
    op.drop_table("project_ideas", schema=SCHEMA)
