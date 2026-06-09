#!/usr/bin/env bash
# Create a local venv and install dogs-schemas + dogs-api (standalone dev).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -d .venv ]]; then
  python3 -m venv .venv
  echo "Created .venv"
fi

# shellcheck disable=SC1091
source .venv/bin/activate

pip install --upgrade pip
pip install -e packages/schemas
pip install -e api

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

echo ""
echo "Venv ready. Activate with:  source .venv/bin/activate"
echo "Start Postgres:             docker compose up -d db"
echo "Run migrations:             cd api && alembic upgrade head"
echo "Start API:                  cd api && uvicorn app.main:app --reload --port 8080"
echo "Export OpenAPI (no DB):     python scripts/export_openapi.py"
