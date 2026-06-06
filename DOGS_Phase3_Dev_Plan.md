# DOGS Phase 3 — Development Plan

**Prerequisites:** Phase 2 complete — GCS images working, shared schemas adopted locally in apps, API auth on write endpoints.

**Goal:** Replace Google Sheet as the DOG editor with a DOGS Admin Portal, and optionally begin pulling shared data from app databases into DOGS on a schedule (aggregation, not live sync).

---

## Phase 3 outcomes

- Admin UI for Directory of Good CRUD (no more Sheet editing required)
- Sheet sync deprecated or kept as one-way import for migration only
- Optional scheduled jobs pull cleanups/trash reports from CAN and Frontline into DOGS
- DOGS DB tables for `cleanups` and `trash_reports` (if aggregation is enabled)
- Export endpoints for Kumu and other visualization tools

---

## Milestone 1 — Admin Portal (frontend)

**Deliverable:** Web app for managing DOG entries against the DOGS API.

### Tech stack (recommended)

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | React + Vite (or Next.js) | Matches Impetus/Frontline |
| Auth | Firebase Auth | Consistent with CAN/Impetus |
| API client | Generated from OpenAPI | Stays in sync with DOGS API |
| Hosting | Cloud Run or Firebase Hosting | GCP ecosystem |

### Repo layout

```
DOGS/
├── admin/                    # new
│   ├── package.json
│   ├── src/
│   │   ├── pages/
│   │   │   ├── DirectoryList.tsx
│   │   │   ├── DirectoryEdit.tsx
│   │   │   └── DirectoryCreate.tsx
│   │   ├── components/
│   │   │   ├── CategoryPicker.tsx
│   │   │   ├── LocationForm.tsx
│   │   │   ├── SocialLinksForm.tsx
│   │   │   └── ImageUpload.tsx
│   │   └── services/
│   │       └── dogsApi.ts
│   └── Dockerfile
```

### Features

- [ ] Login (Firebase — admin allowlist via env or Firestore `admins` collection)
- [ ] List directory entries — search, filter by category, pagination
- [ ] Create entry — all DirectoryEntry fields, multi-category picker
- [ ] Edit entry — inline or dedicated form
- [ ] Delete entry — with confirmation
- [ ] Image upload — direct to GCS via signed URL or through DOGS API
- [ ] Map preview — show geocoded pin on edit form
- [ ] Featured toggle (CAN uses this today)

### API additions (backend)

- [ ] `POST /directory/{id}/image` — multipart upload → GCS → update `image_url`
- [ ] Firebase token validation middleware (replace or supplement API key for admin routes)
- [ ] `GET /admin/me` — verify admin role

### UX notes

- Category picker: 6 checkboxes (many-to-many)
- Location form: city, state, zip, country — no Kumu zip hack in UI
- Social links: all 6 platforms with handle normalization preview
- Show `created_at` / `updated_at`; read-only UUID display

---

## Milestone 2 — Deprecate Google Sheet

**Deliverable:** Sheet is no longer the editor; one-time migration path documented.

### Tasks

- [ ] Final sheet sync; diff against Admin Portal data
- [ ] Mark `POST /admin/sync-from-sheet` as deprecated in OpenAPI
- [ ] Add `POST /admin/import-from-sheet` — one-time or explicit overwrite mode only
- [ ] Document: "Edit DOG at {admin URL}" in Sheet header row (optional)
- [ ] Export script: `GET /directory?limit=1000` → CSV for Kumu backup

### Kumu export format

- [ ] `GET /admin/export/kumu` — CSV or JSON with fields Kumu expects
- [ ] Optional: support Kumu zip workaround in **export only** (not in DB)
- [ ] Document export refresh workflow for visualization

---

## Milestone 3 — Cleanups & trash reports in DOGS DB

**Deliverable:** DOGS stores aggregated cleanup and trash report data from apps (read-only copies).

### Database migrations

- [ ] `dogs.cleanups`
  - `id` UUID PK
  - `source_app` TEXT — `can` | `frontline`
  - `source_id` TEXT — app's local ID (opaque, no cross-app linking)
  - `payload` JSONB — full normalized Cleanup schema
  - `latitude`, `longitude`
  - `occurred_at` TIMESTAMPTZ
  - `ingested_at` TIMESTAMPTZ
  - UNIQUE (`source_app`, `source_id`)

- [ ] `dogs.trash_reports`
  - Same pattern with TrashReport schema

