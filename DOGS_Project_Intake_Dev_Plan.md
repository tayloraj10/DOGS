# DOGS Project Idea Intake — Development Plan

**Prerequisites:** [Projects Directory](./DOGS_Projects_Directory_Dev_Plan.md) (dedup needs to search against real, already-built `projects`) and [Auth](./DOGS_Auth_Dev_Plan.md) (joining a project and showing a team roster requires signed-in users).

**Goal:** A public-facing intake funnel, tuned to receive cold traffic from social media, where people submit new social-good tech project *ideas* (not yet built). Submissions get checked against existing ideas and existing projects to reduce duplicate effort, anyone can attach links to prior-art apps already doing something similar, and once an idea is real, people can join its team and see who else is working on it.

This is a parallel initiative, not a numbered phase — can proceed independently once its two prerequisites above exist.

---

## Outcomes

- `/ideas/submit` — public submission form (name, description, category, optional links)
- Live "does this already exist?" check while typing: trigram/full-text similarity search against both `project_ideas` and `projects`, surfaced inline so a submitter can redirect to an existing idea/project instead of forking effort
- `idea_similar_apps` — anyone (not just the submitter) can attach a link to an existing app/site doing something similar, at submission or later from the idea's page
- Admin review queue for ideas, reusing the existing DOG/Projects review-queue pattern
- On approval, an idea is promoted into the existing `projects` table (carries name/description/categories/similar-apps forward as prior art)
- `project_members` — any signed-in user can join a project; the project page shows a full team roster with contact info, visible to any other signed-in user
- A dedicated social landing page (`/ideas`) built for share/CTA traffic, distinct from the internal-feeling review/showcase pages

---

## Data model

### `project_ideas` table (new)

Mirrors `projects` where it makes sense, but simpler — an idea has no location/photo/stage until it's promoted.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `name` | string | |
| `description` | text | required — this is what gets matched against for dedup |
| `submitter_user_id` | UUID FK → `users.id`, nullable | nullable to allow anonymous submission, same as DOG/Projects capture |
| `edit_token` | string(64), nullable | self-service edit for anonymous submitters, same pattern as `projects.edit_token` |
| `status` | string(20), default `pending` | `pending` / `approved` / `rejected` / `merged` |
| `merged_into_project_id` | UUID FK → `projects.id`, nullable | set when an admin resolves a submission as a duplicate of an existing project instead of approving it fresh |
| `suggested_category` | string, nullable | same pattern as `directory_entries`/`projects` |
| `created_at` / `updated_at` | timestamptz | |

### `idea_categories` (new join table)

Same pattern as `project_categories` — reuses the shared `categories` table.

### `idea_similar_apps` table (new)

Crowdsourced prior-art links. A separate table (not a JSON field like `social_links`) because — per your answer — this isn't just the submitter filling out one field once, it's anyone attaching a link over the idea's lifetime, so each entry needs its own provenance.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `idea_id` | UUID FK → `project_ideas.id`, cascade delete | |
| `url` | text | required |
| `name` | string, nullable | display name if known |
| `note` | text, nullable | free-text — why it's similar |
| `added_by_user_id` | UUID FK → `users.id`, nullable | nullable for anonymous adds |
| `created_at` | timestamptz | |

### `project_members` table (new)

| Column | Type | Notes |
|--------|------|-------|
| `project_id` | UUID FK → `projects.id`, cascade delete | part of composite PK |
| `user_id` | UUID FK → `users.id`, cascade delete | part of composite PK |
| `role` | string(20), default `member` | `lead` / `member` — the idea's original submitter becomes `lead` on promotion |
| `contact_info` | text, nullable | free text (email/Discord/whatever), entered by the member at join time; blank = not shown on the public roster |
| `joined_at` | timestamptz | |

Roster shows `name`/`photo_url` from `users` (identity is never optional — you have to be signed in to join) plus `contact_info` from `project_members`, which is opt-in per membership rather than pulled from `users.email`. A member can join without filling it in, and can edit it later from their own membership row. No separate opt-in flag needed — blank string/null just means omit from the roster display.

### Dedup search (`pg_trgm`)

