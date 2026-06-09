# DOGS

**Data Organization for Good and Sharing** — canonical shared data platform for the social-good ecosystem.

Phase 1 provides:

- Shared Pydantic schemas (`packages/schemas`)
- FastAPI service (`api/`) with Directory of Good CRUD + Google Sheet sync
- PostgreSQL `dogs` schema (same Cloud SQL instance as CAN)

## Quick start

```bash
# Install schemas + API (from repo root)
pip install -e packages/schemas
pip install -e api

# Configure environment
cp api/.env.example api/.env
# Edit api/.env with your DATABASE_URL and API keys

# Run migrations
cd api
alembic upgrade head

# Start API
uvicorn app.main:app --reload --port 8080
```

API docs: http://localhost:8080/docs

OpenAPI spec (all shared models, including Cleanup / TrashReport): http://localhost:8080/openapi.json

```bash
# Export a static copy for TypeScript codegen in other apps
python scripts/export_openapi.py
# → openapi/dogs-schemas.json
```

## Import from CSV (local dev)

```bash
pip install -e packages/schemas -e api
python scripts/import_csv.py "path/to/export.csv" --geocode
```

## Sync from Google Sheet

```bash
curl -X POST http://localhost:8080/admin/sync-from-sheet
```

Share the sheet with your GCP service account and set `GOOGLE_APPLICATION_CREDENTIALS` or use ADC on Cloud Run.

## Docker

```bash
docker build -f api/Dockerfile -t dogs-api .
docker run -p 8080:8080 --env-file api/.env dogs-api
```

## Docs

- [Architecture](./DOGS_Architecture_Specification.md)
- [Dev plans index](./DOGS_Dev_Plans_Index.md)
- [Phase 1 plan](./DOGS_Phase1_Dev_Plan.md)

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/categories` | List categories |
| GET | `/directory` | List DOG entries |
| GET | `/directory/{id}` | Get entry |
| POST | `/directory` | Create entry |
| PATCH | `/directory/{id}` | Update entry |
| DELETE | `/directory/{id}` | Delete entry |
| POST | `/admin/sync-from-sheet` | Sync from Google Sheet |
