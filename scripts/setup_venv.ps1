# Create a local venv and install dogs-schemas + dogs-api (standalone dev).
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Set-Location $Root

if (-not (Test-Path ".venv")) {
    python -m venv .venv
    Write-Host "Created .venv"
}

& .\.venv\Scripts\Activate.ps1

python -m pip install --upgrade pip
python -m pip install -e packages\schemas
python -m pip install -e api

if (-not (Test-Path ".env")) {
    Copy-Item .env.example .env
    Write-Host "Created .env from .env.example"
}

Write-Host ""
Write-Host "Venv ready. Activate with:  .\.venv\Scripts\Activate.ps1"
Write-Host "Start Postgres:             docker compose up -d db"
Write-Host "Run migrations:             cd api; alembic upgrade head"
Write-Host "Start API:                  cd api; uvicorn app.main:app --reload --port 8080"
Write-Host "Export OpenAPI (no DB):     python scripts\export_openapi.py"
