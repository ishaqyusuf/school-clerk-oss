#!/bin/sh

set -eu

exec bun ../../scripts/with-dev-infra.ts -- "$@"