### API (read-only for now)

- [ ] `GET /cleanups` — filter by source_app, date range, bbox
- [ ] `GET /cleanups/{id}`
- [ ] `GET /trash-reports` — same
- [ ] `GET /trash-reports/{id}`

No POST from apps yet — ingestion via pull jobs only.

---

## Milestone 4 — Periodic aggregation jobs

**Deliverable:** Scheduled pull from app DBs into DOGS. Apps unchanged; jobs run on a schedule.

### Architecture

```
Cloud Scheduler (e.g. daily 2am)
        │
        ▼
Cloud Run Job / DOGS admin endpoint
        │
        ├──► CAN Postgres (can schema) — query actions / event_data
        ├──► Frontline Supabase — query contributions, problem_reports
        └──► Upsert into dogs.cleanups / dogs.trash_reports
```

### CAN pull adapter

- [ ] Query `actions` where `action_type = 'Map Submission'` and `event_data.type` in (`Cleanup`, `Trash Report`)
- [ ] Map to `Cleanup` / `TrashReport` pydantic models
- [ ] Upsert by (`source_app='can'`, `source_id=action.id`)

### Frontline pull adapter

- [ ] Query `contributions` where `contribution_type = 'cleanup'`
- [ ] Query `problem_reports`
- [ ] Map PostGIS points to `Coordinates`
- [ ] Upsert by (`source_app='frontline'`, `source_id`)

### Impetus

- [ ] Phase 3 optional — no trash report entity; map `ImpetusEvent` (trash-cleanup topic) to Cleanup if desired
- [ ] Document as Phase 3 stretch or Phase 4

### Job endpoint

- [ ] `POST /admin/aggregate` — manual trigger (API key / admin auth)
- [ ] Returns `{ cleanups_upserted, trash_reports_upserted, errors }`
- [ ] Cloud Scheduler HTTP target with auth header

### Config

```
CAN_DATABASE_URL=...          # read-only connection
FRONTLINE_SUPABASE_URL=...
FRONTLINE_SUPABASE_KEY=...    # read-only service role
AGGREGATION_SINCE=...         # optional incremental watermark
```

---

## Milestone 5 — CAN DOG consolidation (moved to Phase 5)

CAN reading DOG from DOGS and removing local sheet sync is **[Phase 5, Milestone 2](./DOGS_Phase5_Dev_Plan.md)**.

### Options (decide before Phase 5)

- [ ] CAN backend: `GET /directory` proxy or direct frontend call
- [ ] Remove CAN `directory_sheet_sync.py` and local sheet config
- [ ] Keep `directory_of_good` for user-linked orgs OR drop in favor of DOGS ids

### Option B — CAN keeps local copy, periodic pull

- [ ] Nightly job: DOGS → CAN `directory_of_good` upsert
- [ ] Less coupling; CAN stays fast for local features

Decision required before implementation — document chosen option in decisions log.

---

## Milestone 6 — Documentation & handoff

- [ ] Admin Portal user guide (add/edit/delete entry, upload image)
- [ ] Runbook: aggregation job failure recovery
- [ ] Update architecture spec with Phase 3 data flows
- [ ] Archive Google Sheet (read-only) after confidence period

---

## Success criteria

- [ ] All DOG edits happen in Admin Portal; Sheet unused for 30+ days
- [ ] Images uploaded via Portal land in GCS
- [ ] Kumu export produces valid visualization input
- [ ] Aggregation job successfully pulls CAN + Frontline data (if enabled)
- [ ] `GET /cleanups` and `GET /trash-reports` return normalized data
- [ ] Apps still function if DOGS is down (local DBs authoritative)

---

## Out of scope (Phase 3)

- Real-time sync or webhooks from apps
- Cross-app identity / deduplication
- Outbound push from DOGS to app DBs
- Campaign, Challenge, Resource entities
- Public-facing DOG browse site (unless bundled with admin)

---

## Decisions log

| Date | Decision |
|------|----------|
| TBD | Admin framework: Vite SPA vs Next.js |
| TBD | CAN DOG: API read vs periodic local copy |
| TBD | Impetus aggregation in Phase 3 or 4 |
| TBD | Aggregation frequency: daily vs weekly |

---

**Previous:** [DOGS_Phase2_Dev_Plan.md](./DOGS_Phase2_Dev_Plan.md)  
**Next:** [DOGS_Phase4_Dev_Plan.md](./DOGS_Phase4_Dev_Plan.md)
