#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SQL_FILE="$ROOT_DIR/db/schema-update.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo "Migration file not found: $SQL_FILE"
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set. Set it to your Postgres connection string and retry."
  exit 1
fi

echo "Applying DB migration: $SQL_FILE"
psql "$DATABASE_URL" -f "$SQL_FILE"
echo "Migration applied."
