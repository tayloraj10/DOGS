"""Merge schema-only Pydantic models into the FastAPI OpenAPI document."""

from __future__ import annotations

from typing import Any

from app.schemas import (
    ActivityStatus,
    Cleanup,
    CleanupMetrics,
    TrashReport,
    TrashReportSeverity,
)
from fastapi.openapi.utils import get_openapi

REF_TEMPLATE = "#/components/schemas/{model}"

# Models with no API routes today; still part of the shared contract.
SCHEMA_ONLY_MODELS: tuple[type, ...] = (
    ActivityStatus,
    TrashReportSeverity,
    CleanupMetrics,
    Cleanup,
    TrashReport,
)


def _enum_json_schema(enum_cls: type) -> dict[str, Any]:
    return {
        "type": "string",
        "enum": [member.value for member in enum_cls],
        "title": enum_cls.__name__,
    }


def merge_schema_only_models(openapi_schema: dict[str, Any]) -> dict[str, Any]:
    """Add shared schema-only models to components.schemas (idempotent)."""
    components = openapi_schema.setdefault("components", {})
    schemas: dict[str, Any] = components.setdefault("schemas", {})

    for model in SCHEMA_ONLY_MODELS:
        if hasattr(model, "model_json_schema"):
            json_schema = model.model_json_schema(ref_template=REF_TEMPLATE)
            defs = json_schema.pop("$defs", {})
            title = json_schema.pop("title", model.__name__)
            schemas.setdefault(title, json_schema)
            for def_name, def_schema in defs.items():
                schemas.setdefault(def_name, def_schema)
        else:
            # StrEnum and similar
            schemas.setdefault(model.__name__, _enum_json_schema(model))

    return openapi_schema


def build_openapi_schema() -> dict[str, Any]:
    from app.main import app

    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    return merge_schema_only_models(schema)
