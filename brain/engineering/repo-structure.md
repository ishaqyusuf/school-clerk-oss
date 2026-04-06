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
- `brain/`: project documentation and AI collaboration memory

## Known App and Package Layout
- `apps/web`: SaaS landing page (marketing/public website)
- `apps/dashboard`: SaaS application (authenticated product experience)
- `apps/api`: API application surface
- `packages/db`: Prisma database package (schema/client/repositories) 
- `packages/navigation`: shared navigation schema/builders for workspace-aware product navigation
- `packages/ui`: shared UI components

## Placement Rules
- App-specific code stays within each app.
- Shared domain logic belongs in packages.
- Shared navigation models and registry builders belong in `packages/navigation`.
- Cross-cutting docs belong in `brain/`.
- Service/business logic should be reusable and not tightly coupled to UI frameworks.
