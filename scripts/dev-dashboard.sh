#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

exec bun "$ROOT_DIR/../local-infra-kit/bin/with-env.ts" --profile school-clerk --mode local -- sh -c 'export PORTLESS_WILDCARD="${PORTLESS_WILDCARD:-1}"; export PORTLESS_PORT="${SCHOOL_CLERK_PORTLESS_PROXY_PORT:-443}"; export PORTLESS_APP_PORT="${PORTLESS_APP_PORT:-${DASHBOARD_PORT:-2200}}"; export TZ="${TZ:-UTC}"; exec portless school-clerk-dashboard next dev --turbopack'
