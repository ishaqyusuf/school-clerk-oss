#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

if [ -f "$ROOT_DIR/.env.local" ]; then
  set -a
  . "$ROOT_DIR/.env.local"
  set +a
elif [ -f "$ROOT_DIR/.env" ]; then
  set -a
  . "$ROOT_DIR/.env"
  set +a
fi

export PORTLESS_APP_PORT="${PORTLESS_APP_PORT:-${DASHBOARD_PORTLESS_PORT:-1355}}"
export TZ="${TZ:-UTC}"

exec portless school-clerk-dashboard next dev --turbopack
