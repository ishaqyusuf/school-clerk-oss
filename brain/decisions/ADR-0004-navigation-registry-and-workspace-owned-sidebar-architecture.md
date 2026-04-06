# ADR-0004: Navigation Registry and Workspace-Owned Sidebar Architecture

- Status: accepted
- Date: 2026-04-06

## Context

SchoolClerk must support multiple institution types and multiple workspace personas from a single product surface. The previous sidebar model lived inside the dashboard app as a hardcoded list of modules and links. That approach mixed:

- workspace concerns
- role visibility rules
- route grouping
- product information architecture

It also made it difficult to scale navigation to additional school systems without growing a single app-local config file.

## Decision

Adopt a shared navigation package and typed registry model:

- create `packages/navigation` as the source of truth for navigation types and sidebar builders
- define navigation in terms of:
  - workspace
  - module
  - section
  - feature/page
- keep app route URLs stable while moving navigation ownership out of page-level code
- convert registry definitions into the current sidebar component shape through an adapter

The first implementation keeps role-based access in place while adding structure for future institution-type and module-toggle filtering.

## Consequences

### Positive

- Navigation becomes reusable across dashboard surfaces and future clients.
- Sidebar evolution no longer depends on one large app-local links file.
- The codebase gains a stable place for institution-aware and workspace-aware navigation rules.
- Future school systems can extend config and registry entries without redesigning the sidebar architecture.

### Tradeoffs

- Adds one more shared package and adapter layer.
- Existing route groups still need incremental cleanup to fully align with workspace ownership.
- Institution-type and tenant-module filters still need follow-up wiring into runtime tenant config.

## Alternatives Considered

- Keep all navigation definitions in `apps/dashboard/src/components/sidebar/links.ts`.
- Split sidebar files by role but keep them app-local and untyped.
- Rework routes first and defer navigation abstraction.

## Follow-up Actions

- Add tenant-config selectors so navigation visibility can include institution type and enabled modules.
- Reorganize dashboard route groups around stable workspaces such as `(admin)`, `(teacher)`, and `(parent)`.
- Move feature orchestration into `apps/dashboard/src/features/*` so route files stay thin.
