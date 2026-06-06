#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

if [ "${SCHOOL_CLERK_DB_STARTED:-}" != "1" ]; then
  "$ROOT_DIR/scripts/start-dev-db.sh"
fi

exec "$ROOT_DIR/scripts/with-root-env.sh" --mode local sh -c 'export PORTLESS_APP_PORT="${PORTLESS_APP_PORT:-${DASHBOARD_PORTLESS_PORT:-1355}}"; export TZ="${TZ:-UTC}"; exec portless school-clerk-dashboard next dev --turbopack'
