# DOGS Architecture Specification

## DOGS

**Data Organization for Good and Sharing**

DOGS is a shared data platform for the social-good ecosystem. It provides **shared data models** and a **canonical store** for cross-app datasets, starting with the Directory of Good (DOG).

Connected applications (each with its own database):

- **Collective Action Network (CAN)** — FastAPI + PostgreSQL on Cloud Run
- **Impetus** — Firebase Firestore
- **Frontline** — Supabase + PostgreSQL

---

## Phase 1 Principle

DOGS is **not a synchronization platform** in Phase 1.

Phase 1 delivers:

1. **Shared Pydantic schemas** — a package all apps can adopt so data is stored in the same shape
2. **Canonical DOG store** — Google Sheet remains the editor; DOGS Postgres is the structured copy with stable UUIDs
3. **Read/write API** — CRUD for directory entries plus manual sheet sync

Apps keep their own databases. They do **not** read from or write to DOGS in Phase 1. Optional periodic aggregation or app integration can come later without redesign.

There is **no outbound sync** and **no cross-app identity resolution** in Phase 1.

---

## MVP Technical Constraints

Do **not** introduce until explicitly needed:

- Kafka, Pub/Sub, RabbitMQ
- Event sourcing, CQRS
- Distributed transactions, service meshes
- Multi-region replication

**Stack:**

| Layer | Choice |
|-------|--------|
| API | FastAPI |
| Validation | Pydantic (`dogs-schemas` package) |
| ORM | SQLAlchemy |
| Migrations | Alembic |
| Database | PostgreSQL (existing GCP Cloud SQL instance) |
| Hosting | Cloud Run (cold start, separate service from CAN) |

**Database layout:** Same Cloud SQL instance as CAN. DOGS tables live in the `dogs` schema. CAN may move to a `can` schema later; that is out of scope for DOGS Phase 1.

---

## Architecture

```
Google Sheet (editor, source of truth for DOG)
        │
        │  POST /admin/sync-from-sheet  (manual trigger)
        ▼
┌─────────────────────────────────────┐
│  DOGS API (Cloud Run, cold start)   │
│  - CRUD /directory                  │
│  - Sheet sync + geocode on ingest   │
│  - Image URL validation (MVP)       │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│  Cloud SQL — dogs schema            │
│  categories                         │
│  directory_entries                  │
│  directory_entry_categories         │
└─────────────────────────────────────┘

dogs-schemas (Python package)
        │
        └──► CAN / Impetus / Frontline adopt over time
```

---

## Directory of Good (DOG)

### Source of truth

