# Design Detection And Merge API Contract

Labels: `wayfinder:research`
Status: Open
Blocked by: `000-verify-student-classroom-filter-contract.md`, `003-design-survivor-selection-and-move-rules.md`
Blocks: `005-design-student-and-classroom-ui-surfaces.md`, `007-build-implementation-handoff.md`

## Question

What server API should power duplicate warnings, previews, and merge execution?

## Context

The UI needs fast class-scoped duplicate warnings and a safe merge preview before any mutation moves records. The final contract should fit the existing tRPC/router style.

## Resolve

- Read endpoint for class-scoped duplicate groups and counts.
- Whether the read endpoint is on `students`, `classrooms`, or a shared academic integrity surface.
- Preview endpoint or mutation for merge impact summary.
- Execute mutation contract, validation, transaction boundaries, and idempotency.
- Required input identifiers:
  - classroom department id
  - session term id
  - survivor student id
  - duplicate student ids
  - selected term-sheet ids, if needed
- Error cases:
  - duplicate group changed since preview
  - candidate outside tenant
  - candidate outside selected class/term
  - unresolved data conflict
  - missing permission
- Query invalidations after merge.

## Expected Answer

Route names, request/response shapes, permission requirements, transaction rules, and error cases ready for durable API documentation.

## Approved Comment

Use `students` router APIs for this feature because the workflow is student-identity centered, even when shown from classroom overview. Add a read endpoint for duplicate groups, a preview endpoint/mutation for merge impact, and an execute mutation for merge. Inputs should include `classroomDepartmentId`, `sessionTermId`, survivor student id, duplicate student ids, and a preview/version token where possible. Execution must be authenticated, tenant-scoped, role-limited to Admin/Registrar-style student management roles, transactional, idempotent where practical, and must fail on stale duplicate groups, tenant mismatch, class/term mismatch, unresolved conflicts, or missing permission.
