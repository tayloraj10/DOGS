FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY packages/schemas /app/packages/schemas
COPY api /app/api

RUN pip install --no-cache-dir -e /app/packages/schemas \
    && pip install --no-cache-dir -e /app/api

WORKDIR /app/api

EXPOSE 8080

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
