# DOGS Phase 4 — Development Plan

**Prerequisites:** Phase 3 complete — Admin Portal replaces Sheet, optional aggregation jobs pulling cleanups/trash reports from CAN and Frontline into DOGS.

**Goal:** Cross-ecosystem visibility — unified reporting, analytics, and optional identity resolution. Still not real-time bidirectional sync unless explicitly required.

---

## Phase 4 outcomes

- Unified analytics and reporting across DOG, cleanups, and trash reports
- Dashboard or export APIs for ecosystem insights
- Optional: apps read from DOGS for shared datasets (DOG directory, cross-app maps)
- Optional: identity resolution if duplicate orgs across apps become a problem
- Optional: app write path to DOGS (if aggregation is insufficient)

---

## Guiding principles

1. **Apps stay independently deployable** — DOGS enhances visibility; apps don't hard-depend on it for core UX.
2. **No sync platform unless needed** — prefer scheduled aggregation + shared schemas over event buses.
3. **Identity resolution is opt-in** — only build if duplicate data becomes painful.
4. **Read before write** — apps consume DOGS read APIs before sending writes.

---

## Milestone 1 — Reporting & analytics API

**Deliverable:** Query endpoints and aggregates for ecosystem-wide metrics.

### Database additions

- [ ] Materialized views or summary tables (refresh on aggregation job):
  - `dogs.stats_cleanups_by_region` — counts by state/country/month
  - `dogs.stats_trash_reports_by_severity`
  - `dogs.stats_directory_by_category`
- [ ] Optional: `dogs.ingestion_runs` — log each aggregation/sync job

### API endpoints

- [ ] `GET /stats/overview` — totals: entries, cleanups, trash reports, by source_app
- [ ] `GET /stats/cleanups` — time series, group by region/category
- [ ] `GET /stats/trash-reports` — open vs resolved, by severity
- [ ] `GET /stats/directory` — entries per category, geocoded vs not
- [ ] `GET /directory/map` — GeoJSON FeatureCollection for map layers
- [ ] `GET /cleanups/map` — GeoJSON for cleanup points
- [ ] `GET /trash-reports/map` — GeoJSON for report points

### Export formats

- [ ] CSV export for all entity types
- [ ] GeoJSON export for GIS tools
- [ ] Kumu-compatible export (maintain from Phase 3)

---

## Milestone 2 — Analytics dashboard (optional UI)

**Deliverable:** Internal dashboard for ecosystem metrics (not required if API-only is enough).

### Options

| Option | Pros | Cons |
|--------|------|------|
| Extend Admin Portal | Single app, reuse auth | Heavier frontend |
| Looker Studio / Metabase | Fast, SQL-native | External tool |
| Grafana + Postgres | Ops-friendly | Less polished for non-technical users |

### If built in Admin Portal

- [ ] `/dashboard` page — charts: cleanups over time, reports by severity, DOG growth
- [ ] Map view — all geocoded entries + recent cleanups/reports
- [ ] Filter by date range, category, source_app
- [ ] Library: Recharts, Mapbox, or Leaflet

---

## Milestone 3 — App read integration (pilot)

**Deliverable:** Prove one app can consume DOGS read APIs before Phase 5 full rollout.

Full multi-app integration is **[Phase 5](./DOGS_Phase5_Dev_Plan.md)**.

### 3a — Optional CAN read (pilot)

Full CAN integration is Phase 5. Optionally pilot `GET /directory` proxy here.

### Cleanups & trash (cross-app map)

- [ ] Shared map layer showing CAN + Frontline aggregated data
- [ ] Each app labels source: "CAN", "Frontline" — no merged identity

### Caching strategy

- [ ] Apps cache DOGS responses (5–60 min TTL)
- [ ] Graceful fallback to local data if DOGS unavailable
- [ ] ETag or `updated_at` query param for incremental refresh

### API additions

- [ ] `GET /directory?updated_since=ISO8601` — incremental fetch
- [ ] Rate limiting per app API key
- [ ] CORS config for app origins

---

## Milestone 4 — Ingest API (required for Phase 5)

**Deliverable:** DOGS exposes ingest endpoints; apps do not call them until Phase 5.

