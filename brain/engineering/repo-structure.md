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

## Dashboard Route Groups
- `(sidebar)/`: authenticated pages mounted inside the tenant dashboard shell
- `(auth)/`: login, forgot-password, reset-password, signout
- `(public)/`: routes that do not require dashboard auth
- `(temp)/`: temporary/dev-only surfaces
- `onboarding/`: create-school and create-academic-session flows

## Placement Rules
- App-specific code stays within each app.
- Shared domain logic belongs in packages.
- Shared navigation models and registry builders belong in `packages/navigation`.
- Public website template manifests, preview/editor helpers, and reusable website rendering blocks belong in `packages/template-registry`.
- Cross-cutting docs belong in `brain/`.
- Service/business logic should be reusable and not tightly coupled to UI frameworks.
