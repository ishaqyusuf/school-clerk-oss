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
- Use shadcn standard components and composition patterns. Do not directly modify shadcn source components; create project-specific wrapper components when SchoolClerk needs custom behavior.
- Use `/Users/M1PRO/Documents/code/_turbo/gnd` as the reference for the standard notification package system.
- Use `/Users/M1PRO/Documents/code/plot-keys` as the reference for local URL handling, portless/proxy support, and generated links.

## Email Standards
- Build emails on the shared `packages/email/components` foundation and keep that structure aligned with the `midday` reference package under `/Users/M1PRO/Documents/code/_kitchen_sink/midday/packages/email`.
- New email templates should compose `EmailThemeProvider`, `Logo`, `Footer`, and the shared email `Button` instead of redefining layout primitives inline.

## Dashboard Page Standards
- Add `PageTitle` to new dashboard pages.
- Wrap async data surfaces with `ErrorBoundary` and `Suspense`.
- Use `batchPrefetch(...)` for server-side tRPC data preloading on page entry where the page pattern supports it.

## tRPC And Actions
- Keep API reads and writes on the established tRPC/router path unless there is a clear reason to use a server action.
- When server actions are still used from the dashboard, keep them tenant-aware and aligned with the same validation rules as the router layer.
