# DOGS Phase 2 — Development Plan

**Prerequisites:** Phase 1 complete — DOGS API deployed, ~72 DOG entries synced, `dogs-schemas` package published, CRUD + sheet sync working.

**Goal:** Harden DOG data quality (images), distribute shared schemas to all apps, and begin local adoption in each codebase without coupling apps to the DOGS API yet.

---

## Phase 2 outcomes

- Directory entry images stored in GCS with stable URLs
- TypeScript types generated from DOGS OpenAPI for Impetus and Frontline
- Each app can optionally align local models with `dogs-schemas`
- Basic API auth on admin/sync endpoints
- CAN database moved to `can` schema (independent of DOGS, but planned here)

---

## Milestone 1 — GCS image pipeline

**Deliverable:** Sync and CRUD flows upload images to Cloud Storage; broken/base64 sheet URLs are replaced or cleared.

### Infrastructure

- [ ] Create GCS bucket (e.g. `gs://{project}-dogs-assets`)
- [ ] Folder layout: `directory/{entry_id}/{filename}.{ext}`
- [ ] Bucket IAM: Cloud Run service account → `storage.objectAdmin` on bucket
- [ ] Optional: Cloud CDN or public read on `directory/*` prefix
- [ ] Env vars: `DOGS_GCS_BUCKET`, `DOGS_GCS_PUBLIC_BASE_URL`

### Image service (`app/services/image_storage.py`)

- [ ] `download_image(url) → bytes | None` — httpx with timeout, size cap (e.g. 5 MB)
- [ ] Reject/skip: `data:` URIs, empty URLs, non-http schemes
- [ ] Detect content-type from response headers or magic bytes
- [ ] `upload_to_gcs(entry_id, bytes, content_type) → public_url`
- [ ] `process_image_url(entry_id, raw_url) → str | None` — orchestrates download + upload
- [ ] On failure: log warning, set `image_url = null`, include in sync report

### Integration points

- [ ] Sheet sync: run `process_image_url` for each row's Image column
- [ ] `POST /directory`: if `image_url` is external HTTPS, optionally mirror to GCS
- [ ] `PATCH /directory/{id}`: re-process when `image_url` changes
- [ ] Migration script: backfill existing entries with broken/null images from sheet re-sync

### Admin tooling

- [ ] `POST /admin/reprocess-images` — re-download/upload for all entries (or `?missing_only=true`)
- [ ] Sync summary fields: `images_uploaded`, `images_failed`, `images_skipped`

### Verification

- [ ] Entry with valid HTTPS image → GCS URL stored
- [ ] Entry with base64 image → skipped, logged
- [ ] Entry with 404 URL → null, logged
- [ ] Re-sync does not re-upload if GCS URL already set (unless `force=true`)

---

## Milestone 2 — API auth

**Deliverable:** Protect write/admin endpoints before broader exposure.

### Tasks

- [ ] Choose auth mechanism: API key header (`X-API-Key`) for MVP
- [ ] Store key(s) in Secret Manager; inject into Cloud Run
- [ ] Middleware or dependency: require key on `POST/PATCH/DELETE /directory`, all `/admin/*`
- [ ] `GET` endpoints remain public (or add optional auth later)
- [ ] Document auth in OpenAPI

### Future (not Phase 2)

- Firebase auth for Admin Portal (Phase 3)
- Per-app service accounts (Phase 4)

---

## Milestone 3 — TypeScript schema distribution

**Deliverable:** Generated TS types matching `dogs-schemas` for frontend apps.

### Package layout

```
packages/
├── schemas/          # Python (existing)
└── schemas-ts/       # TypeScript (new)
    ├── package.json
    ├── src/
    │   ├── directory.ts
    │   ├── categories.ts
    │   ├── location.ts
    │   ├── cleanup.ts
    │   └── trash_report.ts
    └── scripts/
        └── generate-from-openapi.ts
```

### Tasks

- [ ] Export OpenAPI 3.1 from DOGS FastAPI (`/openapi.json`)
- [ ] Add `openapi-typescript` (or `orval`) codegen script
- [ ] Hand-maintain or generate: `DirectoryEntry`, `Category`, `StructuredLocation`, `SocialLinks`, `Coordinates`
- [ ] Publish as `@dogs/schemas` (npm private or copy into app repos)
- [ ] Version alignment: tag Python + TS packages together (e.g. `v0.2.0`)

