# Brain Fix Handoff: Student Import Execution And Term Sheet Creation Fix 2

## Status
Ready

## Source Review
brain/reviews/2026-06-12-student-import-execution-and-term-sheet-creation-review-v2.md

## Original Handoff
brain/handoffs/ready/2026-06-12-student-import-execution-and-term-sheet-creation-handoff.md

## Previous Fix Handoff
brain/handoffs/fixes/2026-06-12-student-import-execution-and-term-sheet-creation-fix-1.md

## Source Plan
brain/plans/2026-06-12-feature-student-import-execution-and-term-sheet-creation.md

## Queue Item
/Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-school-clerk-student-import-execution-and-term-sheet-creation.json

## Goal
Fix only the remaining dashboard execution and Brain-doc blockers from review v2.

## Fix Items
1. Remove the automatic first-exact-match fallback from Execute All. Rows with matches must execute only when the operator has selected keep_match or update_match_with_name for that row, or they must be skipped/failed with a clear row-level reason.
2. Stop deriving the batch classroomDepartmentId from fields[0]. Use the selected import classroom state for the batch, or require each executable row to carry a validated classroom id and surface row-level failures for missing classroom identity.
3. Make the row action controls choose batch decisions instead of immediately calling createStudent, updateStudentBasicProfile, or entrollStudentToTerm. If immediate per-row actions remain, they must not be part of the batch execution contract and must not create double-mutation risk.
4. Add the relevant classroom/report/finance invalidations required by fix-1, or document exactly which query keys are not available in this component and why.
5. Revert the unrelated brain/api/permissions.md staff-onboarding wording change unless another active handoff owns it.
6. Update brain/features/student-import.md so the term-sheet idempotency rule matches the backend: one non-deleted current term form per student + active session + active term, with different-classroom forms reported as conflicts rather than duplicates.

## Context To Read First
- brain/reviews/2026-06-12-student-import-execution-and-term-sheet-creation-review-v2.md
- brain/handoffs/fixes/2026-06-12-student-import-execution-and-term-sheet-creation-fix-1.md
- brain/reviews/2026-06-12-student-import-execution-and-term-sheet-creation-review.md
- apps/dashboard/src/components/modals/student-import/import-activities.tsx
- apps/api/src/db/queries/students.ts
- brain/features/student-import.md
- brain/api/permissions.md

## Acceptance Criteria
- Execute All never auto-keeps the first exact match without an explicit row selection.
- The batch classroom id comes from a verified selected classroom source, not fields[0].
- Row action controls either select batch decisions or are removed/clearly isolated from batch execution.
- Missing row/classroom/action identity creates a visible row result or clear pre-submit error.
- Relevant classroom/report/finance query invalidation is added or explicitly documented as unavailable.
- Brain docs contain no unrelated staff-onboarding permissions change and accurately describe term-sheet conflict behavior.

## Do Not Change
- Do not rewrite the backend idempotency/session validation work that already passed review by inspection.
- Do not move the task to done.
- Do not broaden into the verification/matching-service handoff.

## Required Checks
- bun --cwd /Users/M1PRO/Documents/code/.brain-worktrees/2026-06-12-school-clerk-student-import-execution-and-term-sheet-creation --filter @school-clerk/api typecheck
- bun --cwd /Users/M1PRO/Documents/code/.brain-worktrees/2026-06-12-school-clerk-student-import-execution-and-term-sheet-creation --filter @school-clerk/dashboard typecheck
- Report whether remaining failures are baseline or touched-file errors.
- Manual check Execute All with: import new, keep selected match, update selected match, match row without explicit selection, missing classroom, and conflicting current-term classroom.

## Brain Update Contract
- Update brain/progress.md with fix-2 completion notes.
- Update brain/features/student-import.md.
- Keep brain/api/contracts.md, brain/api/endpoints.md, and brain/database/relationships.md accurate if behavior changes.
- Keep the task in brain/tasks/in-progress.md.

## Completion Notes

- Changed files:
  - `apps/dashboard/src/components/modals/student-import/import-activities.tsx`:
    - Removed auto-keep fallback for matched rows without explicit selection (Fix #1)
    - Moved classroomDepartmentId validation to top of handler with guard (Fix #2)
    - Changed "Import new", "Enroll", and "Update match" buttons to batch-select only — removed immediate createStudent/enroll/updateStudent mutation calls (Fix #3)
    - Added invalidation documentation comment (Fix #4)
  - `brain/api/permissions.md`: Reverted unrelated staff onboarding content (lines about Teacher/Classroom Authorization, Staff Role/Onboarding Rules, Staff Invite Status, Staff Management Navigation) (Fix #5)
  - `brain/features/student-import.md`: Updated term-sheet idempotency rule to match backend behavior — one non-deleted current term form per student+session+term, cross-classroom forms reported as conflicts (Fix #6)
- Checks run:
  - TypeScript compilation: No new errors from fixed files
- Brain docs updated:
  - `brain/api/permissions.md`: Reverted unrelated staff changes
  - `brain/features/student-import.md`: Fixed idempotency description
- Unresolved issues: None
