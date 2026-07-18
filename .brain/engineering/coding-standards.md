# Coding Standards

## Purpose

Defines implementation standards for consistency, maintainability, and reliability.

## How To Use

- Apply in every PR and refactor.
- Update when conventions evolve.
- Keep rules specific and enforceable.

## Template

## General Standards

- Prefer clear names and small functions.
- Avoid duplicated logic.
- Keep modules cohesive.
- Add tests for non-trivial business logic.

## Reliability Standards

- Validate all external inputs.
- Handle errors explicitly.
- Add logging at critical boundaries.

## Multi-Tenancy Standards

- Enforce tenant context on every data access.
- Avoid cross-tenant joins unless explicitly safe.
- Include tenant-aware tests.

## Product App Standards

- Use `getAuthCookie()` to scope dashboard-side data access to the active school, session, and term.
- Prefer app-relative product routes like `/finance/...`, `/students/...`, and `/academic/...` instead of hardcoding `/dashboard/...`.
- Use shared `@school-clerk/ui` components instead of raw one-off HTML primitives where an approved component already exists.
- Dashboard client components must not import `@api/db/queries/*`, `@school-clerk/db`, or other server/database modules for schemas or helpers. Move browser-safe schemas/helpers into a shared client-safe package and have server modules re-export them when older server imports need compatibility.

## Local QA And Dev Commands

- The root `bun run dev` router, `dev-run` bridge, kill-port discovery, and root-level env command wrapper are owned by `/Users/M1PRO/Documents/code/local-infra-kit`; invoke the toolkit directly from `package.json` with `--profile school-clerk` and keep dev command behavior aligned with the toolkit's standard monorepo contract.
- Standard local infra env files are `.env.local`, `.env.remote.local`, and `.env.prod`; use `DATABASE_URL` as the database URL in each mode instead of adding mode-specific database URL names.
- Database sync uses explicit mode pairs: `bun run db:sync -- -m prod-local`, `bun run db:sync -- -m remote-local`, or `bun run db:sync -- -m prod-remote`; use `--reset` only to reset sync cursors/state for that pair.
- Agents must never start a development server in their current shell. Reuse the already-running stack when available.
- If dev is required and no suitable stack is running, create a new tab in the already-open cmux session and run exactly `jd school-clerk dev --local -f marketing dashboard school-site`. If cmux is unavailable or cannot create the tab, mark the active goal blocked; do not start dev through another terminal or command runner.
- Website QA must use Portless hostnames instead of raw localhost ports:
  - marketing/public site: `https://school-clerk.localhost`
  - tenant dashboard: `https://<tenant>.school-clerk-dashboard.localhost`
  - tenant school site: `https://<tenant>.school-clerk-site.localhost`
- Portless local QA URLs must not include visible proxy ports. A named host with an appended port, including `school-clerk.localhost:1441`, is a broken configuration; stop website QA, fix the Portless bug, and verify the port-free URL before proceeding.
- Raw localhost ports may be inspected only while diagnosing Portless itself; they are not valid website QA URLs and do not allow work to proceed past a broken named host.
- `bun run kill:ports` discovers numeric env variables ending in `_PORT` and ignores names containing `PORTLESS`. Keep every project-owned dev port declared as an individual `*_PORT` env variable instead of adding aggregate kill lists.
- After every Prisma schema/database update, run the repository-required migration workflow, `bun run db:push --local`, and `bun run db:push --prod`; also attempt `bun run db:push --remote`, which aliases the remote-development profile.
- All three DB push profiles must be attempted for Prisma updates. Preserve the repository's destructive-change safeguards, never force data loss without explicit approval, and report any profile that could not be updated.

## Midday Architecture Standards

- Treat `/Users/M1PRO/Documents/code/_kitchen_sink/midday` as the primary implementation reference for pages, tables, modals, sheets, sidebar, forms, onboarding, layouts, tRPC calls, loading states, error states, and caching patterns.
- Match Midday architecture, file naming, component boundaries, and coding patterns for pages, tables, modals, sheets, forms, onboarding, sidebar, sign-out, and shared dashboard components.
- Keep page files thin: compose domain components, preload data where the pattern supports it, and keep mutation/data-table/form logic in focused colocated components.
- Build tables from the Midday table structure:
  - `components/tables/core`
  - `components/tables/<domain>/columns.tsx`
  - `components/tables/<domain>/data-table.tsx`
  - `components/tables/<domain>/table-header.tsx`
  - `components/tables/<domain>/skeleton.tsx`
  - `components/tables/<domain>/empty-states.tsx`
  - `components/tables/<domain>/bottom-bar.tsx` when bulk actions or selected-row state require it
  - `components/tables/<domain>/action-menu.tsx` when row actions require it
- Build sheets from the Midday global sheet structure:
  - `components/sheets/global-sheets.tsx`
  - `components/sheets/global-sheets-provider.tsx`
  - domain-specific sheet files under `components/sheets/...`
- Forms must use Midday validation, field error display, submission state, mutation callbacks, toast/error handling, and cache invalidation patterns.
- Data fetching and mutations must use standard Midday tRPC patterns, including query keys, prefetch/hydration where applicable, invalidation, loading states, error states, and caching behavior.
- Prisma schema changes must be followed by root `bun db:migrate`, `bun run db:push --local`, `bun run db:push --prod`, and an attempted `bun run db:push --remote` when those scripts exist. Do not manually create migration files.
- Use shadcn standard components and composition patterns. Do not directly modify shadcn source components; create project-specific wrapper components when SchoolClerk needs custom behavior.
- Use `/Users/M1PRO/Documents/code/_turbo/gnd` as the reference for the standard notification package system.
- Use `/Users/M1PRO/Documents/code/plot-keys` as the reference for local URL handling, portless/proxy support, and generated links.

## Email Standards

- Build emails on the shared `packages/email/components` foundation and keep that structure aligned with the `midday` reference package under `/Users/M1PRO/Documents/code/_kitchen_sink/midday/packages/email`.
- New email templates should compose `EmailThemeProvider`, `Logo`, `Footer`, and the shared email `Button` instead of redefining layout primitives inline.
- Tenant-facing email subjects should use `formatTenantEmailSubject(...)` so the subject is prefixed with the school name and never falls back to the platform brand.
- Development email delivery must route through `getRecipient(...)`, which sends to `DEV_EMAIL_RECIPIENT` when `NODE_ENV=development`.

## Dashboard Page Standards

- Add `PageTitle` to new dashboard pages.
- Wrap async data surfaces with `ErrorBoundary` and `Suspense`.
- Use `batchPrefetch(...)` for server-side tRPC data preloading on page entry where the page pattern supports it.

## tRPC And Actions

- Keep API reads and writes on the established tRPC/router path unless there is a clear reason to use a server action.
- When server actions are still used from the dashboard, keep them tenant-aware and aligned with the same validation rules as the router layer.

<!-- personal-coding-rules:start -->

## Global Personal Coding Rules

Agents must treat these global coding rule references as non-negotiable:

- `/Users/M1PRO/.me/coding-standards/global.md`
- `/Users/M1PRO/.me/coding-standards/nextjs.md`

Project-specific exceptions require an ADR in `.brain/decisions/` before agents may diverge.
<!-- personal-coding-rules:end -->
