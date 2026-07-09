# DOGS Auth — Development Plan

**Prerequisites:** DOGS API deployed on Cloud Run, sharing the `collective-action-db` Cloud SQL
instance with CAN (per [DEPLOY.md](./DEPLOY.md)). Projects feature live (`Project.user_ids` /
`edit_token` in place as the current, unauthenticated ownership mechanism).

**Goal:** Stand up real, server-verified login as a foundation for future features — **not** to
gate anything today. The app stays fully usable while signed out; this pass only wires up Firebase
Auth on the frontend, ID token verification on the backend, and a local `users` table, so later
work (favorites, "my submissions," moderation, etc.) has something to build on.

This is a parallel initiative, not a numbered phase in the
[Phase 1–5 track](./DOGS_Dev_Plans_Index.md) — it can proceed independently, but it **supersedes**
the "API key" MVP sketched in [Phase 2, Milestone 2](./DOGS_Phase2_Dev_Plan.md#milestone-2--api-auth)
and pulls forward the Firebase middleware item earmarked for
[Phase 3](./DOGS_Phase3_Dev_Plan.md).

---

## Why not copy CAN's auth

`collective_action_backend`'s `User` model has a `firebase_user_id` column, but nothing in that
backend verifies it — routes accept whatever `firebase_user_id` a client sends in the request
body, with zero cryptographic check against Firebase's signed ID token. It's a naming convention,
not auth: any caller can act as any user by supplying their UID string. DOGS should do the flow
Firebase Auth is meant to enable: client obtains a signed ID token from Firebase, sends it as
`Authorization: Bearer <idToken>`, and the **backend verifies the signature** via `firebase-admin`
before trusting the identity inside it.

---

## Outcomes

- Frontend authenticates users via Firebase Auth (JS SDK), reusing **CAN's existing Firebase
  project** (`collective-action-fd893`) so the two apps share one user pool/login system.
- Backend verifies every request that carries a token via `firebase-admin` — no client-asserted
  identity is ever trusted — but **no existing route starts requiring a token in this pass**.
- New `users` table in the `dogs` schema, keyed by verified Firebase UID, holding profile data and
  an `admin` flag. Populated lazily the first time a signed-in user hits the backend.
- Nothing about the current unauthenticated experience changes: `edit_token`-based capture/edit,
  public writes on `/directory` and `/projects`, and all `GET` routes work exactly as they do
  today, logged in or not.
- What this pass actually buys: a working sign-in/sign-out flow in the UI, a verified identity
  available to any route that opts in (`Depends(get_current_user)`), and `Project.user_ids`
  stamped with the real UID when a signed-in user creates something — laying groundwork for
  ownership-gated features later without building them now.

---

## Data model

### `users` table (new)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `firebase_uid` | string, unique, indexed | subject claim from the verified ID token — the actual trust anchor |
| `email` | string, unique, indexed | from the verified token, not client input |
| `name` | string, nullable | |
| `photo_url` | text, nullable | |
| `admin` | bool, default `false` | set manually (DB/console) — no self-service admin escalation |
| `created_at` / `updated_at` | timestamptz | |

Created lazily on first verified request (`get_or_create_user`), not via a signup endpoint —
Firebase already owns signup/login.

### Ownership, for later

`Project.user_ids` / `DirectoryEntry` equivalent already store a JSON list of identifier strings.
This pass starts appending the real `firebase_uid` to that list when a signed-in user creates
something (see Milestone 3) — but nothing reads it back to gate edit/delete yet. That check
(`current_user.firebase_uid in entry.user_ids` or `current_user.admin`) is future work once a
feature actually needs it.

---

## Milestone 1 — Backend: Firebase Admin SDK + token verification

**Deliverable:** A FastAPI dependency that verifies a bearer token and yields the authenticated
`User`, with no route wiring yet.

- [x] Add `firebase-admin` to `api/pyproject.toml`
- [x] Reuse CAN's Firebase project — `collective-action-fd893` (from
      `collective_action_frontend/lib/firebase_options.dart`). Firebase projects are GCP projects,
      so this is very likely the same GCP project already running DOGS's Cloud Run
      service/Cloud SQL instance; confirm against the `GCP_PROJECT_ID` GitHub secret before
      deploying. Same project ⇒ same Firebase Auth user pool ⇒ a user who logs into CAN and DOGS
      is the same account in both, which is what makes shared sign-in possible later.
- [x] Initialize the Admin SDK with Application Default Credentials — on Cloud Run this is free
      (the service account is already available); for local dev, reuse the existing
      `GOOGLE_APPLICATION_CREDENTIALS` service-account JSON already wired in `config.py`