- Enable the `pg_trgm` Postgres extension (one migration)
- GIN trigram index on `project_ideas.name` + `project_ideas.description`, and on `projects.name` + `projects.description`
- `GET /project-ideas/similar?q=...` — takes name+description text, returns top-N matches from both tables ranked by trigram similarity, above a similarity threshold (tune once real submissions exist)
- Called live (debounced) from the submit form as the user types, and again server-side on actual submission as a non-bypassable check

Semantic/embeddings-based matching (pgvector) is an explicit fast-follow, not v1 — see [Out of scope](#out-of-scope-this-plan).

---

## API additions

Mirrors the existing `projects.py` route conventions (optional-auth create via `get_current_user_optional`, edit-token self-service, admin-only status changes).

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/project-ideas/similar?q=` | trigram search across ideas + projects, used pre-submit |
| `POST` | `/project-ideas` | create; optional auth stamps `submitter_user_id`, else falls back to `edit_token` |
| `GET` | `/project-ideas` | list, filter by `status`, `category` |
| `GET` | `/project-ideas/{id}` | |
| `PATCH` | `/project-ideas/{id}` | admin update |
| `PATCH` | `/project-ideas/{id}/public` | self-service via `edit_token`, same pattern as `ProjectPublicUpdate` |
| `POST` | `/project-ideas/{id}/similar-apps` | anyone adds a prior-art link; optional auth stamps `added_by_user_id` |
| `POST` | `/project-ideas/{id}/approve` | admin — creates a `Project` row from the idea, copies fields + similar-apps as prior art, sets idea `status=approved`, stamps submitter as `lead` in `project_members` |
| `POST` | `/project-ideas/{id}/reject` | admin |
| `POST` | `/project-ideas/{id}/merge?project_id=` | admin — resolves as duplicate of an existing project, sets `merged_into_project_id`, `status=merged` |
| `POST` | `/projects/{id}/join` | signed-in only — adds caller to `project_members` as `member` |
| `DELETE` | `/projects/{id}/leave` | signed-in only |
| `GET` | `/projects/{id}/members` | roster with contact info |

---

## Milestone 1 — Backend: ideas + dedup

**Deliverable:** `project_ideas` CRUD + similarity search, independently testable via `/docs`.

- [ ] Alembic migration: `pg_trgm` extension, `project_ideas`, `idea_categories`, `idea_similar_apps` tables + trigram indexes
- [ ] `app/models/project_idea.py` (mirrors `models/project.py`)
- [ ] `app/schemas/project_idea.py` — `ProjectIdea`, `ProjectIdeaCreate`, `ProjectIdeaUpdate`, `ProjectIdeaPublicUpdate`, `SimilarApp`
- [ ] `app/services/project_idea_service.py` — CRUD, trigram similarity query
- [ ] `app/routes/project_ideas.py` — endpoints above (excluding `/approve`, `/reject`, `/merge`, join/leave — those land in Milestone 2)
- [ ] Update `openapi/dogs-schemas.json`, `docs/erd.mmd`, README endpoints table

**Exit criteria:** Can submit an idea via `/docs`, get similarity results back for a near-duplicate description, and attach a similar-app link.

---

## Milestone 2 — Backend: promotion + membership

**Deliverable:** Ideas can become projects; projects have joinable teams.

- [ ] Alembic migration: `project_members` table
- [ ] `approve` / `reject` / `merge` endpoints on `project_ideas`, wired to `project_service.apply_create_data` for the copy-over
- [ ] `join` / `leave` / `members` endpoints on `projects.py`, gated by `get_current_user` (hard-required, not optional — first hard-auth-required endpoints in the app)
- [ ] `join` accepts an optional `contact_info` string, editable later via a member-only update endpoint

**Exit criteria:** An approved idea produces a real `Project` row with the submitter as `lead`; a second signed-in user can join and both appear on `GET /projects/{id}/members`.

---

## Milestone 3 — Frontend: submission + dedup UX

**Deliverable:** `/ideas/submit` works end-to-end with live duplicate warnings.

- [ ] `web/src/api/projectIdeas.ts`
- [ ] Submit form: name, description, category — debounced call to `/project-ideas/similar` as name/description are typed, rendered as a dismissible "these look similar — is one of these yours?" panel above the submit button
- [ ] Reuse `PhotoUploadField`-adjacent patterns only if ideas end up wanting an image; otherwise skip (ideas are text-first, unlike DOG/Projects entries)
- [ ] Idea confirmation page after submit, with edit-link handling (same pattern as Projects capture)

**Exit criteria:** A user typing a description matching an existing idea/project sees it flagged before they can submit blind.

---

## Milestone 4 — Frontend: idea detail + admin review

**Deliverable:** Ideas are browsable and reviewable, similar-apps are crowdsourceable.

- [ ] `/ideas/{id}` detail page: description, category, similar-apps list, "know an app like this? add it" form (open to any visitor, optionally signed-in)
- [ ] Admin review queue reusing the existing `ReviewQueuePage`/`ReviewEntryPage` shape, extended with approve / reject / merge-into-existing-project actions
- [ ] Merge action needs a project picker (search existing `projects`, same interaction as the existing linked-DOG-entry picker)

**Exit criteria:** Admin can triage a pending idea into approved/rejected/merged entirely from the UI.

---

## Milestone 5 — Frontend: team roster + join flow

**Deliverable:** Project pages show who's involved and let people join.

- [ ] Project detail page gets a "Team" section: roster (name, photo, role, contact) + "Join this project" button (auth-gated — prompts sign-in if signed out)
- [ ] Leave-project action for existing members

**Exit criteria:** A signed-in user can join a project from its page and immediately appear in the roster others see.

---

## Milestone 6 — Social landing page

**Deliverable:** The actual traffic-facing surface, separate from the internal-feeling directory pages.

- [ ] `/ideas` as a standalone landing page (not just `AllEntriesPage` reused verbatim) — built for share/CTA: headline, "submit your idea" primary action, a feed of recently-approved ideas/projects for social proof
- [ ] Open graph / share-card metadata so links posted to social platforms render with an image + description
- [ ] Basic abuse mitigation for a page explicitly designed to receive cold anonymous traffic — rate limiting on `POST /project-ideas`, at minimum; captcha is a judgment call once volume is real

**Exit criteria:** A link to `/ideas` posted on social media renders a proper share card and a first-time visitor can submit an idea without friction.

---

## Out of scope (this plan)

- Semantic/embeddings-based dedup (pgvector) — explicit fast-follow once submission volume makes trigram's lexical-only matching a real limitation, per the earlier scoping discussion
- In-platform messaging/contact-request flow as an alternative to showing email directly — flagged as an open decision in Milestone 2, not designed here
- Moderation/spam-filtering of crowdsourced `idea_similar_apps` links beyond basic rate limiting
- Notifications (email/push) when someone joins a project or an idea is approved
- Idea photos/images — text-first for v1

---

## Success criteria

- `project_ideas`, `idea_categories`, `idea_similar_apps`, `project_members` tables migrated; existing `projects`/DOG tables and behavior untouched
- Submitting a near-duplicate idea surfaces the existing one before the submitter finishes
- An approved idea becomes a real project with its submitter as lead and prior-art links carried over
- A second person can join a promoted project and see full contact info for the rest of the team
- `/ideas` is fit to post on social media (share card, clear CTA, fast anonymous submission)

---

## Decisions log

| Date | Decision |
|------|----------|
| 2026-07-09 | Ideas are a separate `project_ideas` entity, promoted into `projects` on approval — not a `stage=idea` value on the existing table |
| 2026-07-09 | Dedup starts with Postgres trigram/full-text search; semantic (pgvector) matching deferred until submission volume justifies the added infra |
| 2026-07-09 | "Apps already doing this" is a crowdsourced, provenance-tracked list (`idea_similar_apps` table) anyone can add to, not a single free-text field on the idea |
| 2026-07-09 | Project membership is a full team roster — every joined member is contact-visible to other signed-in users, not just a single lead |
| 2026-07-09 | Contact info is opt-in per membership (`project_members.contact_info`, filled in at join time, blank = hidden), not pulled from `users.email` |

---

**Index:** [DOGS_Dev_Plans_Index.md](./DOGS_Dev_Plans_Index.md)
