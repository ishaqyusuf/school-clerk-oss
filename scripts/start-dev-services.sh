#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

COMPOSE_FILE="${SCHOOL_CLERK_COMPOSE_FILE:-$ROOT_DIR/docker-compose.yml}"
ENV_FILE="${SCHOOL_CLERK_ENV_FILE:-$ROOT_DIR/.env.local}"
SERVICE_NAME="${SCHOOL_CLERK_DB_SERVICE:-postgres}"
DB_USER="${SCHOOL_CLERK_DB_USER:-postgres}"
DB_NAME="${SCHOOL_CLERK_DB_NAME:-school_clerk}"
MAX_ATTEMPTS="${SCHOOL_CLERK_DB_WAIT_ATTEMPTS:-30}"
SLEEP_SECONDS="${SCHOOL_CLERK_DB_WAIT_SECONDS:-1}"
DOCKER_MAX_ATTEMPTS="${SCHOOL_CLERK_DOCKER_WAIT_ATTEMPTS:-60}"
DOCKER_SLEEP_SECONDS="${SCHOOL_CLERK_DOCKER_WAIT_SECONDS:-2}"
DEFAULT_LOCAL_DATABASE_URL="${LOCAL_DATABASE_URL:-${LOCAL_POSTGRES_URL:-postgresql://postgres:postgres@127.0.0.1:55432/school_clerk}}"

strip_wrapping_quotes() {
  value="$1"
  case "$value" in
    \"*\")
      value=${value#\"}
      value=${value%\"}
      ;;
    \'*\')
      value=${value#\'}
      value=${value%\'}
      ;;
  esac

  printf '%s' "$value"
}

read_env_value() {
  var_name="$1"
  file="$2"

  if [ ! -f "$file" ]; then
    return 0
  fi

  raw_value=$(
    awk -v key="$var_name" '
      $0 ~ "^[[:space:]]*" key "[[:space:]]*=" {
        sub("^[[:space:]]*" key "[[:space:]]*=[[:space:]]*", "")
        sub(/\r$/, "")
        print
        exit
      }
    ' "$file"
  )

  strip_wrapping_quotes "$raw_value"
}

env_or_file_value() {
  var_name="$1"
  env_value="$(printenv "$var_name" 2>/dev/null || true)"

  if [ -n "$env_value" ]; then
    printf '%s' "$env_value"
    return 0
  fi

  read_env_value "$var_name" "$ENV_FILE"
}

first_env_value() {
  for var_name in "$@"; do
    value="$(env_or_file_value "$var_name")"
    if [ -n "$value" ]; then
      printf '%s' "$value"
      return 0
    fi
  done

  return 0
}

database_mode="$(first_env_value SCHOOL_CLERK_DB_MODE)"
database_mode="${database_mode:-auto}"
postgres_start_mode="$(first_env_value SCHOOL_CLERK_START_POSTGRES)"
postgres_start_mode="${postgres_start_mode:-auto}"

url_host() {
  url="$1"

  case "$url" in
    *://*) rest=${url#*://} ;;
    *) return 0 ;;
  esac

  case "$rest" in
    *@*) rest=${rest#*@} ;;
  esac

  host_port=${rest%%/*}
  host_port=${host_port%%\?*}

  case "$host_port" in
    \[*\]*)
      host=${host_port#\[}
      host=${host%%\]*}
      ;;
    *)
      host=${host_port%%:*}
      ;;
  esac

  printf '%s' "$host"
}

is_local_host() {
  case "$1" in
    "" | localhost | 127.0.0.1 | ::1 | 0.0.0.0 | postgres)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

case "$database_mode" in
  local)
    database_url="$(first_env_value LOCAL_DATABASE_URL LOCAL_POSTGRES_URL)"
    database_url="${database_url:-$DEFAULT_LOCAL_DATABASE_URL}"
    ;;
  remote-dev)
    database_url="$(first_env_value REMOTE_DEV_DATABASE_URL DEV_DATABASE_URL DATABASE_URL REMOTE_DEV_POSTGRES_URL DEV_POSTGRES_URL POSTGRES_URL)"
    ;;
  auto | "")
    database_url="$(first_env_value DATABASE_URL POSTGRES_URL)"
    ;;
  *)
    echo "Invalid SCHOOL_CLERK_DB_MODE value: $database_mode" >&2
    echo "Use auto, remote-dev, or local." >&2
    exit 1
    ;;
esac
database_host="$(url_host "$database_url")"

if [ "$database_mode" = "remote-dev" ] && [ -z "$database_url" ]; then
  database_host="remote-dev"
fi

should_start_postgres() {
  case "$postgres_start_mode" in
    1 | true | yes)
      return 0
      ;;
    0 | false | no)
      return 1
      ;;
    auto)
      ;;
    *)
      echo "Invalid SCHOOL_CLERK_START_POSTGRES value: $postgres_start_mode" >&2
      echo "Use auto, 1/true/yes, or 0/false/no." >&2
      exit 1
      ;;
  esac

  is_local_host "$database_host"
}

postgres_skip_message() {
  case "$postgres_start_mode" in
    0 | false | no)
      echo "Skipping local Postgres; SCHOOL_CLERK_START_POSTGRES is disabled."
      ;;
    *)
      if [ "$database_mode" = "remote-dev" ]; then
        echo "Skipping local Postgres; SCHOOL_CLERK_DB_MODE is remote-dev."
      elif [ -n "$database_url" ] && ! is_local_host "$database_host"; then
        echo "Skipping local Postgres; DATABASE_URL points to a non-local host."
      else
        echo "Skipping local Postgres."
      fi
      ;;
  esac
}

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

if ! should_start_postgres; then
  postgres_skip_message
  echo "No local dev services requested."
  exit 0
fi

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

The selected local dev services need a running Docker-compatible daemon.

Terminal-first options:
  1. Start Docker Desktop, then rerun your command.
  2. Use Colima instead of Docker Desktop:
       brew install colima docker docker-compose
       colima start
       docker context use colima
       bun run dev:services:local

If Docker Desktop is already running, check your Docker context:
  docker context ls
  docker context use desktop-linux
EOF
    exit 1
  fi
fi

echo "Starting local dev services: $SERVICE_NAME"
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