Phase 5 wires CAN, Impetus, and Frontline to these endpoints.

### Design

```
User action in app
    → Write local DB (required, fast)
    → Async POST to DOGS (best-effort, non-blocking)
    → DOGS validates against dogs-schemas, upserts canonical copy
```

### API endpoints

- [ ] `POST /ingest/cleanup` — idempotent on (`source_app`, `source_id`)
- [ ] `POST /ingest/trash-report`
- [ ] `PATCH /ingest/cleanup/{source_app}/{source_id}`
- [ ] Per-app API keys with `source_app` claim

### CAN integration (Phase 5)

- [ ] Documented in Phase 5 — see Milestone 2

### Frontline integration (Phase 5)

- [ ] Documented in Phase 5 — see Milestone 4

### Impetus integration (Phase 5)

- [ ] Documented in Phase 5 — see Milestone 3

### Not in scope unless requested

- DOGS pushing updates back to apps
- Distributed transactions
- Pub/Sub event bus ( reconsider only at high volume)

---

## Milestone 5 — Identity resolution (optional)

**Deliverable:** Link records that represent the same real-world org across apps.

**Trigger:** Manual review queue grows too large, or duplicate DOG entries from multiple apps.

### Minimal approach

- [ ] `dogs.entity_links` table:
  - `canonical_directory_entry_id` UUID
  - `source_app`, `source_type`, `source_id`
  - `confidence` — `manual` | `auto_suggested`
  - `created_by`, `created_at`
- [ ] Admin UI: "Link to existing entry" when reviewing imports
- [ ] Auto-suggest: match on normalized name + website domain (never auto-merge without review)

### Out of scope unless explicitly needed

- Graph merge across cleanups
- Shared user identity across apps
- Golden record algorithm

---

## Milestone 6 — Visibility & distribution rules (optional)

From original architecture diagram — per-app visibility for directory entries.

Only if apps share a directory but need different subsets visible.

- [ ] `directory_entry_visibility` — (`entry_id`, `app`, `visible` bool)
- [ ] Default: all visible everywhere
- [ ] Admin Portal: per-app toggles on edit form
- [ ] `GET /directory?app=can` — filter by visibility

---

## Milestone 7 — Hardening & scale

- [ ] Cloud SQL read replica if reporting load grows
- [ ] Min instances > 0 on DOGS API if apps depend on reads
- [ ] Backup strategy for `dogs` schema
- [ ] Disaster recovery runbook
- [ ] Load test aggregation job with 10x current volume
- [ ] Privacy review for aggregated location data

---

## Success criteria

- [ ] Single API returns cross-app cleanup and trash report counts
- [ ] Map endpoint renders combined CAN + Frontline data
- [ ] At least one pilot app reads DOG from DOGS (optional before Phase 5)
- [ ] Ingest API tested via curl/integration tests
- [ ] Reporting usable for grant applications / impact summaries
- [ ] Platform survives DOGS outage without breaking app core flows

---

## Out of scope (Phase 4 unless re-prioritized)

- Campaign, Challenge, Resource canonical store
- Multi-region DOGS deployment
- Public API for third parties
- Kafka / Pub/Sub event backbone
- Full bidirectional sync platform

---

## Decision gates (review before starting Phase 4)

Answer these before committing to Milestone 4 or 5:

1. Is daily aggregation stale enough to need app writes?
2. Are duplicate orgs across apps actually a problem yet?
3. Do we need a dashboard UI or is SQL + Looker enough?
4. Should DOG be public API or internal-only?

---

## Decisions log

| Date | Decision |
|------|----------|
| TBD | Ingest vs aggregation-only for app → DOGS flow |
| TBD | Identity resolution: build vs skip indefinitely |
| TBD | Dashboard: Admin Portal extension vs external BI |
| TBD | Public read API vs app-key-only |

---

**Previous:** [DOGS_Phase3_Dev_Plan.md](./DOGS_Phase3_Dev_Plan.md)  
**Next:** [DOGS_Phase5_Dev_Plan.md](./DOGS_Phase5_Dev_Plan.md)  
**Next phase:** [DOGS_Phase5_Dev_Plan.md](./DOGS_Phase5_Dev_Plan.md)
