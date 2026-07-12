# Backlog

## Purpose
Prioritized list of tasks not yet started.

## How To Use
- Add new tasks here first.
- Keep tasks small and actionable.
- Move tasks to in-progress when work starts.

## Template
## Task Item
- ID:
- Title:
- Type: feature | bug | chore | docs
- Priority: P0 | P1 | P2 | P3
- Scope:
- Dependencies:
- Owner:

## Task Item
- ID: ADM-FU-001
- Title: Validate admission-letter passport rendering with production Blob URL
- Type: chore
- Priority: P2
- Scope: Run or add a retained-tenant validation where the submitted passport photo is a real production Vercel Blob URL and confirm the generated admission-letter PDF renders it correctly.
- Dependencies: ADM-005
- Owner: TBD

## Task Item
- ID: DOC-FU-001
- Title: Configure schoolify preview Blob environment
- Type: chore
- Priority: P2
- Scope: Add branch-specific Preview `BLOB_READ_WRITE_TOKEN` configuration for the `schoolify` Vercel project if preview branch uploads need live custom-template/admission file support.
- Dependencies: DOC-004
- Owner: TBD

## Task Item
- ID: DOC-FU-002
- Title: Decide native checkout provider for paid custom template builds
- Type: feature
- Priority: P3
- Scope: Decide whether paid custom-template requests should remain manual/external-link handoff or integrate the platform billing/checkout provider, then plan schema and workflow changes if native checkout is selected.
- Dependencies: DOC-004
- Owner: TBD

## Task Item
- ID: CORE-001
- Title: Design and implement institution type configuration
- Type: feature
- Priority: P0
- Scope: Add canonical `institutionType` enum, tenant config storage, read/write API, and validation rules.
- Dependencies: ADR-0002
- Owner: TBD

## Task Item
- ID: CORE-002
- Title: Implement module enable/disable engine per tenant
- Type: feature
- Priority: P0
- Scope: Add module flags, UI gating, API/service authorization checks, and onboarding defaults by institution type.
- Dependencies: CORE-001
- Owner: TBD

## Task Item
- ID: CORE-003
- Title: Normalize academic hierarchy model
- Type: feature
- Priority: P0
- Scope: Unify session/term/level/department/program model and align enrollment, attendance, and assessment references.
- Dependencies: CORE-001
- Owner: TBD

## Task Item
- ID: EXAM-001
- Title: Design external examination data model and module config
- Type: feature
- Priority: P1
- Scope: Define schema/entities for exam bodies, exams, candidates, subjects, centers, payments, documents, and results; add tenant module toggle support.
- Dependencies: CORE-001, CORE-002
- Owner: TBD

## Task Item
- ID: EXAM-002
- Title: Implement candidate registration workflow (single + bulk)
- Type: feature
- Priority: P1
- Scope: Build registration flow, subject selection, payment tracking, status transitions, deadline validation, and export/slip generation.
- Dependencies: EXAM-001
- Owner: TBD

## Task Item
- ID: EXAM-003
- Title: Implement external result tracking and analytics
- Type: feature
- Priority: P2
- Scope: Add result capture/import, candidate result history, pass-rate analytics, and score distribution dashboards.
- Dependencies: EXAM-002
- Owner: TBD

## Task Item
- ID: WEB-001
- Title: Design school website template registry architecture
- Type: feature
- Priority: P1
- Scope: Define template manifest typing, preview vs production rendering model, editable field schema, template config model, and boundaries between `packages/template-registry` and `apps/school-site`.
- Dependencies: ADR-0001, ADR-0002
- Owner: TBD

## Task Item
- ID: WEB-002
- Title: Design tenant website configuration persistence model
- Type: feature
- Priority: P1
- Scope: Define storage for multi-template draft configurations, published configuration selection, section visibility, theme settings, SEO settings, and future versioning support.
- Dependencies: WEB-001
- Owner: TBD

## Task Item
- ID: WEB-003
- Title: Implement template registry and multi-page preview flow
- Type: feature
- Priority: P1
- Scope: Build template listing, filtering by institution type and plan, multi-page preview, click guards, and template manifest loading in a production-like preview experience.
- Dependencies: WEB-001
- Owner: TBD

## Task Item
- ID: WEB-004
- Title: Implement inline editable fields and AI-assisted content actions
- Type: feature
- Priority: P1
- Scope: Add schema-driven editable regions, inline editing boundaries, validation, AI field context generation, and draft-save behavior for template customization.
- Dependencies: WEB-001, WEB-002, WEB-003
- Owner: TBD

## Task Item
- ID: WEB-005
- Title: Implement public school website runtime
- Type: feature
- Priority: P1
- Scope: Add tenant resolution, published configuration loading, template renderer resolution, live tenant data merging, and public multi-page rendering in `apps/school-site`.
- Dependencies: WEB-002, WEB-003
- Owner: TBD
