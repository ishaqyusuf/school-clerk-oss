#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

COMPOSE_FILE="${SCHOOL_CLERK_COMPOSE_FILE:-$ROOT_DIR/docker-compose.yml}"
SERVICE_NAME="${SCHOOL_CLERK_DB_SERVICE:-postgres}"
DB_USER="${SCHOOL_CLERK_DB_USER:-postgres}"
DB_NAME="${SCHOOL_CLERK_DB_NAME:-school_clerk}"
MAX_ATTEMPTS="${SCHOOL_CLERK_DB_WAIT_ATTEMPTS:-30}"
SLEEP_SECONDS="${SCHOOL_CLERK_DB_WAIT_SECONDS:-1}"
DOCKER_MAX_ATTEMPTS="${SCHOOL_CLERK_DOCKER_WAIT_ATTEMPTS:-60}"
DOCKER_SLEEP_SECONDS="${SCHOOL_CLERK_DOCKER_WAIT_SECONDS:-2}"

wait_for_docker() {
  attempt=1
  while [ "$attempt" -le "$DOCKER_MAX_ATTEMPTS" ]; do
    if docker info >/dev/null 2>&1; then
      return 0
    fi

    echo "Waiting for Docker Engine... ($attempt/$DOCKER_MAX_ATTEMPTS)"
    attempt=$((attempt + 1))
    sleep "$DOCKER_SLEEP_SECONDS"
  done

  return 1
}

if ! docker info >/dev/null 2>&1; then
  if [ "$(uname -s)" = "Darwin" ] && command -v open >/dev/null 2>&1; then
    echo "Docker Engine is not reachable. Opening Docker Desktop..."
    open -gj -a Docker || true

    if wait_for_docker; then
      echo "Docker Engine is ready."
    else
      cat >&2 <<'EOF'
Docker Desktop was opened, but Docker Engine did not become reachable in time.

Check that Docker Desktop finished starting, then rerun your command.

Useful checks:
  docker context ls
  docker context use desktop-linux
EOF
      exit 1
    fi
  else
    cat >&2 <<'EOF'
Docker Engine is not reachable.

The local Postgres container needs a running Docker-compatible daemon.

Terminal-first options:
  1. Start Docker Desktop, then rerun your command.
  2. Use Colima instead of Docker Desktop:
       brew install colima docker docker-compose
       colima start
       docker context use colima
       bun run db:start

If Docker Desktop is already running, check your Docker context:
  docker context ls
  docker context use desktop-linux
EOF
    exit 1
  fi
fi

echo "Starting local Postgres container..."
docker compose -f "$COMPOSE_FILE" up -d "$SERVICE_NAME"

attempt=1
while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
  if docker compose -f "$COMPOSE_FILE" exec -T "$SERVICE_NAME" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    echo "Local Postgres is ready."
    exit 0
  fi

  echo "Waiting for local Postgres... ($attempt/$MAX_ATTEMPTS)"
  attempt=$((attempt + 1))
  sleep "$SLEEP_SECONDS"
done

echo "Local Postgres did not become ready in time." >&2
echo "Try: docker compose -f \"$COMPOSE_FILE\" logs \"$SERVICE_NAME\"" >&2
exit 1
