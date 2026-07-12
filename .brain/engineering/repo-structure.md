# Repository Structure

## Purpose

Documents how the monorepo is organized and where code belongs.

## How To Use

- Update when directories are added, moved, or removed.
- Keep mapping short and practical.
- Link to app/package-level docs when available.

## Top-Level Directories

- `apps/`: application surfaces
- `packages/`: shared/internal packages
- `.brain/`: project documentation and AI collaboration memory

## Known App and Package Layout

- `apps/web`: SaaS landing page (marketing/public website)
- `apps/dashboard`: SaaS application (authenticated product experience)
- `apps/api`: API application surface
- `apps/school-site`: public tenant website runtime for published school website templates
- `packages/auth`: Better Auth configuration and helpers
- `packages/db`: Prisma database package (schema/client/repositories)
- `packages/email`: React Email templates and mail composition
- `packages/jobs`: Trigger.dev background jobs
- `packages/navigation`: shared navigation schema/builders for workspace-aware product navigation
- `packages/notifications`: typed notification definitions and delivery helpers
- `packages/pdf`: PDF generation
- `packages/react-pdf-style`: shared React PDF styling utilities
- `packages/site-nav`: sidebar/navigation UI helpers
- `packages/tsconfig`: shared TypeScript config package
- `packages/ui`: shared UI components
- `packages/utils`: shared utility functions and constants
- `packages/template-registry`: school website template registry, template manifests, preview/editor utilities, and shared website blocks

## PDF Result Template Architecture

- Result PDF templates should live under `packages/pdf/src/result/`.
- Organize result templates by school system first, then by named template design.
- Keep shared types, registries, and font/setup helpers outside individual template files so additional school systems and template variants can be added without rewriting route logic.
- School-specific preference resolution should select from the registry, not import individual template files directly in app routes.

## Dashboard Route Groups

- `(sidebar)/`: authenticated pages mounted inside the tenant dashboard shell
- `(auth)/`: login, forgot-password, reset-password, signout
- `(public)/`: routes that do not require dashboard auth
- `(temp)/`: temporary/dev-only surfaces
- `onboarding/`: create-school and create-academic-session flows

## Required Folder Conventions

- Dashboard pages, tables, modals, sheets, sidebar, forms, onboarding, sign-out, and shared dashboard components should follow Midday folder naming and component boundaries.
- Tables belong under `components/tables/` with shared table primitives in `components/tables/core` and each domain table under `components/tables/<domain>/`.
- Each domain table should use `columns.tsx`, `data-table.tsx`, `table-header.tsx`, `skeleton.tsx`, and `empty-states.tsx`; add `bottom-bar.tsx` for selected-row/bulk-action flows and `action-menu.tsx` for row action menus when needed.
- Sheets belong under `components/sheets/` with `global-sheets.tsx`, `global-sheets-provider.tsx`, and additional domain-specific sheet files under `components/sheets/...`.
- Forms should stay close to the domain surface they serve and follow Midday validation, mutation, field error, loading, and invalidation patterns.
- Project-specific shadcn behavior belongs in wrapper components; do not edit shadcn source components directly.

## Required Route Conventions

- Each Next.js app should include `app/[...slug]/page.tsx` as a catch-all route that redirects to `/` unless a Brain doc records an explicit reason to diverge.
- Apps that use a `src/` directory should apply the same convention at `src/app/[...slug]/page.tsx`.
- Dashboard product routes should remain app-relative (`/finance/...`, `/students/...`, `/academic/...`) and should not hardcode `/dashboard/...` unless the task is specifically about infrastructure routing.
- Local URL handling, portless/proxy support, and generated links should follow the Plot Keys reference project.

## Placement Rules

- App-specific code stays within each app.
- Shared domain logic belongs in packages.
- Shared navigation models and registry builders belong in `packages/navigation`.
- Public website template manifests, preview/editor helpers, and reusable website rendering blocks belong in `packages/template-registry`.
- Cross-cutting docs belong in `.brain/`.
- Service/business logic should be reusable and not tightly coupled to UI frameworks.
