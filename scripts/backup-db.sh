#!/usr/bin/env bash
# Back up the Supabase Postgres database to ./backups with a UTC timestamp.
# Requires pg_dump and DATABASE_URL (or SUPABASE_DB_URL).
# Restore: pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" backups/<file>.dump
set -euo pipefail
CONNECTION_STRING="${DATABASE_URL:-${SUPABASE_DB_URL:-}}"
if [[ -z "$CONNECTION_STRING" ]]; then echo "Missing DATABASE_URL (or SUPABASE_DB_URL)." >&2; exit 1; fi
if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump is not installed. Install PostgreSQL client tools, then rerun this script." >&2
  echo "Documented backup command: pg_dump --format=custom --no-owner --file=backups/<UTC-timestamp>.dump \"\$DATABASE_URL\"" >&2
  exit 1
fi
mkdir -p backups
OUTPUT="backups/$(date -u +%Y%m%dT%H%M%SZ).dump"
pg_dump --format=custom --no-owner --file="$OUTPUT" "$CONNECTION_STRING"
echo "Backup created: $OUTPUT"
