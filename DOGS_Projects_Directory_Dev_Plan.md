# DOGS Projects Directory — Development Plan

**Prerequisites:** Phase 1 complete — `directory_entries`/`categories` schema, capture (URL scrape) flow, review queue, GCS photo hosting all working for the existing Directory of Good.

**Goal:** Add a second directory — **social-good / civic-tech projects (mainly websites) happening in the world** — reusing the DOGS capture → review → showcase pipeline, with the frontend pages generalized to a config-driven shape so one set of pages renders either directory instead of two hardcoded copies.

This is a parallel initiative, not a numbered phase in the [Phase 1–5 track](./DOGS_Dev_Plans_Index.md) (which is about downstream app integration) — it can proceed independently.

---

## Outcomes

- New `projects` entity: name, description, image, links (website/app store/Google Play/GitHub/socials), lifecycle `stage`, optional location, shared categories
- Projects can be linked back to the Directory of Good org/person/group behind them
- `/projects` showcase, map, network, submit, capture, and review pages exist and work the same way the DOG ones do today
- Existing DOG pages are **unchanged in behavior** after the refactor — the config extraction is a no-op for them
- No new frontend concepts invented: same capture-via-URL, review queue, and photo re-hosting patterns as DOG entries

---

## Data model

### `projects` table (new)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `name` | string | |
| `description` | text, nullable | |
| `image_url` | text, nullable | |
| `location` | JSON, nullable | optional — most projects are global/remote |
| `latitude` / `longitude` | float, nullable | |
| `social_links` | JSON, nullable | reuses the extended `SocialLinks`/links schema (see below) |
| `stage` | string(20) | project lifecycle: `active` / `in_development` / `beta` / `sunset` |
| `status` | string(20), default `published` | publication workflow: `pending` / `published` — same meaning as `DirectoryEntry.status` |
| `suggested_category` | string, nullable | |
| `edit_token` | string(64), nullable | |
| `featured` | bool, default false | |
| `user_ids` | JSON, nullable | |
| `created_at` / `updated_at` | timestamptz | |

### `project_categories` (new join table)

Same pattern as `directory_entry_categories` — `project_id` + `category_id`, both FK, composite PK. Reuses the **existing `categories` table** (Environment, Housing, etc. apply equally to projects — no separate category set).

### `project_directory_entries` (new join table)

Many-to-many between `projects` and `directory_entries` — ties a project back to the DOG org/person/group(s) behind it. Many-to-many because one org can ship multiple projects, and a project can plausibly have multiple contributing orgs.

| Column | Type |
|--------|------|
| `project_id` | UUID FK → `projects.id`, part of composite PK |
| `directory_entry_id` | UUID FK → `directory_entries.id`, part of composite PK |

### Extend the shared links schema

Add `app_store`, `google_play`, `github` to `SocialLinks` (`api/app/schemas/location.py`) alongside the existing `website`/`instagram`/`tiktok`/`youtube`/`facebook`/`twitter`. It stays one shared schema used by both entities — the frontend config decides which fields a given entity's form displays, so DOG entries aren't forced to show app-store fields.

---

## Milestone 1 — Backend

**Deliverable:** `projects` CRUD + capture/extract, independently testable via `/docs`, no frontend changes yet.

- [ ] Alembic migration: `projects`, `project_categories`, `project_directory_entries` tables
- [ ] Extend `SocialLinks` schema with `app_store`, `google_play`, `github`
- [ ] `app/models/project.py` — `Project`, `ProjectCategory`, `ProjectDirectoryEntry` (mirrors `models/directory.py`)
- [ ] `app/schemas/project.py` — `Project`, `ProjectCreate`, `ProjectUpdate`, `ProjectPublicUpdate`, `ProjectStage` enum (mirrors `schemas/directory.py`)
- [ ] `app/services/project_service.py` — CRUD + list filters (`status`, `category`, `stage`) (mirrors `directory_service.py`)
- [ ] `app/routes/projects.py`:
  - [ ] `GET /projects` (filter by `status`, `category`, `stage`)
  - [ ] `GET /projects/{id}`
  - [ ] `POST /projects`
  - [ ] `PATCH /projects/{id}`
  - [ ] `DELETE /projects/{id}`
  - [ ] `POST /projects/extract` — reuse `services/scraping.py` as-is
  - [ ] `POST /projects/photos`, `POST /projects/photos/from-url` — reuse `services/storage.py`/`images.py` as-is
  - [ ] `PATCH /projects/{id}/directory-links` — set/update linked `directory_entries` (or fold into `ProjectUpdate` as a `directory_entry_ids` field)