### App integration (types only — no API calls yet)

- [ ] **Impetus:** Replace or extend `Group` location/links types with shared imports where compatible
- [ ] **Frontline:** Add shared types alongside `database.ts` generated Supabase types
- [ ] **CAN frontend:** Align directory display types with `DirectoryEntry`

---

## Milestone 4 — App schema adoption (local only)

**Deliverable:** Each app stores data in the shared shape locally. No DOGS API read/write yet.

### CAN backend

- [ ] Add `dogs-schemas` as dependency
- [ ] Refactor `DirectoryOfGoodCreate/Schema` to compose from or match `DirectoryEntry`
- [ ] Keep CAN-specific fields local: `user_id`, `featured`, `Action` linkage
- [ ] Optional: migrate `category_ids` JSON array → validate against `CategorySlug` list
- [ ] Move CAN tables to `can` schema (Alembic migration, update `search_path`)

### Impetus

- [ ] Map `Group` fields to `DirectoryEntry` subset in a adapter module
- [ ] Document which fields stay Impetus-only: `topicId`, `moderationStatus`, `likes`, `flags`
- [ ] Align `links` with shared `SocialLinks`

### Frontline

- [ ] Add category support to `groups` if desired (new migration)
- [ ] Map `groups` to `DirectoryEntry` subset
- [ ] Document Frontline-only fields: `slug`, `verified`, `group_members`

### Shared mapping doc

Create `docs/app_field_mapping.md`:

| DirectoryEntry field | CAN | Impetus | Frontline |
|---------------------|-----|---------|-----------|
| `name` | ✓ | `name` | `name` |
| `focus` | ✓ | `description` | `description` |
| `social_links` | ✓ | `links` | `website` only today |
| … | | | |

---

## Milestone 5 — Cleanup & TrashReport schema refinement

**Deliverable:** Schemas validated against real app data; still no DOGS DB tables.

### Tasks

- [ ] Audit CAN `CleanupEventData`, `TrashReportEventData`
- [ ] Audit Frontline `contributions`, `problem_reports`
- [ ] Document Impetus gaps (no trash report entity)
- [ ] Update `dogs_schemas/cleanup.py` and `trash_report.py` with final field list
- [ ] Add JSON Schema export from Pydantic for non-Python consumers
- [ ] Optional: example payloads in `docs/examples/`

---

## Milestone 6 — Observability & ops

- [ ] Structured logging (JSON) on Cloud Run
- [ ] Log sync duration, row counts, geocode/image stats
- [ ] Error alerting on sync failure (email or Cloud Monitoring)
- [ ] README: runbook for manual sync, image reprocess, migration

---

## Environment variables (new in Phase 2)

```
DOGS_GCS_BUCKET=...
DOGS_GCS_PUBLIC_BASE_URL=https://storage.googleapis.com/...  # or CDN URL
DOGS_API_KEY=...                                               # Secret Manager
```

---

## Success criteria

- [ ] ≥90% of DOG entries have valid GCS `image_url` (or explicitly null with reason logged)
- [ ] TS types published and imported in at least one app repo
- [ ] Python `dogs-schemas` used in CAN backend for DOG validation
- [ ] Admin/sync endpoints require API key
- [ ] No app depends on DOGS API for runtime (local DBs still authoritative for apps)

---

## Out of scope (Phase 2)

- DOGS Admin Portal
- App reads/writes to DOGS API
- Periodic aggregation from app DBs
- New entity DB tables (cleanups, trash reports)
- Cross-app identity

---

## Decisions log

| Date | Decision |
|------|----------|
| TBD | GCS bucket naming and public vs signed URLs |
| TBD | npm package vs copy-paste TS types into app repos |
| TBD | CAN `can` schema migration timing within Phase 2 |

---

**Previous:** [DOGS_Phase1_Dev_Plan.md](./DOGS_Phase1_Dev_Plan.md)  
**Next:** [DOGS_Phase3_Dev_Plan.md](./DOGS_Phase3_Dev_Plan.md)
