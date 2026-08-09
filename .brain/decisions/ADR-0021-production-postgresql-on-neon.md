# ADR-0021: Host Production PostgreSQL On Neon

- Status: Accepted
- Date: 2026-08-04

## Context

SchoolClerk uses Prisma and Better Auth against application-owned PostgreSQL
tables. It does not depend on Supabase Auth, Storage, Realtime, GraphQL, or Vault
at runtime. Production therefore needs a managed PostgreSQL provider, rather
than the wider Supabase platform surface.

The existing Supabase project exposed the application data in `public` and
Supabase-managed resources in separate schemas. The target Neon project was an
empty PostgreSQL 17 database and supplied both pooled and direct connection
endpoints.

## Decision

- Host the production application database on Neon PostgreSQL.
- Use Neon's pooled connection URL for Vercel, Trigger.dev, and normal Prisma
  runtime traffic.
- Use Neon's direct connection URL only for administrative operations that need
  session semantics, including restore and database-level validation.
- Treat `public` as the application-owned migration boundary. Do not copy
  Supabase-managed schemas or provider extensions unless a future feature
  explicitly adopts them.
- Keep the former Supabase database available for a bounded rollback window and
  reconcile post-cutover Neon writes before any rollback.

## Consequences

- The application retains its existing Prisma schema and Better Auth model; no
  application code or Prisma migration is required for this provider change.
- Production environment management must preserve the distinction between
  pooled runtime URLs and direct administrative URLs.
- Supabase-specific platform capabilities are not implicitly available from the
  production database. Any future adoption requires a separate architectural
  decision and migration plan.
- Provider migrations must validate active schema definitions and data content;
  physical PostgreSQL column ordinals may legitimately differ after restoring a
  schema that previously contained dropped columns.

## Alternatives Considered

- Keep Supabase as the production PostgreSQL host. Rejected because the runtime
  uses only managed PostgreSQL and the requested target is Neon.
- Copy every Supabase schema and extension. Rejected because those resources are
  provider-owned, unused by SchoolClerk, and not portable as application data.
- Use continuous logical replication for cutover. Attempted but unavailable
  because the Supabase direct endpoint was IPv6-only and unreachable from the
  Neon subscriber; a checksum-validated short cutover was used instead.
