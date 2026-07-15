#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

exec bun "$ROOT_DIR/../local-infra-kit/bin/with-env.ts" --profile school-clerk --mode local -- sh -c 'export PORTLESS_APP_PORT="${PORTLESS_APP_PORT:-${DASHBOARD_PORTLESS_PORT:-1355}}"; export TZ="${TZ:-UTC}"; exec portless school-clerk-dashboard next dev --turbopack'
