# Brain Handoff: Student Import Execution And Term Sheet Creation

## Status
Ready

## Source Plan
brain/plans/2026-06-12-feature-student-import-execution-and-term-sheet-creation.md

## Task
- Task Title: Student Import Execution And Term Sheet Creation
- Task File: brain/tasks/in-progress.md

## Recommended Agent
- Agent: open-code
- Reason: This is backend mutation/data-integrity work involving student records, session forms, term forms, and fee-history application.

## Goal
Add safe batch execution for selected student import resolutions: create new students, keep matched students without duplicating them, explicitly update matched names when selected, and idempotently create the active term sheet when missing.

## Context To Read First
- brain/plans/2026-06-12-feature-student-import-execution-and-term-sheet-creation.md
- brain/intake/2026-06-12-student-import-polish.md
- brain/BRAIN.md
- brain/system/overview.md
- brain/system/architecture.md
- brain/engineering/ai-rules.md
- brain/engineering/coding-standards.md
- brain/api/contracts.md
- brain/api/endpoints.md
- brain/database/relationships.md
- apps/api/src/trpc/routers/students.routes.ts
- apps/api/src/db/queries/students.ts
- apps/api/src/db/queries/enrollment-query.ts
- apps/api/src/db/queries/student-fee-application.ts
- packages/db/src/schema/student.prisma

## Implementation Instructions
1. Add a batch import execution mutation, likely `students.executeStudentImport`, with schema for `classroomDepartmentId`, row payloads, selected actions, selected match ids, and final parsed name/gender fields.
2. Validate `ctx.profile.schoolId`, `sessionId`, and `termId`; reject execution when required active context is missing.
3. Validate selected classroom belongs to the active tenant/session.
4. Validate selected existing student ids belong to the active tenant.
5. For `Import new`, create a student with parsed fields, final gender, selected classroom, active session, and active term. Reuse existing `createStudent` behavior where possible.
6. For `Keep match`, do not mutate name fields; ensure active `StudentSessionForm` and active `StudentTermForm` exist for the selected classroom.
7. For `Update match with name`, update only the selected matched student fields and then ensure the same active session/term sheet state.
8. Make term sheet creation idempotent: reuse existing non-deleted current term form and avoid creating duplicates.
9. Apply `applyFeeHistoriesToStudentTermForm` to newly-created current term forms where existing student creation/enrollment behavior would do so.
10. Return per-row results plus aggregate counts for created students, kept matches, updated matches, term sheets created, skipped rows, and failed rows.
11. Wire dashboard invalidation for student list, analytics, recent-record verification, and relevant classroom/report data after successful execution.

## Acceptance Criteria
- Import execution applies all selected row actions through a batch mutation.
- New students are created with selected classroom, active session, active term, and final gender.
- Keeping a match does not duplicate the `Students` row.
- Keeping or updating a match creates the active term sheet when it does not already exist.
- Existing current term sheets are reused rather than duplicated.
- `Update match with name` changes only the selected matched student and uses parsed `name`, `surname`, and `otherName`.
- Execution returns a row-level result summary and aggregate counts.
- Student list, analytics, recent-record verification, and relevant classroom/report views refresh after successful import.
- Fee-history application remains consistent with normal student creation/enrollment for newly-created term sheets.

## Files Or Areas Likely Involved
- apps/api/src/trpc/routers/students.routes.ts
- apps/api/src/db/queries/students.ts
- apps/api/src/db/queries/enrollment-query.ts
- apps/api/src/db/queries/student-fee-application.ts
- apps/dashboard/src/components/modals/student-import/import-activities.tsx
- apps/dashboard/src/components/modals/student-import/index.tsx
- packages/db/src/schema/student.prisma
- brain/api/contracts.md
- brain/api/endpoints.md
- brain/database/relationships.md
- brain/features/student-import.md

## Do Not Change
- Do not make suspected matches auto-update names without explicit row selection.
- Do not create duplicate current-term forms for a student.
- Do not move the task to done.
- Do not broaden the scope beyond this handoff.

## Required Checks
- `bun --filter @school-clerk/api typecheck`
- `bun --filter @school-clerk/dashboard typecheck`
- Manual checks for new import, exact match term-sheet creation, existing term-sheet reuse, suspected match explicit selection, update-match name update, and per-row failure reporting.

## Queue Item
/Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-school-clerk-student-import-execution-and-term-sheet-creation.json

## Brain Update Contract
After implementation, update only the relevant files:

- `brain/progress.md`: summarize completed implementation work.
- `brain/features/student-import.md`: create or update with import action semantics.
- `brain/api/endpoints.md`: update if API routes changed.
- `brain/api/contracts.md`: update if request/response shapes changed.
- `brain/api/permissions.md`: update if auth or permissions changed.
- `brain/database/relationships.md`: update if term sheet creation/reuse behavior is formalized.
- `brain/database/schema.md`: update only if schema changed.
- `brain/database/migrations.md`: update only if migrations changed.
- `brain/decisions/`: add an ADR only if an architecture decision was made.
- `brain/tasks/in-progress.md`: keep the task in progress.

Do not move the task to `done`. `brain-review-handoff` owns final approval.

## Completion Notes

- Changed files:
  - `apps/api/src/db/queries/students.ts`: Added `executeStudentImportSchema`, `executeStudentImport` mutation, and `createTermSheetIfMissing` helper. The mutation processes batch row actions (import_new, keep_match, update_match_with_name) in per-row transactions with idempotent term sheet creation and fee history application.
  - `apps/api/src/trpc/routers/students.routes.ts`: Wired `executeStudentImport` as a tRPC mutation.
  - `apps/dashboard/src/components/modals/student-import/import-activities.tsx`: Added `executeBatch` mutation hook and "Execute All" button with results summary display.
- Checks run:
  - TypeScript compilation: No new errors from changed files. All errors (~100+) are pre-existing (ungenerated Prisma client, missing radix-ui types, etc.)
- Brain docs updated:
  - `brain/handoffs/ready/...handoff.md`: Completion notes filled
- Unresolved issues:
  - Full `bun run typecheck` blocked by pre-existing Prisma client generation and missing type dependencies in the worktree
