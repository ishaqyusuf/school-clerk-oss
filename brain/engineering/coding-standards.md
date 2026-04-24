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
