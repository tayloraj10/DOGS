"""Fetch Directory of Good rows from Google Sheets and upsert into DOGS.

Imports columns A–P only (through Country). Follower-count columns are ignored.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from typing import Any

from app.schemas import category_slug_from_label
from google.auth import default as google_auth_default
from google.auth.exceptions import DefaultCredentialsError
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from sqlalchemy.orm import Session

from app.models import Category, DirectoryEntry
from app.schemas.location import is_us_country, validate_us_state, validate_us_zip
from app.services.directory_service import find_existing_entry, set_entry_categories
from app.services.images import sanitize_image_url
from app.services.storage import is_hosted_image_url

SCOPES = ("https://www.googleapis.com/auth/spreadsheets.readonly",)

# Columns through P (Country) — ignore Q+ (CRM, review notes, duplicate headers)
_ALLOWED_HEADER_KEYS = frozenset(
    {
        "name",
        "focus",
        "instagram",
        "tiktok",
        "youtube",
        "website",
        "category",
        "image",
        "city",
        "state",
        "zip",
        "country",
    }
)


@dataclass
class SheetSyncResult:
    created: int
    updated: int
    skipped: int
    rows_seen: int
    images_skipped: int
    errors: list[str]


def _load_sheets_credentials(credentials_path: str | None):
    path = (credentials_path or "").strip()
    if path:
        if not os.path.isfile(path):
            raise FileNotFoundError(f"GOOGLE_APPLICATION_CREDENTIALS path does not exist: {path}")
        return service_account.Credentials.from_service_account_file(path, scopes=SCOPES)
    creds, _ = google_auth_default(scopes=SCOPES)
    return creds


def _normalize_header(cell: str) -> str:
    return cell.strip().lower().replace("_", " ")


def _header_to_key(header: str) -> str | None:
    h = _normalize_header(header)
    aliases = {
        "name": "name",
        "focus": "focus",
        "instagram": "instagram",
        "instagram followers": None,
        "ig followers": None,
        "tiktok": "tiktok",
        "tiktok followers": None,
        "youtube": "youtube",
        "youtube subscribers": None,
        "total": None,
        "website": "website",
        "category": "category",
        "image": "image",
        "city": "city",
        "state": "state",
        "zip": "zip",
        "zip code": "zip",
        "country": "country",
        "connected to": None,
        "priority": None,
        "reached out": None,
        "response": None,
        "last verified": None,
        "categories": None,
        "explanation": None,
    }
    key = aliases.get(h)
    if key and key in _ALLOWED_HEADER_KEYS:
        return key
    return None


def _follower_count_display(value: str) -> bool:
    s = value.strip()
    if not s:
        return False
    return bool(re.match(r"^[\d.,]+[KkMm]?$", s.replace(" ", "")))


def _clean_handle(value: str | None) -> str | None:
    if not value or not str(value).strip():
        return None
    s = str(value).strip().lstrip("@")
    if _follower_count_display(s):
        return None
    if len(s) > 200:
        return None
    return s


def _build_social_links(row: dict[str, str]) -> dict[str, str]:
    out: dict[str, str] = {}
    for field, key in [("instagram", "instagram"), ("tiktok", "tiktok"), ("youtube", "youtube")]:
        handle = _clean_handle(row.get(field))
        if handle:
            out[field] = handle
    web = row.get("website")
    if web and str(web).strip():
        out["website"] = str(web).strip()
    return out


def _build_location(
    row: dict[str, str], errors: list[str], row_num: int
) -> dict[str, str] | None:
    city = (row.get("city") or "").strip() or None
    state = (row.get("state") or "").strip() or None
    country = (row.get("country") or "").strip() or None
    zip_code = (row.get("zip") or "").strip() or None
    if is_us_country(country):
        if state:
            try:
                state = validate_us_state(state)
            except ValueError:
                errors.append(f"Row {row_num}: unrecognized state '{state}', left as-is")
        if zip_code:
            try:
                zip_code = validate_us_zip(zip_code)
            except ValueError:
                errors.append(f"Row {row_num}: invalid zip code '{zip_code}', left as-is")
    loc: dict[str, str] = {}
    if city:
        loc["city"] = city
    if state:
        loc["state"] = state
    if country:
        loc["country"] = country
    if zip_code:
        loc["zip_code"] = zip_code
    return loc or None


def _resolve_categories(
    category_cell: str | None,
    valid_slugs: set[str],
    errors: list[str],
    row_num: int,
) -> list[str]:
    if not category_cell or not category_cell.strip():
        return []
    parts = [p.strip() for p in category_cell.split("|") if p.strip()]
    slugs: list[str] = []
    for part in parts:
        slug = category_slug_from_label(part)
        if slug is None or slug not in valid_slugs:
            errors.append(f"Row {row_num}: unknown category '{part}'")
        else:
            slugs.append(slug)
    return slugs


def _parse_header_row(values: list[list[Any]]) -> tuple[dict[int, str], int] | tuple[None, int]:
    if not values:
        return None, 0
    for i, row in enumerate(values):
        col_map: dict[int, str] = {}
        for j, cell in enumerate(row):
            if cell is None:
                continue
            key = _header_to_key(str(cell))
            if key and key not in col_map.values():
                col_map[j] = key
        if "name" in col_map.values():
            return col_map, i
    return None, 0


def _row_to_dict(
    col_map: dict[int, str], row: list[Any], errors: list[str], row_num: int
) -> dict[str, str] | None:
    out: dict[str, str] = {}
    for j, key in col_map.items():
        if j < len(row) and row[j] is not None:
            out[key] = str(row[j]).strip()
        else:
            out[key] = ""
    name = out.get("name", "").strip()
    if not name:
        errors.append(f"Row {row_num}: empty name, skipped")
        return None
    return out


def fetch_sheet_values(
    spreadsheet_id: str,
    sheet_gid: int,
    credentials_path: str | None,
) -> list[list[Any]]:
    creds = _load_sheets_credentials(credentials_path)
    service = build("sheets", "v4", credentials=creds, cache_discovery=False)
    meta = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
    title: str | None = None
    for s in meta.get("sheets", []):
        props = s.get("properties", {})
        if props.get("sheetId") == sheet_gid:
            title = props.get("title")
            break
    if not title:
        raise ValueError(f"No sheet with gid={sheet_gid} in spreadsheet {spreadsheet_id}")

    safe_title = title.replace("'", "''")
    result = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=spreadsheet_id, range=f"'{safe_title}'")
        .execute()
    )
    return result.get("values", []) or []


def _apply_row_to_entry(
    db: Session,
    entry: DirectoryEntry,
    *,
    name: str,
    description: str | None,
    image_url: str | None,
    location: dict[str, str] | None,
    social: dict[str, str],
    categories: list[str],
    preserve_image: bool = False,
) -> None:
    entry.name = name[:255]
    entry.description = description
    # Don't let the sheet's Image column clobber a photo we've re-hosted ourselves
    # (see NeedsPhotoPage) or one that was deliberately cleared out — both are manual
    # curation decisions the sheet has no idea about. Only applies to existing entries;
    # brand-new entries have no curated state to protect.
    if not (preserve_image and (is_hosted_image_url(entry.image_url) or not entry.image_url)):
        entry.image_url = image_url
    entry.location = location
    entry.social_links = social or None
    if categories:
        from app.schemas import CategorySlug

        set_entry_categories(db, entry, [CategorySlug(s) for s in categories])
    else:
        entry.categories = []


def sync_from_sheet_values(db: Session, values: list[list[Any]]) -> SheetSyncResult:
    errors: list[str] = []
    col_map, header_idx = _parse_header_row(values)
    if not col_map:
        return SheetSyncResult(0, 0, 0, 0, 0, ["Could not find a header row with a Name column"])

    created = updated = skipped = rows_seen = images_skipped = 0
    slug_to_category = {c.slug: c for c in db.query(Category).all()}

    for offset, row in enumerate(values[header_idx + 1 :]):
        row_num = header_idx + 2 + offset
        parsed = _row_to_dict(col_map, row, errors, row_num)
        if not parsed:
            continue
        rows_seen += 1

        name = parsed["name"]
        social = _build_social_links(parsed)
        instagram = social.get("instagram")
        location = _build_location(parsed, errors, row_num)
        categories = _resolve_categories(parsed.get("category"), set(slug_to_category), errors, row_num)

        raw_image = (parsed.get("image") or "").strip() or None
        image_url, skip_reason = sanitize_image_url(raw_image)
        if skip_reason:
            images_skipped += 1

        description = (parsed.get("focus") or "").strip() or None
        entry = find_existing_entry(db, name, instagram)

        if entry is None:
            entry = DirectoryEntry(name=name[:255])
            db.add(entry)
            db.flush()
            _apply_row_to_entry(
                db,
                entry,
                name=name,
                description=description,
                image_url=image_url,
                location=location,
                social=social,
                categories=categories,
            )
            created += 1
        else:
            _apply_row_to_entry(
                db,
                entry,
                name=name,
                description=description,
                image_url=image_url,
                location=location,
                social=social,
                categories=categories,
                preserve_image=True,
            )
            updated += 1

        if categories and not all(s in slug_to_category for s in categories):
            slug_to_category = {c.slug: c for c in db.query(Category).all()}

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        return SheetSyncResult(0, 0, 0, rows_seen, images_skipped, [f"Database error: {e!s}"])

    return SheetSyncResult(
        created=created,
        updated=updated,
        skipped=skipped,
        rows_seen=rows_seen,
        images_skipped=images_skipped,
        errors=errors,
    )


def sync_from_google_sheet(
    db: Session,
    spreadsheet_id: str,
    sheet_gid: int,
    credentials_path: str | None,
) -> SheetSyncResult:
    try:
        values = fetch_sheet_values(spreadsheet_id, sheet_gid, credentials_path)
    except HttpError as e:
        return SheetSyncResult(0, 0, 0, 0, 0, [f"Google Sheets API error: {e!s}"])
    except DefaultCredentialsError as e:
        return SheetSyncResult(
            0, 0, 0, 0, 0, [f"No Google credentials (set GOOGLE_APPLICATION_CREDENTIALS or ADC): {e!s}"],
        )
    except OSError as e:
        return SheetSyncResult(0, 0, 0, 0, 0, [f"Credentials or IO error: {e!s}"])
    except ValueError as e:
        return SheetSyncResult(0, 0, 0, 0, 0, [str(e)])

    return sync_from_sheet_values(db, values)
