#!/usr/bin/env python3
"""Import Directory of Good rows from an exported CSV (local dev without Sheets API)."""

import argparse
import csv
import sys
from pathlib import Path

# Allow running from repo root: python scripts/import_csv.py
API_ROOT = Path(__file__).resolve().parents[1] / "api"
sys.path.insert(0, str(API_ROOT))
SCHEMA_ROOT = Path(__file__).resolve().parents[1] / "packages" / "schemas" / "src"
sys.path.insert(0, str(SCHEMA_ROOT))

from app.database import SessionLocal  # noqa: E402
from app.services.geocoding import geocode_location  # noqa: E402
from app.services.sheet_sync import sync_from_sheet_values  # noqa: E402
import asyncio  # noqa: E402


def read_csv_rows(path: Path) -> list[list[str]]:
    with path.open(encoding="utf-8", newline="") as f:
        reader = csv.reader(f)
        return [row for row in reader]


async def geocode_missing(db) -> tuple[int, int]:
    from app.models import DirectoryEntry

    geocoded = geo_failed = 0
    entries = (
        db.query(DirectoryEntry)
        .filter(DirectoryEntry.latitude.is_(None))
        .filter(DirectoryEntry.location.isnot(None))
        .all()
    )
    for entry in entries:
        coords = await geocode_location(entry.location)
        if coords:
            entry.latitude, entry.longitude = coords
            geocoded += 1
        else:
            geo_failed += 1
    db.commit()
    return geocoded, geo_failed


def main() -> None:
    parser = argparse.ArgumentParser(description="Import DOG entries from CSV export")
    parser.add_argument("csv_path", type=Path, help="Path to exported Google Sheet CSV")
    parser.add_argument("--geocode", action="store_true", help="Geocode entries after import")
    args = parser.parse_args()

    if not args.csv_path.is_file():
        print(f"File not found: {args.csv_path}", file=sys.stderr)
        sys.exit(1)

    values = read_csv_rows(args.csv_path)
    db = SessionLocal()
    try:
        result = sync_from_sheet_values(db, values)
        print(
            f"Import: created={result.created} updated={result.updated} "
            f"rows_seen={result.rows_seen} images_skipped={result.images_skipped}"
        )
        if result.errors:
            print("Errors:")
            for err in result.errors[:20]:
                print(f"  - {err}")
            if len(result.errors) > 20:
                print(f"  ... and {len(result.errors) - 20} more")

        if args.geocode:
            geocoded, geo_failed = asyncio.run(geocode_missing(db))
            print(f"Geocoding: geocoded={geocoded} geo_failed={geo_failed}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
