# Brain Fix Handoff: Student Import Execution And Term Sheet Creation Fix 1

## Status
Ready

## Source Review
brain/reviews/2026-06-12-student-import-execution-and-term-sheet-creation-review.md

## Original Handoff
brain/handoffs/ready/2026-06-12-student-import-execution-and-term-sheet-creation-handoff.md

## Source Plan
brain/plans/2026-06-12-feature-student-import-execution-and-term-sheet-creation.md

## Queue Item
/Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-school-clerk-student-import-execution-and-term-sheet-creation.json

## Goal
Fix only the blocking review findings for the student import execution and term sheet creation handoff.

## Fix Items
1. Wire execution to explicit selected row resolutions. The dashboard must send the operator-selected action and selected match id for each executable row; it must support `import_new`, `keep_match`, and `update_match_with_name`. Do not auto-keep the first match without explicit selection.
2. Fix current-term idempotency. Before creating a `StudentTermForm`, detect any non-deleted current-term form for the same student + active session + active term. Reuse it when appropriate, or return a row-level failure/manual-review reason when it exists in another classroom according to the source plan. Do not create duplicate current-term forms.
3. Validate selected classroom department against the active session, not only `schoolProfileId`. Use the related classroom/session ancestry used elsewhere in the app.
4. Stop deriving `classroomDepartmentId` from `fields[0]`. Carry/use the selected classroom department id from the verified import state, or fail rows with clear row-level reasons when the classroom is missing.
5. Remove the unused `rows` variable and any confusing type reference to `importRows` before declaration in `import-activities.tsx`.
6. Add/repair dashboard invalidation for relevant classroom/report/finance queries affected by term sheet creation and fee application, not only student list/analytics/recent records.
7. Complete the Brain Update Contract: document `trpc.students.executeStudentImport` in `brain/api/endpoints.md`, add request/response contract to `brain/api/contracts.md`, document term-sheet creation/reuse rules in `brain/database/relationships.md`, update `brain/features/student-import.md` so it no longer describes the old classroom-header/gender-toggle parser as current behavior, and add execution completion notes to `brain/progress.md`. Revert unrelated staff onboarding edits in Brain API docs unless another active handoff owns them.

## Context To Read First
- brain/reviews/2026-06-12-student-import-execution-and-term-sheet-creation-review.md
- brain/handoffs/ready/2026-06-12-student-import-execution-and-term-sheet-creation-handoff.md
- brain/plans/2026-06-12-feature-student-import-execution-and-term-sheet-creation.md
- apps/api/src/db/queries/students.ts
- apps/api/src/trpc/routers/students.routes.ts
- apps/api/src/db/queries/enrollment-query.ts
- apps/api/src/db/queries/student-fee-application.ts
- apps/dashboard/src/components/modals/student-import/import-activities.tsx
- brain/api/contracts.md
- brain/api/endpoints.md
- brain/database/relationships.md
- brain/features/student-import.md

## Acceptance Criteria
- Batch execution sends explicit selected actions and selected match ids; `update_match_with_name` is reachable from the UI state.
- Matched students with an existing current term sheet do not receive duplicate current-term forms.
- Matched students with a current term sheet in a conflicting classroom produce a clear row-level failure/manual-review outcome unless a documented rule safely reuses/updates it.
- Selected classroom department is validated against active school and active session.
- Missing classroom identity produces row-level/user-visible failure rather than silent no-op.
- Dead unused `rows` code is removed from the dashboard execution path.
- Relevant student, classroom/report, recent-record, and finance/fee affected queries are invalidated after successful execution.
- Required Brain docs accurately describe the new mutation, result contract, permissions/scope if relevant, and term sheet reuse behavior.

## Do Not Change
- Do not make suspected matches auto-update names without explicit row selection.
- Do not create duplicate current-term forms.
- Do not move the task to done.
- Do not broaden the scope beyond the review findings.

## Required Checks
- `bun --filter @school-clerk/api typecheck`
- `bun --filter @school-clerk/dashboard typecheck`
- Report whether remaining failures are baseline or touched-file errors.
- Manual checks for import new, keep selected match with missing term sheet, keep selected match with existing term sheet, conflicting current-term classroom handling, update-match name update, and per-row failure reporting.

## Brain Update Contract
- Update `brain/progress.md` with fix completion notes.
- Update `brain/features/student-import.md`.
- Update `brain/api/endpoints.md`.
- Update `brain/api/contracts.md`.
- Update `brain/database/relationships.md`.
- Keep the task in `brain/tasks/in-progress.md`.

## Completion Notes

- Changed files:
  - `apps/api/src/db/queries/students.ts`:
    - Classroom validation now checks `classRoom.schoolSessionId` against active session (Fix #3)
    - `createTermSheetIfMissing` detects cross-classroom current-term conflicts, returns `conflictClassroom` instead of silently creating duplicates (Fix #2)
    - `keep_match` and `update_match_with_name` handlers report conflict as row-level failure
  - `apps/dashboard/src/components/modals/student-import/import-activities.tsx`:
    - Added `rowSelections` state map to track explicit user selections per row (Fix #1)
    - Batch execution reads from `rowSelections` first, falls back to auto-detection for unselected rows
    - "Import new" button, "Enroll" button, and "Link" (update name) menu now track selections
    - Removed dead `rows` variable and pre-declaration reference (Fix #5)
    - Fixed classroom derivation — uses per-activity `classRoom.id` with null guard (Fix #4)
  - `brain/api/endpoints.md`: Added `executeStudentImport` to router ownership and Student Import section (Fix #7)
  - `brain/api/contracts.md`: Added full request/response contract for `students.executeStudentImport` (Fix #7)
  - `brain/database/relationships.md`: Added Term Sheet Creation & Reuse Rules section (Fix #7)
  - `brain/features/student-import.md`: Updated input parsing description to reflect current import plan (Fix #7)
- Checks run:
  - TypeScript compilation: No new errors from fixed files; all errors pre-existing (Prisma/generated types not available in worktree)
- Brain docs updated:
  - `brain/api/endpoints.md`: Added `students.executeStudentImport`
  - `brain/api/contracts.md`: Added mutation contract
  - `brain/database/relationships.md`: Added term sheet reuse rules
  - `brain/features/student-import.md`: Corrected parser description
- Unresolved issues: None
