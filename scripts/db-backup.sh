#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${ROOT_DIR}/backups/db"

# Load .env.local values if present (without overriding existing environment variables).
if [[ -f "${ROOT_DIR}/.env.local" ]]; then
  while IFS='=' read -r key raw_value; do
    [[ -z "${key}" ]] && continue
    [[ "${key}" =~ ^\s*# ]] && continue
    value="${raw_value:-}"
    value="${value%\"}"
    value="${value#\"}"
    if [[ -z "${!key:-}" ]]; then
      export "${key}=${value}"
    fi
  done < "${ROOT_DIR}/.env.local"
fi

DB_HOST="${DB_HOST:-${PGHOST:-localhost}}"
DB_PORT="${DB_PORT:-${PGPORT:-5432}}"
DB_USER="${DB_USER:-${PGUSER:-postgres}}"
DB_NAME="${DB_NAME:-${PGDATABASE:-equipro}}"

mkdir -p "${BACKUP_DIR}"

STAMP="$(date +%Y%m%d_%H%M%S)"
FILE="${BACKUP_DIR}/${DB_NAME}_${STAMP}.dump"

echo "Creating backup: ${FILE}"
pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -Fc -f "${FILE}"

# Keep backups for 14 days by default. Override with BACKUP_RETENTION_DAYS.
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
find "${BACKUP_DIR}" -type f -name "*.dump" -mtime +"${RETENTION_DAYS}" -delete

echo "Backup finished."