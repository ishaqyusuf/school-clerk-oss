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

## Task Item
- ID: ADM-003
- Title: Parent submission hardening and submission-success email
- Type: feature
- Priority: P0
- Scope: Add structured passport handling, richer applicant/guardian field validation, safer document access rules, and a parent-facing submission-success email after application creation.
- Dependencies: ADM-001, notification/email packages
- Owner: TBD
- Detail: `brain/tasks/admission-portal-and-document-template-system.md`

## Task Item
- ID: ADM-004
- Title: Admission review payment setup and approval email
- Type: feature
- Priority: P0
- Scope: Replace one-click approval with a review workspace where admins verify documents, set admission payment information, create/link student records, and send a successful-admission email with payment link/details.
- Dependencies: ADM-003, finance fee/payment model
- Owner: TBD
- Detail: `brain/tasks/admission-portal-and-document-template-system.md`

## Task Item
- ID: ADM-005
- Title: Admission letter PDF generation and template selection
- Type: feature
- Priority: P1
- Scope: Add admission-letter document payloads, PDF generation, student passport rendering, school-selectable admission letter templates, and generated document attachment/linking from approval emails.
- Dependencies: ADM-004, DOC-001
- Owner: TBD
- Detail: `brain/tasks/admission-portal-and-document-template-system.md`

## Task Item
- ID: DOC-001
- Title: Shared school document template registry
- Type: feature
- Priority: P1
- Scope: Build a GND-style registry for admission letters, admission forms, result sheets, and future school documents with stable template IDs, versions, preview metadata, typed payloads, and tenant default selections.
- Dependencies: Existing `packages/pdf` result templates, GND sales PDF registry reference
- Owner: TBD
- Detail: `brain/tasks/admission-portal-and-document-template-system.md`

## Task Item
- ID: DOC-002
- Title: Tenant-managed result template selection
- Type: feature
- Priority: P1
- Scope: Make current result templates tenant-selectable from the dashboard, persist default result template choice per school, and have the result PDF route use tenant preferences instead of hardcoded dashboard config.
- Dependencies: DOC-001, assessment result PDF route
- Owner: TBD
- Detail: `brain/tasks/admission-portal-and-document-template-system.md`

## Task Item
- ID: DOC-003
- Title: JSON document template renderer
- Type: feature
- Priority: P2
- Scope: Add a constrained JSON layout schema for simpler admission documents and configurable school-owned forms, with validation, preview rendering, and PDF rendering.
- Dependencies: DOC-001, ADM-005
- Owner: TBD
- Detail: `brain/tasks/admission-portal-and-document-template-system.md`

## Task Item
- ID: DOC-004
- Title: Custom admission and result template request workflow
- Type: feature
- Priority: P2
- Scope: Let schools upload an existing form/result PDF or scanned image, optionally pay for a custom build, track internal build status, and select the finished custom template after approval.
- Dependencies: DOC-001, DOC-003, billing/add-on decision
- Owner: TBD
- Detail: `brain/tasks/admission-portal-and-document-template-system.md`
