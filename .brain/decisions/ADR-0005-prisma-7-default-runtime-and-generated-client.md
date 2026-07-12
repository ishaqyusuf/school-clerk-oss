# ADR-0005: Prisma 7 Default Runtime and Generated Client

- Status: accepted
- Date: 2026-07-01

## Context
SchoolClerk's admission and document-template work depends heavily on Prisma schema generation, server actions, Next.js builds, and local/remote PostgreSQL access. The project should use Prisma 7 by default instead of keeping Prisma 6 wiring as a lingering compatibility path.

Prisma 7 removes datasource URL configuration from `schema.prisma` and requires runtime access to go through the generated client with an appropriate driver adapter. Supabase-style PostgreSQL URLs may include `sslmode=require`, which the Node PostgreSQL adapter handles differently unless libpq compatibility is requested.

## Decision
Use Prisma 7 as the default ORM runtime for `packages/db`.

- Generate Prisma Client to `packages/db/src/generated/client`.
- Import Prisma types and client from the generated local client path instead of `@prisma/client`.
- Use `@prisma/adapter-pg` for runtime PostgreSQL access.
- Resolve datasource URLs in `packages/db/prisma.config.ts`, preferring `POSTGRES_URL` and falling back to `DATABASE_URL`.
- Normalize PostgreSQL SSL URLs by adding `uselibpqcompat=true` when `sslmode` is `prefer`, `require`, or `verify-ca` and compatibility is not already set.
- Treat `packages/db/src/generated/` as ignored generated output; app-local dashboard and school-site builds must run Prisma generation before `next build`.

## Consequences
### Positive
- Prisma 7 is the single default path for generation, migrations, runtime queries, and Next.js builds.
- Generated client imports are explicit and local to `packages/db`, reducing ambiguity across apps and packages.
- Supabase-style TLS URLs work in production builds and runtime DB access.

### Tradeoffs
- Runtime client construction now requires the PostgreSQL driver adapter.
- JavaScript mirror files must stay aligned with TypeScript source files while both remain in the package.
- Any future package that imports Prisma types directly should import from the generated local client path or a re-export from `@school-clerk/db`.
- Local typechecks on a fresh checkout require `bun run db:generate` first unless the generated client already exists.

## Alternatives Considered
- Keep Prisma 6 as the default until a larger database cleanup.
- Keep importing from `@prisma/client` and rely on package-level generated defaults.
- Disable SSL verification globally for PostgreSQL access.

## Follow-up Actions
- Keep `packages/db/src/generated/client` regenerated after schema changes.
- Remove stale JavaScript mirror files if the package no longer needs checked-in JS output.
- Re-run dashboard and school-site builds after future Prisma upgrades.
