# DOGS

**Data Organization for Good and Sharing** — canonical shared data platform for the social-good ecosystem.

Phase 1 provides:

- FastAPI service (`api/`) with Directory of Good CRUD + Google Sheet sync
- PostgreSQL `dogs` schema (same Cloud SQL instance as CAN in production)
- React frontend (`web/`) for capturing, submitting, reviewing, and showcasing Directory of Good entries

## Local development (standalone)

Same pattern as `collective_action_backend`: Postgres in Docker, API via venv or Docker Compose.

### 1. One-time setup

```powershell
cd C:\Users\taylo\OneDrive\Desktop\projects\DOGS

# Venv + install package + copy .env
.\scripts\setup_venv.ps1

# Or manually:
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e api
copy .env.example .env
```

### 2. Start Postgres

```powershell
docker compose up -d db
```

Uses its own database (`dogs_db`) on host port **5433** (avoids conflict with CAN on 5432) — no CAN required.

### 3. Migrate and run API

```powershell
.\.venv\Scripts\Activate.ps1
cd api
alembic upgrade head
uvicorn app.main:app --reload --port 8080
```

- Docs: http://localhost:8080/docs
- OpenAPI: http://localhost:8080/openapi.json

### OpenAPI only (no Postgres)

```powershell
.\.venv\Scripts\Activate.ps1
python scripts\export_openapi.py
# → openapi/dogs-api.json
```

### Full stack in Docker

```powershell
copy .env.example .env
docker compose up --build
```

API on http://localhost:8080 — migrations run automatically on container start.

## Frontend (`web/`)

A Vite + React + TypeScript + Tailwind app that talks directly to the API (CORS is wide open). It has no auth — `/capture` and `/review` are unlisted routes meant for local, personal use only.

```powershell
cd web
npm install
npm run dev
```

Runs on http://localhost:5173 by default, pointed at `http://localhost:8080`. Override with a `VITE_API_BASE_URL` env var if the API runs elsewhere.

| Route | Purpose |
|-------|---------|
| `/` | Showcase — public grid of published entries, filterable by category |
| `/submit` | Public form for others to submit themselves/their group (saved as `pending`) |
| `/capture` | Unlisted — paste a social/website link, auto-fill via `/directory/extract`, fill gaps, publish directly |
| `/review` | Unlisted — queue of `pending` submissions awaiting verification |
| `/review/:id` | Unlisted — fill in gaps on a pending submission, then publish |
| `/review/photos` | Unlisted — entries whose photo is still an external link; re-host it or upload a new one |

### Photo uploads

Entry photos are re-hosted to Google Cloud Storage rather than linked externally, so they don't break if the source page changes. Set `GCS_DIRECTORY_IMAGES_BUCKET` and `GCS_PROJECT_ID` in `.env` to enable uploads; with them unset, photo upload routes are disabled and entries keep their external `image_url` as-is.

## Import data

```powershell
# CSV (local dev)
python scripts\import_csv.py "path\to\export.csv" --geocode

# Google Sheet (needs creds in .env)
curl -X POST http://localhost:8080/admin/sync-from-sheet
```

Place service account JSON in `creds/` and set `GOOGLE_APPLICATION_CREDENTIALS=creds\your-key.json`.

## Production

Deploy as a separate Cloud Run service on the same GCP project and Cloud SQL instance as CAN. Tables live in the `dogs` schema.

See [DEPLOY.md](./DEPLOY.md) for the GitHub Actions workflow and manual deploy steps.

## Docs

- [Architecture](./DOGS_Architecture_Specification.md)
- [Dev plans index](./DOGS_Dev_Plans_Index.md)
- [Phase 1 plan](./DOGS_Phase1_Dev_Plan.md)

## ER diagram

A Mermaid `erDiagram` of the live schema is generated from the SQLAlchemy
models. View it via the running API at `/erd`, or regenerate the checked-in
copy at [`docs/erd.mmd`](./docs/erd.mmd):

```powershell
.\.venv\Scripts\Activate.ps1
python scripts\generate_erd.py
```

Paste the output into [mermaid.live](https://mermaid.live) to render it.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/categories` | List categories |
| GET | `/directory` | List DOG entries (groups); filter with `?status=pending\|published` and `?category=<slug>` |
| GET | `/directory/{id}` | Get entry |
| POST | `/directory` | Create entry |
| PATCH | `/directory/{id}` | Update entry |
| DELETE | `/directory/{id}` | Delete entry |
| POST | `/directory/photos` | Upload a photo file, returns its hosted URL |
| POST | `/directory/photos/from-url` | Fetch an external image and re-host it, returns its hosted URL |
| GET | `/cleanups` | List cleanups |
| GET | `/cleanups/{id}` | Get cleanup |
| POST | `/cleanups` | Create cleanup |
| PATCH | `/cleanups/{id}` | Update cleanup |
| DELETE | `/cleanups/{id}` | Delete cleanup |
| GET | `/trash-reports` | List trash reports |
| GET | `/trash-reports/{id}` | Get trash report |
| POST | `/trash-reports` | Create trash report |
| PATCH | `/trash-reports/{id}` | Update trash report |
| DELETE | `/trash-reports/{id}` | Delete trash report |
| POST | `/admin/sync-from-sheet` | Sync from Google Sheet |
| GET | `/erd` | Mermaid ER diagram of the live schema |
