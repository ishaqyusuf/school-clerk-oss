#!/bin/sh

set -eu

exec bun ../../../local-infra-kit/bin/with-env.ts --profile school-clerk --mode local -- "$@"
