#!/usr/bin/env python3
"""Export the full DOGS OpenAPI spec (including schema-only shared models) to a JSON file."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1] / "api"
sys.path.insert(0, str(API_ROOT))

from app.openapi_extra import build_openapi_schema  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Export DOGS openapi.json")
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "openapi" / "dogs-api.json",
        help="Output path (default: openapi/dogs-api.json)",
    )
    args = parser.parse_args()

    spec = build_openapi_schema()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(spec, indent=2) + "\n", encoding="utf-8")
    schema_count = len(spec.get("components", {}).get("schemas", {}))
    print(f"Wrote {args.output} ({schema_count} schemas)")


if __name__ == "__main__":
    main()