- [x] `app/services/auth.py`:
  - [x] `verify_id_token(token: str) -> dict` — wraps `firebase_admin.auth.verify_id_token`, raises
        on invalid/expired/malformed tokens
- [x] FastAPI dependency `get_current_user(db, credentials=Depends(HTTPBearer))`:
  - [x] Verify token → decoded claims (`uid`, `email`, `name`, `picture`)
  - [x] `get_or_create_user(db, claims)` → local `User` row
  - [x] 401 on missing/invalid/expired token
- [x] `require_admin(user=Depends(get_current_user))` — 403 if `not user.admin`; built now so it's
      ready to use, but not attached to any route until a follow-up pass decides it's needed

---

## Milestone 2 — `users` table

**Deliverable:** `users` table exists; current-user profile endpoints work end-to-end.

- [x] Alembic migration: `users` table in `dogs` schema
- [x] `app/models/user.py`
- [x] `app/schemas/user.py` — `User` (read), `UserUpdate` (self-service: `name`, `photo_url` only —
      `admin` and `firebase_uid` are never client-settable)
- [x] `app/services/user_service.py` — `get_or_create_user`, `update_user`
- [x] `GET /users/me` — current user profile (requires auth)
- [x] `PATCH /users/me` — update own profile

---

## Milestone 3 — Optional identity attachment (no enforcement yet)

**Deliverable:** Signed-in state is available and recorded where useful; nothing becomes harder to
use logged out. `require_admin`/ownership *enforcement* is deliberately deferred to a later pass —
see "Out of scope" below.

- [x] Add an **optional** auth dependency (`get_current_user_optional`) that returns the verified
      `User` if a valid token is present, or `None` if there's no `Authorization` header —
      distinct from `get_current_user`, which 401s on a missing/invalid token
- [x] `POST /directory`, `POST /projects`: if a valid token is present, stamp the creator's local
      `User.id` into `user_ids` alongside/instead of the anonymous `edit_token` flow; if not,
      behave exactly as today. **Deviation from this doc's original wording**: `user_ids` is
      typed `list[UUID]` on both `Project` and `DirectoryEntry`, and `firebase_uid` is an opaque
      string, not a UUID — stamping it directly would break the existing schema/migration. Instead
      `stamp_creator()` appends the local `users.id` (UUID), which is 1:1 with `firebase_uid` via
      `get_or_create_user`. See decisions log.
- [x] `GET /users/me`: still requires a real token (401 if signed out) — this is the one route
      that only makes sense authenticated
- [x] No route gets a hard `401`/`403` for being logged out. `edit_token`-based capture/edit is
      completely unaffected
- [x] Document the optional-auth pattern in OpenAPI so it's clear which routes accept but don't
      require a token (docstrings on `create_project`/`create_directory_entry`, surfaced in
      `/docs`)

---

## Milestone 4 — Secrets & deploy

- [x] Using Application Default Credentials — no new Secret Manager entry needed. `initialize_app()`
      is called with no explicit credential, so it resolves lazily via ADC; on Cloud Run this is
      free (the existing service account is already available), and verification itself only needs
      to fetch Google's public keys (no special IAM role required)
- [x] Distinct Firebase project/service account path not used — N/A, ADC is sufficient
- [x] [DEPLOY.md](./DEPLOY.md) unchanged — no new IAM roles or env vars introduced
- [x] No changes needed to `.github/workflows/deploy.yml` — ADC covers it

---

## Milestone 5 — Frontend (`web/`)

- [x] Add `firebase` npm package
- [x] `web/src/lib/firebase.ts` — initialize app from `VITE_FIREBASE_*` env vars, pointing at
      `collective-action-fd893` (register a new **Web App** within that same Firebase project for
      DOGS's own domain/appId — same project/user pool, distinct app config from CAN's web app).
      **Deviation**: the SDK is only initialized if `apiKey`/`appId` are actually present
      (`firebaseEnabled` flag); with no `web/.env` configured, `auth` stays `null` instead of
      throwing `auth/invalid-api-key` during module evaluation, which previously crashed the whole
      React tree before it could mount. See decisions log.
