FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY packages/schemas /app/packages/schemas
COPY api /app/api

RUN pip install --no-cache-dir -e /app/packages/schemas \
    && pip install --no-cache-dir /app/api

WORKDIR /app/api

ENV PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
