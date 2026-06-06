# DOGS Phase 5 — Development Plan

**Prerequisites:** Phases 1–4 complete — DOGS API stable, Admin Portal is DOG editor, ingest endpoints exist, per-app API keys, `@dogs/schemas` + TS types published, aggregation or ingest populating cleanup/trash tables.

**Goal:** Wire **Collective Action Network**, **Impetus**, and **Frontline** to the DOGS API for shared reads and writes. Each app keeps its local database as the fast path; DOGS is the canonical shared layer apps publish to and read from.

---

## Phase 5 outcomes

- All three apps display **Directory of Good** from DOGS (not local sheet sync or siloed copies)
- CAN and Frontline **publish cleanups and trash reports** to DOGS on create/update
- Impetus publishes **cleanup-related events** where applicable
- Local app-specific fields stay local; shared fields use `dogs-schemas`
- Deprecated duplicate code removed (CAN sheet sync, redundant local DOG tables where safe)
- Feature flags + graceful fallback if DOGS is unavailable

---

## Integration pattern (all apps)

```
User action
    │
    ├─► 1. Write local DB (required — fast, app stays usable offline/degraded)
    │
    └─► 2. Async call DOGS API (best-effort, retried)
            • Reads: cache with TTL, fallback to stale local copy
            • Writes: POST/PATCH /ingest/* idempotent on (source_app, source_id)
```

**Principles:**

- Local DB remains authoritative for app UX; DOGS is canonical for **shared** datasets
- No blocking user requests on DOGS latency
- Idempotent ingest — safe to retry
- Each app gets its own API key (`source_app`: `can` | `impetus` | `frontline`)

---

## DOGS API prerequisites (complete before Phase 5)

These may be built in Phase 4; Phase 5 assumes they exist.

- [ ] `GET /directory` with pagination, category filter, `updated_since`
- [ ] `GET /directory/{id}`, `GET /directory/map`
- [ ] `POST /ingest/cleanup`, `PATCH /ingest/cleanup/{source_app}/{source_id}`
- [ ] `POST /ingest/trash-report`, `PATCH /ingest/trash-report/{source_app}/{source_id}`
- [ ] Per-app API keys in Secret Manager
- [ ] CORS for app origins (browser direct calls) OR backend-proxy-only (preferred for keys)
- [ ] Rate limits per key
- [ ] OpenAPI spec stable enough for generated clients

---

## Milestone 1 — Shared client libraries

**Deliverable:** Thin SDK wrappers so each app doesn't hand-roll HTTP.

### Python (`packages/clients-python/` or in `dogs-schemas`)

- [ ] `DogsClient` — httpx async client
- [ ] Methods: `list_directory`, `get_directory_entry`, `ingest_cleanup`, `ingest_trash_report`
- [ ] Auto-retry on 5xx, timeout config
- [ ] Used by CAN backend and Frontline backend

### TypeScript (`packages/clients-ts/`)

- [ ] `DogsClient` — fetch wrapper
- [ ] Same methods as Python client
- [ ] Used by CAN frontend (if direct) and Impetus

### Config per app

```
DOGS_API_BASE_URL=https://dogs-...run.app
DOGS_API_KEY=...                    # server-side only
DOGS_ENABLED=true                   # feature flag
DOGS_DIRECTORY_CACHE_TTL_SECONDS=300
```

---

## Milestone 2 — Collective Action Network

**Repos:** `collective_action_backend`, `collective_action_frontend`

### Current state

- Local `directory_of_good` table + Google Sheet sync
- Cleanups / trash reports in `actions` with `event_data` JSON
- Geocoding and featured DOG sorting in backend

### 2a — Directory reads from DOGS

**Backend**

- [ ] Add `DogsClient` dependency
- [ ] New route `GET /directory-of-good` — proxy to DOGS `GET /directory` (or replace implementation)
- [ ] Map `DirectoryEntry` → existing `DirectoryOfGoodSchema` response shape for frontend compatibility
- [ ] Optional: store `dogs_id` on local `directory_of_good` for user-linked orgs only
- [ ] Remove `directory_sheet_sync.py` and `POST .../sync-from-sheet` CAN endpoint
- [ ] Remove `DIRECTORY_GOOGLE_SHEET_*` config

**Frontend**

- [ ] No change if backend response shape unchanged
- [ ] Verify map, list, and featured views work with DOGS-sourced data
- [ ] Category filter uses DOGS category slugs

### 2b — User-linked organizations

CAN allows users to claim/link a DOG entry (`directory_of_good.user_id`).

