# DOGS — Deployment

DOGS deploys as its **own Cloud Run service**, in the **same GCP project and on the same
Cloud SQL instance** as `collective_action_backend` (CAN). DOGS does not get its own
database or instance — its tables live in the `dogs` schema inside the existing
`postgres` database on the `collective-action-db` instance. The Alembic migration
(`api/alembic/versions/001_initial_schema.py`) creates the schema automatically on
first deploy.

## Automated Deployment with GitHub Actions

Every push to `master` builds the image from `api/Dockerfile` (context = repo root, so it
can pick up `api/`) and deploys to Cloud Run.

1. CI (`.github/workflows/ci.yml`) runs lint/tests on PRs and a Docker smoke test against
   a throwaway Postgres container.
2. Deploy (`.github/workflows/deploy.yml`) runs on push to `master`: build → push to
   Artifact Registry → `gcloud run deploy` → health check.

### Required GitHub secrets (this repo)

Same values as the CAN repo's secrets, since it's the same GCP project:

- `GCP_PROJECT_ID`
- `GCP_SA_KEY` — same service account JSON used by CAN's deploy workflow (already has
  `roles/run.admin`, `roles/cloudsql.client`, `roles/secretmanager.secretAccessor`, etc.)

### Secrets reused from Secret Manager

No new secrets need to be created — DOGS reads the **same** Secret Manager entries CAN
already uses in this project:

- `db_password` → mapped to `DB_PASSWORD` env var
- `GOOGLE_MAPS_GEOCODING_API_KEY` → mapped to `GOOGLE_MAPS_GEOCODING_API_KEY` env var

### What's different from CAN's deploy.yml

| | CAN | DOGS |
|---|---|---|
| Service name | `collective-action-backend` | `dogs-api` |
| Cloud SQL instance | `collective-action-db` | `collective-action-db` (same) |
| Database | `postgres` | `postgres` (same — separated by `dogs` schema, not by DB) |
| Build context | repo root, root `Dockerfile` | repo root, `api/Dockerfile` |
| Sheet sync env vars | n/a | `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SHEETS_SHEET_GID` |

## Manual deploy (if needed)

No new Cloud SQL instance, database, or Secret Manager entries are required — those
already exist for CAN in this project. Just build and deploy the DOGS image:

```bash
gcloud builds submit --tag REGION-docker.pkg.dev/PROJECT_ID/docker-repo/dogs-api -f api/Dockerfile .

gcloud run deploy dogs-api \
  --image REGION-docker.pkg.dev/PROJECT_ID/docker-repo/dogs-api \
  --region us-central1 \
  --add-cloudsql-instances PROJECT_ID:us-central1:collective-action-db \
  --set-env-vars DATABASE_URL="postgresql+psycopg2://postgres@/postgres?host=/cloudsql/PROJECT_ID:us-central1:collective-action-db" \
  --set-secrets DB_PASSWORD=db_password:latest,GOOGLE_MAPS_GEOCODING_API_KEY=GOOGLE_MAPS_GEOCODING_API_KEY:latest
```

### View logs

```bash
gcloud run services logs tail dogs-api --region=us-central1
```

### Verify after first deploy

```bash
curl https://<service-url>/health
curl https://<service-url>/categories   # should return the 6 seeded categories
```

## Troubleshooting

**Service returns 503** — check logs: `gcloud run services logs tail dogs-api --region=us-central1`

**Migration fails on `dogs` schema** — confirm the Cloud Run service account has
`roles/cloudsql.client` and the `--add-cloudsql-instances` flag matches
`PROJECT_ID:REGION:collective-action-db` exactly.

**Wrong tables / collision with CAN** — DOGS tables are schema-qualified
(`dogs.directory_entries`, `dogs.cleanups`, `dogs.trash_reports`); CAN's tables live in
`public` (or `can` once CAN migrates). They should never collide by name in `psql \dt`
output without the schema prefix shown.