- **Now:** Google Sheet ([Interesting People Network tab](https://docs.google.com/spreadsheets/d/1KVYFjM8E_c65hzia2LWgtwvO9UKeqUXJpsfhB2OeOAo/edit?gid=1363212709))
- **Future:** DOGS Admin Portal replaces Sheet as editor

### Sheet import scope (columns A–P)

| Column | Field |
|--------|-------|
| Name | `name` |
| Focus | `focus` |
| Instagram | `social_links.instagram` |
| TikTok | `social_links.tiktok` |
| YouTube | `social_links.youtube` |
| Website | `social_links.website` |
| Category | categories (pipe-separated, e.g. `Trash\|Fitness`) |
| Image | `image_url` |
| City | `location.city` |
| State | `location.state` |
| Zip Code | `location.zip_code` |
| Country | `location.country` |

Columns after **Country** (CRM, outreach, review notes) are **ignored** in Phase 1.

Follower-count columns (D, F, H, I) are never stored.

### Upsert strategy

Match existing rows by **Instagram handle** first, then **case-insensitive name**. Assign a UUID on first import; preserve it on re-sync.

### Location and geocoding

Store structured location as-is (`city`, `state`, `zip_code`, `country`). Do not replicate Kumu workarounds (e.g. putting `"City, Country"` in the zip column for international rows). Geocoding uses proper fields only.

On ingest (sync and create/update), geocode when coordinates are missing:

1. US 5-digit zip + country
2. Short international postcode + country
3. City + state + country

Uses Google Maps Geocoding API (same approach as CAN backend).

### Images

Many sheet image URLs are broken, expired, or inline base64. Phase 1 behavior:

- **Skip** `data:` URIs — set `image_url = null`, log warning
- **Optional HEAD check** — reject obvious 404s; store valid HTTPS URLs
- **Phase 2** — upload images to GCS during sync; store stable public URLs

---

## Shared Domain Models

### Category

Fixed taxonomy (non-hierarchical). Seeded in DB; not auto-created on sync.

| Slug | Name |
|------|------|
| `animals` | Animals |
| `environment` | Environment |
| `fitness` | Fitness |
| `nature` | Nature |
| `trash` | Trash |
| `water` | Water |

Many-to-many with directory entries.

### DirectoryEntry

Primary DOG entity. Apps decide how to use this data locally; DOGS does not model Group vs Organization.

```
DirectoryEntry
  id: UUID
  name: str
  focus: str | null
  image_url: str | null
  location: StructuredLocation | null
  coordinates: { latitude, longitude } | null   # geocoded
  social_links: SocialLinks | null
  category_slugs: list[CategorySlug]             # many-to-many
  featured: bool                                 # default false; not in sheet today
  created_at, updated_at
```

**StructuredLocation**

```
city, state, zip_code, country  (all optional strings)
```

**SocialLinks** (union of CAN + Impetus group models)

```
website, instagram, tiktok, youtube, facebook, twitter
```

Handles stored without `@` prefix. Follower counts not stored.

### Cleanup (schema only — no DB table in Phase 1)

Shared contract derived from CAN, Frontline, and Impetus. For future use when apps aggregate data.

```
Cleanup
  id: UUID
  title: str
  description: str | null
  location_text: str | null
  coordinates: Coordinates | null
  scheduled_start: datetime | null
  scheduled_end: datetime | null
  status: str | null
  photo_urls: list[str]
  metrics: { small_bags, large_bags, pounds, value } | null
```

### TrashReport (schema only — no DB table in Phase 1)

```
TrashReport
  id: UUID
  location_text: str | null
  coordinates: Coordinates | null
  photo_urls: list[str]
  severity: "low" | "medium" | "high" | null
  status: str | null
  description: str | null
```

---

## API (Phase 1)

Base path: `/api/v1` (or root — TBD at implementation)

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Cloud Run health check |

### Categories

| Method | Path | Description |
|--------|------|-------------|
| GET | `/categories` | List all 6 categories |

### Directory (CRUD)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/directory` | List entries (pagination, filter by category) |
| GET | `/directory/{id}` | Get one entry |
| POST | `/directory` | Create entry (geocode if location present) |
| PATCH | `/directory/{id}` | Partial update (re-geocode if location changed) |
| DELETE | `/directory/{id}` | Delete entry |

### Admin

| Method | Path | Description |
|--------|------|-------------|
| POST | `/admin/sync-from-sheet` | Pull Sheet → upsert DB → geocode → return sync summary |

Auth deferred. Protect admin/sync endpoint when added.

---

## Phase 1 Data Flow

**Sheet sync (primary DOG workflow):**

1. Edit Google Sheet
2. Call `POST /admin/sync-from-sheet`
3. DOGS fetches sheet, upserts `directory_entries`, resolves categories
4. Geocode entries missing coordinates
5. Validate/sanitize image URLs
6. Return `{ created, updated, skipped, geocoded, errors }`

**Manual CRUD:** Create/update/delete via API; sheet is not updated in reverse (sheet remains editor until Admin Portal exists).

**Apps:** Unchanged. Local DBs only. Adopt `dogs-schemas` when ready.

---

## Out of Scope (Phase 1)

- App writes or reads against DOGS
- Cross-app identity / deduplication
- Outbound sync to app databases
- Campaign, Challenge, Resource entities
- Visibility rules per app
- CRM / outreach sheet columns
- DOGS Admin Portal
- GCS image upload (planned Phase 2)
- CAN schema migration (`public` → `can`)

---

## Roadmap

### Phase 1 (current)

- [ ] `dogs-schemas` package (DirectoryEntry, Category, Cleanup, TrashReport)
- [ ] DOGS API + `dogs` schema on Cloud SQL
- [ ] Alembic migrations, seed categories
- [ ] Sheet sync (columns A–P) + geocoding
- [ ] Image URL sanitization (skip base64)
- [ ] CRUD + sync endpoints
- [ ] Deploy to Cloud Run

### Phase 2

- GCS image pipeline (download/upload on sync, stable URLs)
- OpenAPI → TypeScript types for Impetus / Frontline
- Optional: apps begin adopting shared schemas locally

### Phase 3

- DOGS Admin Portal (replace Google Sheet)
- Periodic pull from app DBs into DOGS (if desired)

### Phase 4

- Stats and map APIs (GeoJSON, CSV)
- Optional analytics dashboard
- Ingest API (`/ingest/cleanup`, `/ingest/trash-report`) — required for Phase 5
- Optional: identity resolution, visibility rules
- Pilot read integration (one app) optional

### Phase 5

- Wire CAN, Impetus, and Frontline to DOGS API
- Directory reads from DOGS in all apps
- Async cleanup/trash ingest from all apps
- Remove CAN sheet sync and duplicate DOG paths
- Shared `DogsClient` SDK (Python + TypeScript)

---

## Success Criteria (Phase 1)

- Shared Pydantic models published as `dogs-schemas`
- ~72 DOG rows imported from Sheet with stable UUIDs
- Re-sync is idempotent (no duplicate entries)
- Geocoding populates coordinates for most US entries
- CRUD API works for directory entries
- Apps remain independent; no coupling required yet
- Foundation supports future app integration without redesign

---

## Reference

- **Sheet:** `1KVYFjM8E_c65hzia2LWgtwvO9UKeqUXJpsfhB2OeOAo` (gid `1363212709`)
- **CAN DOG model:** `collective_action_backend/app/models/directory_of_good.py`
- **CAN sheet sync:** `collective_action_backend/app/services/directory_sheet_sync.py`
- **CAN geocoding:** `collective_action_backend/app/services/geocoding_service.py`
- **Impetus Group links:** `impetus/src/types/index.ts` (`facebook`, `twitter` added to shared SocialLinks)

**Development plans:**

- [DOGS_Dev_Plans_Index.md](./DOGS_Dev_Plans_Index.md) — overview and phase dependencies
- [DOGS_Phase1_Dev_Plan.md](./DOGS_Phase1_Dev_Plan.md) — schemas, API, sheet sync
- [DOGS_Phase2_Dev_Plan.md](./DOGS_Phase2_Dev_Plan.md) — GCS images, TS types, app adoption
- [DOGS_Phase3_Dev_Plan.md](./DOGS_Phase3_Dev_Plan.md) — Admin Portal, aggregation
- [DOGS_Phase4_Dev_Plan.md](./DOGS_Phase4_Dev_Plan.md) — analytics, ingest API
- [DOGS_Phase5_Dev_Plan.md](./DOGS_Phase5_Dev_Plan.md) — CAN, Impetus, Frontline integration
