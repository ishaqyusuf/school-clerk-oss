# ADR-0019: Environment-Authoritative Local Database Contract

- Status: accepted
- Date: 2026-07-28

## Context

The shared local infrastructure previously assumed that every PostgreSQL
project used host port `55432` and could generate a default connection URL.
That made concurrent projects conflict and duplicated connection details
between env files, scripts, and Compose files.

## Decision

- `.env.local` `DATABASE_URL` is the sole source of truth for the local
  PostgreSQL connection.
- `local-infra-kit` parses the URL and passes its port, database name, user, and
  password to Docker Compose only for the startup process.
- School Clerk keeps its existing local host port `55432`.
- Missing `DATABASE_URL` fails closed. Scripts, sync utilities, and the toolkit
  do not generate fallback URLs or read mode-specific URL aliases.
- GND's separate MySQL and Redis contract is outside this decision.

## Consequences

- School Clerk can run beside projects that choose different PostgreSQL host
  ports.
- One edit in `.env.local` changes the complete local connection contract.
- Compose configuration has no project-port default and cannot silently bind
  an unintended port.
