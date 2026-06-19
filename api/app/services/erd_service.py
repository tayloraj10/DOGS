"""Build a Mermaid ER diagram of the DOGS schema for downstream consumers.

Walks the SQLAlchemy models for table/column structure, and cross-references a
small manual registry below to annotate enum-backed columns and JSONB columns
with the Pydantic shape that actually constrains them at the API layer (the
database itself has no CHECK constraints or native enum/JSON-schema types, so
none of this is discoverable by introspecting the live database).
"""

from __future__ import annotations

from enum import EnumMeta
from types import UnionType
from typing import get_args, get_origin

from pydantic import BaseModel
from sqlalchemy import Table

import app.models  # noqa: F401  (registers all tables on Base.metadata)
from app.database import Base
from app.schemas.categories import CategorySlug
from app.schemas.cleanup import CleanupMetrics
from app.schemas.location import SocialLinks, StructuredLocation
from app.schemas.status import ActivityStatus
from app.schemas.trash_report import TrashReportSeverity

# (table_name, column_name) -> enum class
ENUM_COLUMNS: dict[tuple[str, str], EnumMeta] = {
    ("categories", "slug"): CategorySlug,
    ("trash_reports", "severity"): TrashReportSeverity,
    ("trash_reports", "status"): ActivityStatus,
    ("cleanups", "status"): ActivityStatus,
}

# (table_name, column_name) -> Pydantic model describing the JSONB shape
JSON_SCHEMA_COLUMNS: dict[tuple[str, str], type[BaseModel]] = {
    ("directory_entries", "location"): StructuredLocation,
    ("directory_entries", "social_links"): SocialLinks,
    ("trash_reports", "location"): StructuredLocation,
    ("cleanups", "location"): StructuredLocation,
    ("cleanups", "metrics"): CleanupMetrics,
}

# (table_name, column_name) -> plain description for JSONB columns that hold a
# simple list rather than a nested object (no Pydantic model to point at).
JSON_LIST_COLUMNS: dict[tuple[str, str], str] = {
    ("directory_entries", "user_ids"): "list of UUID",
    ("trash_reports", "image_urls"): "list of str (URLs)",
    ("cleanups", "photo_urls"): "list of str (URLs)",
    ("cleanups", "organizer_user_ids"): "list of UUID",
    ("cleanups", "rsvp_user_ids"): "list of UUID",
    ("cleanups", "attended_user_ids"): "list of UUID",
}

SQL_TYPE_LABELS = {
    "UUID": "uuid",
    "VARCHAR": "string",
    "TEXT": "text",
    # Every JSON column in this schema is migrated as Postgres JSONB, even
    # though some models declare the generic SQLAlchemy `JSON` type.
    "JSON": "jsonb",
    "DOUBLE": "double",
    "BOOLEAN": "boolean",
    "DATETIME": "timestamptz",
}


def sql_type_label(column) -> str:
    name = type(column.type).__name__.upper()
    for key, label in SQL_TYPE_LABELS.items():
        if key in name:
            return label
    return name.lower()


def field_type_label(annotation) -> str:
    origin = get_origin(annotation)
    if origin is UnionType:
        args = [a for a in get_args(annotation) if a is not type(None)]
        return field_type_label(args[0]) + "?" if args else "any"
    if origin in (list, set):
        (inner,) = get_args(annotation) or (object,)
        return f"list[{field_type_label(inner)}]"
    return getattr(annotation, "__name__", str(annotation))


def describe_model(model: type[BaseModel]) -> str:
    parts = [f"{name}: {field_type_label(f.annotation)}" for name, f in model.model_fields.items()]
    return f"{model.__name__} - " + ", ".join(parts)


def sanitize(comment: str) -> str:
    return comment.replace('"', "'")


def column_comment(table_name: str, column_name: str) -> str | None:
    if key := ENUM_COLUMNS.get((table_name, column_name)):
        values = " | ".join(member.value for member in key)
        return f"{key.__name__} enum - {values}"
    if model := JSON_SCHEMA_COLUMNS.get((table_name, column_name)):
        return describe_model(model)
    if plain := JSON_LIST_COLUMNS.get((table_name, column_name)):
        return plain
    return None


def render_table(table: Table) -> str:
    lines = [f"    {table.name.upper()} {{"]
    for column in table.columns:
        type_label = sql_type_label(column)
        markers = []
        if column.primary_key:
            markers.append("PK")
        if column.foreign_keys:
            markers.append("FK")
        marker_str = f" {','.join(markers)}" if markers else ""
        comment = column_comment(table.name, column.name)
        comment_str = f' "{sanitize(comment)}"' if comment else ""
        lines.append(f"        {type_label} {column.name}{marker_str}{comment_str}")
    lines.append("    }")
    return "\n".join(lines)


def render_relationships(tables: dict[str, Table]) -> list[str]:
    lines = []
    for table in tables.values():
        for fk in table.foreign_keys:
            parent = fk.column.table.name.upper()
            child = table.name.upper()
            lines.append(f"    {parent} ||--o{{ {child} : has")
    return lines


def generate_erd_diagram() -> str:
    tables = dict(Base.metadata.tables)
    output_lines = ["erDiagram"]
    for table in tables.values():
        output_lines.append(render_table(table))
        output_lines.append("")
    output_lines.extend(render_relationships(tables))
    return "\n".join(output_lines) + "\n"
