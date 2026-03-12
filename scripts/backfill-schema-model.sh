#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <site-id>"
  echo
  echo "Runs the site-owner-only schema model backfill for a single site."
  exit 1
fi

SITE_ID="$1"

bunx convex run contentTypes:runSchemaModelBackfill "{\"siteId\":\"${SITE_ID}\"}"
