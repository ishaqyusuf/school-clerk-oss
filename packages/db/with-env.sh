#!/bin/sh

set -eu

ROOT_ENV_LOCAL="../../.env.local"
ROOT_ENV="../../.env"

if [ -f "$ROOT_ENV_LOCAL" ]; then
  set -a
  . "$ROOT_ENV_LOCAL"
  set +a
elif [ -f "$ROOT_ENV" ]; then
  set -a
  . "$ROOT_ENV"
  set +a
fi

exec "$@"
