# DOGS Phase 1 — Development Plan

Living task list for building the DOGS API and shared schemas. Update checkboxes as work completes.

**Goal:** Shared data models + canonical DOG store. Sheet is editor; Postgres is structured copy. Apps untouched.

---

## Repo layout

```
DOGS/
├── DOGS_Architecture_Specification.md
├── DOGS_Dev_Plans_Index.md
├── DOGS_Phase1_Dev_Plan.md          ← this file
├── DOGS_Phase2_Dev_Plan.md
├── DOGS_Phase3_Dev_Plan.md
├── DOGS_Phase4_Dev_Plan.md
├── packages/
│   └── schemas/
│       ├── pyproject.toml
│       └── src/dogs_schemas/
│           ├── __init__.py
│           ├── categories.py        # CategorySlug enum
│           ├── location.py          # StructuredLocation, Coordinates, SocialLinks
│           ├── directory.py         # DirectoryEntry, create/update DTOs
│           ├── cleanup.py           # schema-only
│           └── trash_report.py      # schema-only
├── api/
│   ├── pyproject.toml
│   ├── Dockerfile
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── database.py
│       ├── models/
│       │   ├── category.py
│       │   └── directory_entry.py
│       ├── routes/
│       │   ├── health.py
│       │   ├── categories.py
│       │   ├── directory.py
│       │   └── admin.py
│       └── services/
│           ├── sheet_sync.py        # port from CAN
│           ├── geocoding.py         # port from CAN
│           └── images.py            # URL validation, base64 skip
└── scripts/
    └── import_csv.py                # local dev: import from exported CSV
```

---

## Milestone 1 — Schemas package

**Deliverable:** Installable `dogs-schemas` with all shared Pydantic models.

### Tasks

- [ ] Create `packages/schemas` with `pyproject.toml` (Python 3.11+)
- [ ] `CategorySlug` enum — 6 fixed values with slug + display name helpers
- [ ] `StructuredLocation` — city, state, zip_code, country
- [ ] `Coordinates` — latitude, longitude
- [ ] `SocialLinks` — website, instagram, tiktok, youtube, facebook, twitter
- [ ] `DirectoryEntry` — full read model
- [ ] `DirectoryEntryCreate`, `DirectoryEntryUpdate` — API input DTOs
- [ ] `Cleanup`, `TrashReport` — documented schema-only models
- [ ] Export public API from `dogs_schemas.__init__`

### Social links normalization

Strip `@` from handles. Reject strings that look like follower counts (`2.0K`, `11.5K`). Max length 200 chars per field.

---

## Milestone 2 — Database

**Deliverable:** `dogs` schema on existing Cloud SQL with migrations.

### Tasks

- [ ] Alembic setup with `version_table_schema = "dogs"`
- [ ] Migration: `CREATE SCHEMA IF NOT EXISTS dogs`
- [ ] Table `dogs.categories`
  - `id` UUID PK
  - `slug` TEXT UNIQUE NOT NULL
  - `name` TEXT UNIQUE NOT NULL
- [ ] Table `dogs.directory_entries`
  - `id` UUID PK DEFAULT gen_random_uuid()
  - `name` VARCHAR(255) NOT NULL
  - `focus` TEXT
  - `image_url` TEXT
  - `location` JSONB
  - `latitude` DOUBLE PRECISION
  - `longitude` DOUBLE PRECISION
  - `social_links` JSONB
  - `featured` BOOLEAN DEFAULT FALSE
  - `created_at`, `updated_at` TIMESTAMPTZ
- [ ] Table `dogs.directory_entry_categories`
  - `directory_entry_id` UUID FK → directory_entries ON DELETE CASCADE
  - `category_id` UUID FK → categories ON DELETE CASCADE
  - PRIMARY KEY (directory_entry_id, category_id)
- [ ] Seed migration: insert 6 categories
- [ ] SQLAlchemy models with `__table_args__ = {"schema": "dogs"}`
- [ ] Index on `LOWER(name)` for upsert lookups
- [ ] Index on `(social_links->>'instagram')` for upsert lookups (expression index)

### Environment variables

```
DATABASE_URL=postgresql+psycopg2://...
GOOGLE_SHEETS_SPREADSHEET_ID=1KVYFjM8E_c65hzia2LWgtwvO9UKeqUXJpsfhB2OeOAo
GOOGLE_SHEETS_SHEET_GID=1363212709
GOOGLE_MAPS_GEOCODING_API_KEY=...
GOOGLE_APPLICATION_CREDENTIALS=...   # optional; ADC on Cloud Run
```

---

## Milestone 3 — Core API

**Deliverable:** FastAPI app with CRUD and health endpoints.

### Tasks

- [ ] FastAPI app skeleton, CORS if needed
- [ ] `GET /health`
- [ ] `GET /categories`
- [ ] `GET /directory` — pagination (`limit`, `offset`), filter `?category=trash`
- [ ] `GET /directory/{id}` — 404 if missing
- [ ] `POST /directory` — validate with `DirectoryEntryCreate`, geocode, persist
- [ ] `PATCH /directory/{id}` — partial update, re-geocode if location changed
- [ ] `DELETE /directory/{id}`
- [ ] Response models from `dogs_schemas`
- [ ] OpenAPI docs at `/docs`

### Geocoding service

Port `collective_action_backend/app/services/geocoding_service.py`:

- Use `city`, `state`, `zip_code`, `country` only
- US zip: 5 digits → geocode as `"33401, US"`
- International: if zip looks like a city name (contains spaces, >10 chars), **ignore zip** and use city + country
- Do not store Kumu-style zip hacks; if sheet has `"Brixton, UK"` in zip column, treat as invalid zip and geocode from city/state/country