- [x] Auth context/hook (`useAuth`) — current user, `signIn`, `signOut`, current ID token (split
      across `lib/authContext.ts` + `components/AuthProvider.tsx` + `hooks/useAuth.ts` to satisfy
      Vite's fast-refresh lint rule)
- [x] Login UI — small, unobtrusive header button (`components/LoginButton.tsx`, avatar/initial when
      signed in); renders nothing when Firebase isn't configured rather than a dead button
- [x] `web/src/api/client.ts` (`request()`, `requestForm()`) — attach
      `Authorization: Bearer <idToken>` header when a user is signed in, omit it otherwise (every
      existing call keeps working unauthenticated)
- [x] No UI gating in this pass — every page/action stays reachable logged out; verified via a real
      browser check (Playwright) against the dev server with no Firebase config present — full page
      renders (`Showcase` nav present, no page errors)

---

## Environment variables (new)

Backend (only if not using Application Default Credentials):
```
FIREBASE_PROJECT_ID=...
```

Frontend:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

---

## Success criteria

- [x] Every page and write action works exactly as it does today for a signed-out user — zero
      regressions to the current unauthenticated experience (verified in a real browser with no
      Firebase config present)
- [ ] A user can sign in / sign out in the UI — real config now in place (`web/.env`, DOGS's own
      Web App within `collective-action-fd893`); verified via browser automation that clicking
      "Sign in" opens the real Firebase Google OAuth popup with the correct `apiKey`/`appId` and no
      errors. Completing an actual Google login needs a human with real credentials — not yet done
- [ ] A signed-in request with a valid Firebase ID token verifies successfully server-side and
      creates/loads the local `users` row on first call
- [ ] A request with an invalid/expired/tampered token on an optional-auth route is treated the
      same as signed-out (not a hard error), except on the one route that requires auth
      (`GET /users/me`), which `401`s as expected
- [x] `Project.user_ids` picks up the signed-in creator's local `users.id` (UUID, 1:1 with their
      verified `firebase_uid`) when they create an entry

---

## Out of scope (this pass)

- **Enforcing** auth/ownership on any route — `require_admin`, ownership-gated `PATCH`/`DELETE`,
  and locking `/admin/*` behind login are all deferred to a follow-up pass once there's an actual
  feature that needs them
- Full Admin Portal UI (Phase 3 — separate, larger effort)
- Role/permission system beyond a binary `admin` flag
- Cross-app SSO UX (shared session across DOGS/CAN/Impetus) — the shared Firebase project makes it
  *possible* later, but no cross-app session handling is built here
- Custom email verification / password reset flows (Firebase's own SDK/UI handles these)

---

## Decisions log

| Date | Decision |
|------|----------|
| 2026-07-09 | Chose Firebase Auth with server-side ID token verification over a self-contained JWT/password system |
| 2026-07-09 | Adding a local `users` table now (not deferring to Phase 3) for profile/admin-role data, rather than working off a bare UID |
| 2026-07-09 | Reuse CAN's Firebase project (`collective-action-fd893`, confirmed via `collective_action_frontend/lib/firebase_options.dart`) rather than a separate one, so both apps share one Auth user pool |
| 2026-07-09 | This pass is additive only — the app must remain fully usable signed out. No route starts requiring auth; enforcement (ownership checks, admin gating) is explicitly deferred to a later pass |
| 2026-07-09 | Milestones 1–3 implemented and verified (app boots, migration applies/downgrades cleanly, anonymous project/directory creation unaffected, `/users/me` 401s correctly signed out). `stamp_creator()` appends the local `users.id` (UUID) to `user_ids` rather than the raw `firebase_uid` string, since `user_ids` is typed `list[UUID]` on both `Project` and `DirectoryEntry` — changing that type was out of scope for this pass |
| 2026-07-09 | User chose to register a dedicated new Firebase Web App for DOGS within `collective-action-fd893`, rather than reusing CAN's web app config as-is — kept `apiKey`/`appId` blank in `web/.env.example` pending that registration |
| 2026-07-09 | Found and fixed a real regression during frontend verification: `initializeApp`/`getAuth` threw `auth/invalid-api-key` synchronously when `VITE_FIREBASE_*` env vars were unset (the state of any fresh clone, or this repo until the user finishes Web App registration), which crashed the entire React tree before first render — not just the login button. Fixed by gating SDK init behind a `firebaseEnabled` check (`lib/firebase.ts`); `auth` is `null` when unconfigured, `AuthProvider`/`client.ts`/`LoginButton` all treat that as "signed out, no login available" rather than throwing. Confirmed via a real Playwright browser check that the full app renders with no Firebase config present |
| 2026-07-09 | User registered DOGS's dedicated Web App in Firebase Console (within `collective-action-fd893`) and supplied real config, populated into `web/.env` (gitignored). Verified with both servers running: app renders with zero errors, `Sign in` button opens the real Google OAuth popup at the correct Firebase auth handler URL with no errors. Actual login completion needs a human with real Google credentials |

---

**Related:** [DOGS_Phase2_Dev_Plan.md](./DOGS_Phase2_Dev_Plan.md) (API auth milestone, superseded by
this doc) · [DOGS_Phase3_Dev_Plan.md](./DOGS_Phase3_Dev_Plan.md) (Admin Portal, still depends on
this doc's token verification middleware)
