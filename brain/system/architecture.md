# Architecture

## Purpose
Tracks architectural patterns, boundaries, and major design choices.

## How To Use
- Update on major platform decisions.
- Keep diagrams/flow text current.
- Link ADRs for rationale.

## Current Pattern
- Architecture style: Layered monorepo SaaS architecture
- Tenant isolation approach: Tenant-scoped application model (implementation detail TODO: row-level vs schema-level)
- API style: Type-safe RPC via tRPC routers
- Product behavior model: Configuration-driven per tenant (institution type + enabled modules + academic hierarchy)

## Reference Inspiration
- The Midday reference at `/Users/M1PRO/Documents/code/_kitchen_sink/midday` should inform architectural direction and performance-sensitive implementation choices.
- Reuse its proven thinking around module boundaries, file/folder structure, page composition, analytics instrumentation, widget organization, trackers, and observability-oriented UI patterns where they fit SchoolClerk.
- Treat departures from those patterns as deliberate decisions that should have clear product, domain, or technical justification.

## Architecture Layers
- UI Layer: Next.js App Router apps for landing and dashboard experiences
- API Layer: tRPC routers
- Business Logic Layer: Service modules
- Data Access Layer: Prisma repositories on PostgreSQL

## Data Layer Details
- Prisma schema is modularized under `packages/db/src/schema/*.prisma`.
- Domain modules include account, school, student, classroom, staff, assessment, finance, activity, and guardian schemas.
- Current state includes a mixed model set: active PascalCase models and legacy lowercase models in `schema.prisma`.
- Repository and service layers must treat `schoolProfileId` (and school/session ancestry) as tenant boundary keys.

## Configuration and Academic Structure Engine
- Each tenant stores an `institutionType` configuration value:
  - `PRESCHOOL`
  - `PRIMARY`
  - `SECONDARY`
  - `COLLEGE`
  - `POLYTECHNIC`
  - `UNIVERSITY`
  - `TRAINING_CENTER`
  - `RELIGIOUS_SCHOOL`
- Module availability is resolved from tenant configuration and feature flags.
- Academic hierarchy must support:
  - Academic Session
  - Term or Semester
  - Level or Class
  - Department (optional)
  - Program (optional)
- Services should operate on abstract academic nodes so institution-specific shapes can vary without UI/API rewrites.

## Runtime Topology
- `apps/web`: SaaS landing page (public marketing site)
- `apps/dashboard`: SaaS application (authenticated product app)
- `apps/api`: API application surface
- `apps/school-site`: tenant-resolved public school website runtime backed by published template configurations
- `packages/navigation`: shared navigation schema and registry-to-sidebar adapter layer
- `packages/api`: shared tRPC routers/contracts
- `packages/db`: Prisma schema/client and data access utilities
- `packages/ui`: shared UI components
- `packages/template-registry`: website template registry, manifests, preview/editor engine, shared website blocks, hooks, guards, and production/preview render utilities

## Data Flow
1. Tenant user authenticates
2. Tenant context loads institution type, module toggles, and academic structure rules
3. UI calls tRPC router procedures
4. Router delegates to service layer for business rules
5. Service validates module availability and applies hierarchy rules
6. Service calls Prisma repositories with tenant constraints
7. PostgreSQL persists and returns tenant-scoped data
8. Auditable response returned to client

## Public Website Template Platform
- School public websites are configuration-driven per tenant rather than hardcoded per institution.
- Each tenant may own multiple website template configurations, but only one configuration is published at a time.
- `packages/template-registry` defines:
  - template manifests and registry metadata
  - shared shadcn-based website primitives and reusable website blocks
  - preview/editor mode helpers, click guards, and editable field boundaries
  - resolvers that switch between preview/demo data and live tenant production data
- `apps/school-site` is responsible for:
  - resolving tenant identity by domain or subdomain
  - loading the published website configuration
  - resolving the correct template renderer
  - merging saved content, theme config, section visibility, SEO settings, and live tenant resources
  - rendering the public website and its nested pages

## Template Rendering Modes
- Preview/editor mode:
  - used during registry browsing, template selection, inline editing, and draft review
  - renders production-like pages using safe preview data plus selected tenant-aware resources where allowed
  - applies navigation and click guards to prevent accidental exit while editing
- Production mode:
  - used by `apps/school-site` for the public tenant website
  - resolves live tenant data directly and renders only the published configuration
  - must remain isolated from draft edits and editor-only affordances

## Design System Rule
- The website template platform uses a shared shadcn-based design foundation.
- Templates are presentation layers composed from shared primitives and website blocks, not isolated design systems.
- Template-specific identity should come from composition, theming, typography, spacing, and section presentation while preserving shared accessibility and editor compatibility.

## Cross-Cutting Concerns
- Security and authorization
- Observability and logging
- Performance and scaling
- Data privacy and isolation
- Navigation should be configuration-driven by workspace, institution type, and enabled modules rather than hardcoded per page tree.

## Related ADRs
- [ADR-0001: Baseline System Stack and Layered Architecture](/Users/M1PRO/Documents/code/school-clerk/brain/decisions/ADR-0001-baseline-system-stack-and-layered-architecture.md)
- [ADR-0002: Multi-Institution Configurable Module Architecture](/Users/M1PRO/Documents/code/school-clerk/brain/decisions/ADR-0002-multi-institution-configurable-module-architecture.md)