- [ ] Update `openapi/dogs-schemas.json` export, `docs/erd.mmd` regeneration
- [ ] Update README endpoints table

**Exit criteria:** Can create/publish a project via `/docs`, link it to a DOG entry, and scrape a project website through `/projects/extract` — all without touching `web/`.

---

## Milestone 2 — Frontend: extract shared config (no behavior change)

**Deliverable:** Existing DOG pages work exactly as they do today, but are now driven by a config object instead of hardcoded imports/fields.

- [x] Define `EntityConfig` type (`web/src/config/entityConfig.ts` or similar): API module, TS entity type, display labels (nav label, singular/plural, page heading/subheading), route base path, which fields the form/card render, whether Map/Network apply, category source
- [x] `directoryConfig` — the only config instance for now, wired to `api/directory.ts`
- [x] Thread `config` prop through: `ShowcasePage`, `MapPage`, `NetworkPage`, `SubmitPage`, `CapturePage`, `ReviewQueuePage`, `ReviewEntryPage`, `AllEntriesPage`, `EntryDetailPage`, `EditEntryPage`, `NeedsPhotoPage`
- [x] `App.tsx` passes `directoryConfig` into each route — routes/paths unchanged (`/`, `/map`, `/network`, `/submit`, etc.)
- [x] Manual pass through every DOG route to confirm zero regressions before moving to Milestone 3

**Exit criteria:** Diff is a refactor only — DOG showcase/map/network/submit/capture/review all behave identically to pre-refactor. ✅ Confirmed by manual browser pass.

---

## Milestone 3 — Frontend: wire up Projects

**Deliverable:** `/projects/*` routes render the same page set against the new API, with project-specific fields.

- [ ] `web/src/api/projects.ts` (mirrors `directory.ts`)
- [ ] `web/src/api/types.ts` — `Project`, `ProjectStage`, extended `SocialLinks` fields
- [ ] `projectsConfig` — labels ("Projects" / "project"), fields (links block includes app store/Google Play/GitHub, stage selector, linked DOG entries), route base `/projects`
- [ ] New components only where the shape truly diverges:
  - [ ] `ProjectCard` (stage badge, links row) if `EntryCard` can't reasonably flex to cover it
  - [ ] `ProjectForm` field additions (stage select, linked-DOG-entry picker) layered on/around `DirectoryEntryForm`'s shared structure
  - [ ] Reuse unchanged: `PhotoUploadField`, `SocialIcon`, `LoadingState`, `CategoryFilterBar`, `CategoryGuideModal`, `UrlExtractBox`, `ThemeToggle`
- [ ] `App.tsx`: mount the full page set again under `/projects/*` with `projectsConfig`
- [ ] Nav: add a way to switch between "Directory of Good" and "Projects" (top-level nav entry or directory switcher)
- [ ] Linked-DOG-entry picker: search/select existing DOG entries from a project's edit/capture/review view

**Exit criteria:** `/projects` showcase, map, network, submit, capture, and review queue all work end-to-end against the new table, including linking a project to a DOG entry.

---

## Out of scope (this plan)

- Separate category set for projects (using shared `categories` for now)
- Bidirectional sync of projects into external sheets/feeds
- Automated/bulk ingestion of projects from external sources (manual capture + submit form only, same as DOG entries)
- Deprecating or merging any existing DOG-entry functionality

---

## Success criteria

- [ ] `projects` + join tables migrated; DOG tables/behavior untouched
- [ ] `/projects` mirrors `/` (showcase/map/network/submit/capture/review) using the same shared page components as DOG entries
- [ ] A project can be created via capture-by-URL, reviewed, published, and linked to one or more DOG entries
- [ ] Zero regressions on existing `/`, `/map`, `/network`, `/submit`, `/capture`, `/review*` routes after the Milestone 2 refactor

---

## Decisions log

| Date | Decision |
|------|----------|
| 2026-07-04 | Shared config-driven pages across both directories, not a parallel duplicate set |
| 2026-07-04 | Keep Map and Network views for Projects, same as DOG entries |
| 2026-07-04 | Projects share the existing `categories` table rather than a project-only set |
| 2026-07-04 | `social_links` schema extended (app_store, google_play, github) and shared across both entities rather than a project-only links type |
| 2026-07-04 | New `stage` column for project lifecycle, kept separate from the existing `status` (publication) field |
| 2026-07-04 | Projects link to DOG entries via a many-to-many join table, not a single FK |

---

**Index:** [DOGS_Dev_Plans_Index.md](./DOGS_Dev_Plans_Index.md)
