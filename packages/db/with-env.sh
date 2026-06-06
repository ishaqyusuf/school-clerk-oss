#!/bin/sh

set -eu

exec ../../scripts/with-root-env.sh --mode "${SCHOOL_CLERK_ENV_MODE:-local}" "$@"