- [ ] Keep local row for `user_id`, `featured` overrides if needed
- [ ] Add column `dogs_directory_id` UUID FK reference (logical, not DB FK across services)
- [ ] On user org create: `POST /directory` to DOGS + link local row
- [ ] Document: user-created orgs exist in both places; sheet-sourced orgs are DOGS-only reads

### 2c — Cleanup & trash ingest

**Backend** (`app/api/actions.py`)

- [ ] After create/update `Action` with `event_data.type` in (`Cleanup`, `Trash Report`):
  - Background task: map to `Cleanup` / `TrashReport` schema
  - `DogsClient.ingest_cleanup` or `ingest_trash_report` with `source_app=can`, `source_id=action.id`
- [ ] Include lat/lng from `Action`, images from `image_urls`
- [ ] On resolution (trash claimed/cleaned): PATCH ingest with updated status
- [ ] Cloud Tasks queue for retry (match Phase 4 design)

**Mapping reference**

| CAN `Action` / `event_data` | DOGS `Cleanup` / `TrashReport` |
|----------------------------|--------------------------------|
| `event_data.name` | `title` |
| `event_data.location` | `location_text` |
| `latitude`, `longitude` | `coordinates` |
| `event_data.scheduled_*` | `scheduled_start/end` |
| `image_urls` | `photo_urls` |
| `event_data.small_bags`, etc. | `metrics` |

### 2d — Testing & rollout

- [ ] Feature flag `DOGS_ENABLED` — fallback to local DOG table during migration
- [ ] Compare DOGS directory vs local table (parity script)
- [ ] Deploy backend → deploy frontend → disable sheet sync
- [ ] Monitor ingest error logs for 1 week

---

## Milestone 3 — Impetus

**Repo:** `impetus` (Firebase Firestore, React)

### Current state

- `groups` collection = organizations (no DOG integration)
- Cleanup content via `topics`, `events`, `challenges`, `map_pins`
- No trash report entity
- `Group.links` partially matches shared `SocialLinks`

### 3a — Directory of Good browse

- [ ] New page or section: **Directory of Good** — `GET /directory` via backend proxy or Cloud Function
- [ ] **Do not** store full DOG copy in Firestore; fetch with cache (React Query, 5–15 min stale time)
- [ ] Map view: use `coordinates` from DOGS entries
- [ ] Card UI: name, focus, categories, social links, image from GCS URL
- [ ] Link out to group websites / socials

**Auth note:** API key must not ship to browser — use Firebase Callable Function or small Cloud Function proxy:

```
GET /api/dogs/directory → Cloud Function → DOGS API
```

### 3b — Groups vs DOG

Impetus `groups` are topic-scoped orgs; DOG is global. Keep both.

- [ ] Document: `Group` = Impetus-specific; DOG = cross-ecosystem directory
- [ ] Optional: "Also in Directory of Good" badge if `website` or name matches (string match only — no identity resolution required)
- [ ] Adopt `@dogs/schemas` types for shared field validation on `Group` create form

### 3c — Cleanup ingest (events)

For events under trash-cleanup topic (`ImpetusEvent`):

- [ ] Cloud Function on `events/{id}` write (create/update)
- [ ] If `topicSlug === 'trash-cleanup'` (or configured list): map to DOGS `Cleanup`, ingest
- [ ] Fields: `title`, `description`, `date`/`endDate`, `location`, `coordinates`
- [ ] `source_app=impetus`, `source_id=event.id`

### 3d — Stretch: challenges & map pins

- [ ] `map_pins` → optional ingest as cleanup-adjacent location data (define mapping or defer)
- [ ] `challenge_submissions` → not TrashReport; skip unless schema extended

### 3e — Testing & rollout

- [ ] DOG browse page behind feature flag
- [ ] Ingest function in staging Firestore project first
- [ ] Verify DOGS Admin / stats show Impetus-sourced cleanups

---

## Milestone 4 — Frontline

**Repo:** `frontline` (Supabase + FastAPI backend + React frontend)

### Current state

- `groups` — orgs (no categories)
- `contributions` with `contribution_type=cleanup`
- `problem_reports` — trash reports with PostGIS points
- No DOG integration

### 4a — Directory reads

**Backend**

- [ ] `DogsClient` in FastAPI
- [ ] `GET /api/dogs/directory` — proxy to DOGS with caching
- [ ] Optional: show nearby DOG entries on campaign map (`GET /directory/map?bbox=`)

**Frontend**

- [ ] Directory panel or `/directory` route
- [ ] Use shared TS types for display

### 4b — Groups alignment

- [ ] Add optional `dogs_directory_id` on `groups` (migration) for future linking
- [ ] Adopt shared `SocialLinks` on group forms (facebook, twitter, etc.)
- [ ] Categories on groups — optional, map to DOGS category slugs if added

