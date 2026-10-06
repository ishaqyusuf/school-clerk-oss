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

### [CORE-001 Institution Configuration](2026-09-07-core-001-institution-configuration.md)
- Status: In Progress (moved to the active task ledger; verification deferred)

### [CORE-002 Tenant Module Controls](2026-09-07-core-002-tenant-module-controls.md)
- Status: In Progress

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

## Dashboard regional and connection-startup latency — 2026-10-06

Follow-up to completed ADR-0068 performance release. Production proxy still executes in fra1/lhr1 while managed Neon and API/render functions are in US East. Regional config/legacy middleware attempts did not move it. Slow proxy totals of roughly 1.4–1.9s and connection-acquisition overhead remain; pool saturation and slow SQL have not been established.

Inventory proxy/prefetch request frequency and correlate stages by request ID. Review a regional handler boundary for tenant and stored-session resolution that preserves every auth/ancestry/cookie/academic guard. Measure naturally idle versus warm connection startup before proposing a supported deployment change. Do not bypass validation or add indexes from the tiny sampled plans. Repeat same-tenant warm samples and naturally cold observations separately; two-second useful-data readiness is a target, not a current guarantee. No provider switch, paid upgrade or schema change is part of the completed release.

Regional handler follow-up update: ADR-0069 implementation4a8001e is released and actual iad1 handler/database region confirmed. Access/data/local/live checks pass. Isolated authenticated warm performance acceptance remains in progress; new-deployment startup/transport overhead remains. Preserve the prior b8fbbcd three-sample baseline and do not call signed-out HTTP timings or incomplete Chrome observations an improvement. No schema/provider/paid change is authorized by this follow-up.

## Regional routing backlog status update —2026-10-06

Regional handler implementation and bounded warm comparison above are complete: Dashboard warm Chrome Load0.906/2.210/0.962s: median0.962s vs2.07s, observed53.5% reduction. Classes3.540/0.919/1.030s: median1.030s vs2.44s, observed57.8% reduction. The remaining scope is startup and sporadic tail latency, not another pending regional-handler implementation. A separate /student-report request recorded SchoolProfile.findFirst73196.98ms and workspace.resolve73218.77ms application elapsed, HTTP200. This does not establish73s SQL execution or pool saturation. Read-only production snapshot: zero lock waiters, two idle clients, one SchoolProfile row, small tenant lookup execution0.030ms, local connection acquisition1452ms. Inherited statement/lock timeouts0. Diagnostic used a local5s statement timeout in READ ONLY and rolled back; application settings unchanged. Historical network/lifecycle/SQL cause is unresolved.

Correlate request deadlines, driver connection/query events and provider activity before changing query behavior. Distinguish SQL execution, network waits and suspended/background lifecycle. Validate narrow read cancellation if evidence supports it; preserve financial transaction and auth/ancestry semantics. No missing index or pool saturation is established, and no paid upgrade/provider/schema/index/global mutation timeout change is part of this task.
