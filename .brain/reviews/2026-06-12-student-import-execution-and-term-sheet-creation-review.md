# Brain Handoff Review: Student Import Execution And Term Sheet Creation

## Reviewed Handoff
brain/handoffs/ready/2026-06-12-student-import-execution-and-term-sheet-creation-handoff.md

## Queue Item
/Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-school-clerk-student-import-execution-and-term-sheet-creation.json

## Execution Path
/Users/M1PRO/Documents/code/.brain-worktrees/2026-06-12-school-clerk-student-import-execution-and-term-sheet-creation

## Source Plan
brain/plans/2026-06-12-feature-student-import-execution-and-term-sheet-creation.md

## Result
Needs Fix

## Findings
- [P1] `apps/dashboard/src/components/modals/student-import/import-activities.tsx:284-362` does not execute selected row resolutions. It builds rows from the first exact match or no-match status, never reads an operator-selected action, never sends `update_match_with_name`, and sends `keep_match` for matched rows by default. This violates the handoff goal to apply selected decisions and can mutate/enroll the wrong student without explicit selection.
- [P1] `apps/api/src/db/queries/students.ts:1358-1365` only treats a current-term sheet as existing when it matches the same `classroomDepartmentId`. The source plan explicitly calls out that an existing active current-term form in another classroom needs a decision/block, and the handoff acceptance says existing current term sheets must be reused rather than duplicated. As written, keeping/updating a matched student who already has a current-term sheet in another class creates another current-term form for the same student/session/term.
- [P1] `apps/api/src/db/queries/students.ts:1119-1124` validates the selected classroom by `schoolProfileId` only. The handoff requires the selected classroom to belong to the active tenant/session; without checking the related `classRoom.schoolSessionId`/active session ancestry, the mutation can execute against a classroom department from another session in the same school.
- [P2] `apps/dashboard/src/components/modals/student-import/import-activities.tsx:281` derives the batch `classroomDepartmentId` from `fields[0]?.classRoom?.id`, and then applies that one classroom to every row. This depends on the first generated activity resolving correctly and cannot support per-row/selected classroom identity from the parsed/import review state. If the first row is unresolved, execution silently returns without a row-level failure.
- [P2] `apps/dashboard/src/components/modals/student-import/import-activities.tsx:284-323` creates a `rows` array that is never used and type-references `importRows` before declaration. Even if TypeScript does not currently surface this amid baseline errors, it is dead/confusing code in the execution path and should be removed.
- [P2] Required Brain updates are incomplete or wrong. `brain/api/endpoints.md` does not list `trpc.students.executeStudentImport`; `brain/api/contracts.md` was changed only for unrelated staff onboarding text; `brain/database/relationships.md` does not document term sheet creation/reuse behavior; and `brain/features/student-import.md` still documents old classroom/header-line and gender-toggle parsing behavior that conflicts with the current student import plan.

## Acceptance Criteria Check
- Import execution applies all selected row actions through a batch mutation: Fail.
- New students are created with selected classroom, active session, active term, and final gender: Partial.
- Keeping a match does not duplicate the `Students` row: Pass by inspection.
- Keeping or updating a match creates the active term sheet when it does not already exist: Partial.
- Existing current term sheets are reused rather than duplicated: Fail.
- `Update match with name` changes only the selected matched student and uses parsed name fields: Backend partial; dashboard never sends this action.
- Execution returns a row-level result summary and aggregate counts: Pass by inspection.
- Student list, analytics, recent-record verification, and relevant classroom/report views refresh after successful import: Partial; only student queries are invalidated.
- Fee-history application remains consistent with normal student creation/enrollment for newly-created term sheets: Partial by inspection; behavior depends on fixing duplicate/current-term handling.

## Checks
- `bun --filter @school-clerk/api typecheck`: Fail due to known baseline Prisma/type dependency errors. No clearly isolated new execution-file error was surfaced before baseline failures.
- `bun --filter @school-clerk/dashboard typecheck`: Fail due to known baseline errors. Focused grep did not surface a touched `student-import` error, but the execution path still has dead/confusing code that should be cleaned.
- Manual code review for selected action execution, existing term-sheet reuse, classroom/session validation, and Brain updates: Fail.

## Brain Update Check
- `brain/progress.md`: Missing execution completion notes.
- `brain/features/student-import.md`: Present but inconsistent with the current planned input contract.
- `brain/api/endpoints.md`: Missing new mutation.
- `brain/api/contracts.md`: Missing new mutation contract; unrelated staff onboarding text changed instead.
- `brain/database/relationships.md`: Missing term sheet idempotency/reuse rules.
- `brain/tasks/in-progress.md`: Present and task kept in progress.

## Decision
The backend mutation has useful scaffolding, but the handoff cannot be approved while selected user decisions are not honored and current-term idempotency can still create duplicates. A focused fix handoff was created.

## Follow-Up
brain/handoffs/fixes/2026-06-12-student-import-execution-and-term-sheet-creation-fix-1.md
