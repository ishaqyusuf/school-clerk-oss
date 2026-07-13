# Wayfinder Map: Student Duplicate Detection And Safe Merge

## Destination

An implementation-ready local plan for fixing student classroom filtering and adding class-scoped duplicate student detection plus safe duplicate merge. Operators should be able to trust student counts, see duplicate warnings on student/classroom surfaces, and merge duplicate records without losing historical attendance, assessment, finance, guardian, or current-term data.

## Status

Implemented locally after ticket approval. The scratch tickets remain here as the planning record and implementation reference.

## Notes

- Local-only effort: do not create GitHub issues or PRs.
- Scratch artifacts for this effort live here, not in `.brain/`.
- Brain docs are still required context and should be updated only when the work produces durable project knowledge.
- Primary Brain context:
  - `.brain/features/student-overview.md`
  - `.brain/features/student-import.md`
  - `.brain/database/schema.md`
  - `.brain/database/relationships.md`
  - `.brain/api/contracts.md`
  - `.brain/api/permissions.md`
  - `.brain/engineering/ai-rules.md`
  - `.brain/engineering/coding-standards.md`
- Primary code surfaces to inspect:
  - `apps/api/src/db/queries/students.ts`
  - `apps/api/src/db/queries/students.overview.ts`
  - `apps/api/src/trpc/routers/students.routes.ts`
  - `apps/api/src/trpc/schemas/schemas.ts`
  - `apps/dashboard/src/hooks/use-student-filter-params.ts`
  - `apps/dashboard/src/components/tables/students/data-table.tsx`
  - `apps/dashboard/src/components/classroom-students.tsx`
  - `apps/dashboard/src/components/sheets/classroom-overview-sheet.tsx`
  - `packages/db/src/schema/student.prisma`
  - `packages/db/src/schema/classroom.prisma`
  - `packages/db/src/schema/assessment.prisma`
  - `packages/db/src/schema/finance.prisma`
- Current code observations:
  - Student overview data is loaded through `students.overview`.
  - Classroom overview loads `classrooms.getClassroomOverview`; its Students tab renders `ClassroomStudents` -> student `DataTable` with `departmentId` as a default filter.
  - `students.index` currently only defaults `sessionId` and `sessionTermId` when the entire query is empty. A classroom-only filter may therefore compare `StudentSessionForm.schoolSessionId` with `undefined`.
  - Some report/promotion surfaces already detect duplicate display names client-side, but they do not merge records.
  - Promotion logic has a small survivor-selection precedent for duplicate `StudentTermForm` rows, preferring records with more assessment records and older creation dates.
- Implementation followed the approved tickets in this scratch folder.

## Decisions So Far

- Scratch location: this effort uses `.scratch/wayfinder/student-duplicate-detection-and-safe-merge/` with `map.md` and `tickets/*.md`.
- Planning boundary: resolve the classroom filter, duplicate identity, merge-owned records, survivor rules, API contract, UI surfaces, guardrails, and handoff before implementation.
- Safety boundary: duplicate resolution must move references and soft-delete superseded records where needed; hard deletion of historical records is out of scope.

## Tickets

- [000 - Verify Student Classroom Filter Contract](tickets/000-verify-student-classroom-filter-contract.md)
- [001 - Define Duplicate Identity](tickets/001-define-duplicate-identity.md)
- [002 - Inventory Merge-Owned Records](tickets/002-inventory-merge-owned-records.md)
- [003 - Design Survivor Selection And Move Rules](tickets/003-design-survivor-selection-and-move-rules.md)
- [004 - Design Detection And Merge API Contract](tickets/004-design-detection-and-merge-api-contract.md)
- [005 - Design Student And Classroom UI Surfaces](tickets/005-design-student-and-classroom-ui-surfaces.md)
- [006 - Define Data Integrity Guardrails](tickets/006-define-data-integrity-guardrails.md)
- [007 - Build Implementation Handoff](tickets/007-build-implementation-handoff.md)

## Deferred / Future Questions

- Whether a later version should add fuzzy likely-duplicate suggestions beyond exact normalized full-name grouping.
- Whether a later version should add a dedicated merge-history/audit table beyond soft-delete timestamps and moved references.
- Whether operators should eventually override the recommended survivor instead of using the system recommendation.
- Whether merge confirmation should become stricter than the current preview-first dialog for high-risk schools.

## Out Of Scope

- Hard-deleting historical student records.
- Cross-tenant duplicate detection.
- Parent portal duplicate resolution.
- AI-assisted fuzzy identity matching beyond deterministic duplicate warnings, unless a later ticket makes it necessary.