### Image service (MVP)

File: `app/services/images.py`

```python
def sanitize_image_url(raw: str | None) -> str | None:
    """
    - None/empty → None
    - data:image/... → None (log warning)
    - http(s) URL → optionally HEAD request; None if 4xx/5xx
    - else → store as-is (lenient) or None (strict) — pick strict for MVP
    """
```

Log skipped images in sync summary for manual Sheet cleanup.

---

## Milestone 4 — Sheet sync

**Deliverable:** Manual sync endpoint matching CAN behavior, adapted for DOGS.

### Tasks

- [ ] Port `directory_sheet_sync.py` from CAN backend
- [ ] Header mapping: columns A–P only (ignore Q+)
- [ ] Category resolution: map to seeded slugs; **error** on unknown category (no auto-create)
- [ ] Pipe-separated categories: `Trash|Fitness` → two junction rows
- [ ] Upsert: instagram handle → name match
- [ ] After upsert batch: geocode entries where lat/lng is null
- [ ] Run `sanitize_image_url` on Image column
- [ ] `POST /admin/sync-from-sheet` returns:

```json
{
  "created": 0,
  "updated": 72,
  "skipped": 0,
  "rows_seen": 72,
  "geocoded": 65,
  "geo_failed": 7,
  "images_skipped": 12,
  "errors": ["Row 5: unknown category 'Foo'", "..."]
}
```

- [ ] `scripts/import_csv.py` — same logic for local dev without Sheets API (uses exported CSV)

### Sheet column alias map

Reuse CAN's `_header_to_key` aliases. Ignore: instagram_followers, tiktok_followers, youtube_followers, Total, Connected To, Priority, Reached Out, Response, Last Verified, and duplicate trailing columns.

---

## Milestone 5 — Deploy

**Deliverable:** DOGS API on Cloud Run, connected to Cloud SQL.

### Tasks

- [ ] Dockerfile (multi-stage, uvicorn)
- [ ] Cloud Run service (cold start, min instances = 0)
- [ ] Cloud SQL connection (Auth Proxy or connector — match CAN pattern)
- [ ] Run Alembic migrations on deploy or via one-off job
- [ ] Service account: Sheets read-only + Geocoding API
- [ ] Initial sync: `POST /admin/sync-from-sheet`, verify ~72 rows
- [ ] Re-run sync: confirm 0 created, N updated, stable UUIDs

---

## Milestone 6 — Verification

### Manual test checklist

- [ ] All 6 categories returned from `GET /categories`
- [ ] `GET /directory` returns imported entries with UUIDs
- [ ] `GET /directory?category=trash` filters correctly
- [ ] Multi-category entry (e.g. ploggarun) shows both Trash and Fitness
- [ ] `POST /directory` creates entry with geocoded coordinates
- [ ] `PATCH /directory/{id}` updates focus, re-geocodes on location change
- [ ] `DELETE /directory/{id}` removes entry and category links
- [ ] Sync after Sheet edit updates row, preserves UUID
- [ ] Base64 image row → `image_url` null, listed in `images_skipped`
- [ ] International row (e.g. Brixton, UK) geocodes from city/country, not zip hack

### Data quality report (post first sync)

Generate once and save to `docs/sync_report.md` or log:

- Entries missing coordinates
- Entries missing image_url
- Entries with unknown/empty category
- Broken image URLs

---

## Future (Phase 2+) — tracked, not built now

### GCS image pipeline

```
On sync/import:
  1. If image_url is valid HTTPS → download to temp
  2. Upload to gs://dogs-assets/directory/{entry_id}.{ext}
  3. Store public URL (or signed URL pattern)
  4. If download fails → image_url = null, queue for manual fix
```

Requires: GCS bucket, IAM on Cloud Run SA, content-type detection, size limits.

### TypeScript types

Export OpenAPI from DOGS → `openapi-typescript` or hand-maintain matching types in Impetus/Frontline.

### App adoption

| App | Local entity | Maps to |
|-----|--------------|---------|
| CAN | `directory_of_good` | `DirectoryEntry` |
| Impetus | `Group` | `DirectoryEntry` (subset + moderation fields stay local) |
| Frontline | `groups` | `DirectoryEntry` (subset) |

No code changes until you choose to adopt schemas or pull from DOGS.

---

## Decisions log

| Date | Decision |
|------|----------|
| 2026-06-05 | Phase 1 = schemas + canonical DOG; no app sync |
| 2026-06-05 | Sheet columns A–P only; CRM columns ignored |
| 2026-06-05 | Fixed 6 categories; no auto-create on sync |
| 2026-06-05 | `dogs` schema on existing Cloud SQL; CAN migration deferred |
| 2026-06-05 | Manual sync via `POST /admin/sync-from-sheet` |
| 2026-06-05 | Full CRUD on `/directory` |
| 2026-06-05 | Geocode on ingest; proper location fields (no Kumu zip hack in DB) |
| 2026-06-05 | Social links: +facebook, +twitter from Impetus |
| 2026-06-05 | Images MVP: skip base64/broken; GCS upload in Phase 2 |

---

## Next action

Start **Milestone 1** (schemas package) and **Milestone 2** (Alembic + models) in parallel, then wire API and port sheet sync from CAN.

---

**Index:** [DOGS_Dev_Plans_Index.md](./DOGS_Dev_Plans_Index.md)  
**Next phase:** [DOGS_Phase2_Dev_Plan.md](./DOGS_Phase2_Dev_Plan.md)