### 4c — Cleanup & trash ingest

**Backend** (`contributions.py`, `problem_reports.py`)

- [ ] After insert/update on cleanup `contributions`:
  - Map to DOGS `Cleanup` (value → metrics, photo_url, PostGIS → coordinates)
  - Ingest async with `source_app=frontline`, `source_id=contribution.id`
- [ ] After insert/update on `problem_reports`:
  - Map severity, status, photo, location
  - Ingest async

**Mapping reference**

| Frontline | DOGS |
|-----------|------|
| `contributions.value` | `metrics.value` |
| `contributions.photo_url` | `photo_urls[0]` |
| `contributions.location` | `coordinates` |
| `problem_reports.severity` | `severity` |
| `problem_reports.status` | `status` |

### 4d — Cross-app map (optional UI)

- [ ] Campaign map layer toggling "All ecosystem cleanups" from `GET /cleanups/map`
- [ ] Distinguish source_app in marker styling (CAN vs Frontline vs Impetus)

### 4e — Testing & rollout

- [ ] Staging Supabase + DOGS staging API
- [ ] Ingest verification via DOGS `GET /cleanups?source_app=frontline`

---

## Milestone 5 — Cross-app verification

**Deliverable:** End-to-end proof that all three apps talk to DOGS correctly.

### Parity & data checks

- [ ] DOG entry count matches Admin Portal (~72+)
- [ ] Create cleanup in CAN → appears in DOGS within 1 min
- [ ] Create problem_report in Frontline → appears in DOGS
- [ ] Create trash-cleanup event in Impetus → appears in DOGS
- [ ] DOGS stats API reflects all three `source_app` values

### Degraded mode tests

- [ ] DOGS API down → CAN directory page still loads (cached or last-known)
- [ ] DOGS ingest fails → local create still succeeds; retry queue drains when back

### Performance

- [ ] Directory list < 500ms p95 via proxy
- [ ] Ingest does not add > 100ms to user-facing create path (async only)

---

## Milestone 6 — Deprecation & cleanup

**Deliverable:** Remove duplicated logic and document new architecture.

### CAN

- [ ] Delete `directory_sheet_sync.py`, sheet config, sync routes
- [ ] Archive local `directory_of_good` read path if fully replaced (keep table for user-linked rows only)
- [ ] Update CAN README

### Impetus

- [ ] Document DOG vs Group in `CLAUDE.md` / README
- [ ] Remove any stubbed directory data if present

### Frontline

- [ ] Update `campaign-app-scope.md` with DOGS integration section

### DOGS repo

- [ ] Update `docs/app_field_mapping.md` with final integration status
- [ ] Update architecture spec: apps coupled = yes

---

## Rollout order (recommended)

1. **CAN directory read** — highest overlap with existing DOG UX; remove sheet sync
2. **Frontline ingest** — cleanest cleanup/trash models
3. **CAN ingest** — actions mapping
4. **Impetus directory read** — new UI, lower risk
5. **Impetus event ingest** — Cloud Functions
6. **Cross-app map layers** — polish

---

## Success criteria

- [ ] Zero production dependency on Google Sheet for DOG
- [ ] CAN `/directory-of-good` served from DOGS
- [ ] Impetus has browsable DOG page sourced from DOGS
- [ ] Frontline shows DOG directory (or map overlay)
- [ ] Cleanups/trash from CAN + Frontline in DOGS within minutes of create
- [ ] Impetus trash-cleanup events ingested
- [ ] All apps function with `DOGS_ENABLED=false` for emergency rollback
- [ ] Per-app API keys rotated and stored in Secret Manager

---

## Out of scope (Phase 5)

- Bidirectional sync (DOGS → app DB writes)
- Replacing Impetus `groups` with DOG entries
- Replacing Frontline `groups` / CAN user org model with DOG only
- Real-time WebSocket updates from DOGS
- Public unauthenticated DOGS access from mobile apps
- Identity resolution / merge duplicate orgs across apps

---

## Decisions log

| Date | Decision |
|------|----------|
| TBD | CAN: proxy all DOGS calls vs frontend direct (recommend backend proxy) |
| TBD | Impetus: Cloud Function vs Firebase Extensions for ingest |
| TBD | Keep local `directory_of_good` for user-linked orgs or migrate fully to DOGS |
| TBD | Rollout order if CAN and Frontline deploy schedules conflict |

---

**Previous:** [DOGS_Phase4_Dev_Plan.md](./DOGS_Phase4_Dev_Plan.md)  
**Index:** [DOGS_Dev_Plans_Index.md](./DOGS_Dev_Plans_Index.md)
