#!/usr/bin/env bash

set -euo pipefail

SITE_ID="${1:-}"
MIGRATION_NAME="${2:-}"

if [[ -z "${SITE_ID}" || -z "${MIGRATION_NAME}" ]]; then
  echo "Usage: scripts/run-template-migration.sh <site-id> <migration-name>" >&2
  exit 1
fi

bunx convex run contentTypes:runTemplateMigration "{\"siteId\":\"${SITE_ID}\",\"migrationName\":\"${MIGRATION_NAME}\"}"
