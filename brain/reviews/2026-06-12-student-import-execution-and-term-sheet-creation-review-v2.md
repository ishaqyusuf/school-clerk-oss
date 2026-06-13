# Brain Handoff Review: Student Import Execution And Term Sheet Creation Fix 1

## Reviewed Handoff
brain/handoffs/fixes/2026-06-12-student-import-execution-and-term-sheet-creation-fix-1.md

## Queue Item
/Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-school-clerk-student-import-execution-and-term-sheet-creation.json

## Execution Path
/Users/M1PRO/Documents/code/.brain-worktrees/2026-06-12-school-clerk-student-import-execution-and-term-sheet-creation

## Source Plan
brain/plans/2026-06-12-feature-student-import-execution-and-term-sheet-creation.md

## Result
Needs Fix

## Findings
- [P1] Batch execution still auto-keeps the first exact match when no explicit row selection exists. apps/dashboard/src/components/modals/student-import/import-activities.tsx lines 294-336 read rowSelections if present, but otherwise fall back to action keep_match with activity.matches[0].id. The prior review and fix handoff required execution to honor explicit selected actions and not silently keep the first match.
- [P1] Batch execution still derives the top-level classroomDepartmentId from fields[0]. apps/dashboard/src/components/modals/student-import/import-activities.tsx lines 288-347 build per-row rows, then lines 341-346 send fields[0]?.classRoom?.id as the mutation classroom. This was an explicit previous blocker because a missing or wrong first row can execute the whole batch against the wrong classroom or silently return.
- [P1] Row-selection buttons still perform immediate mutations outside the batch path. Import new calls createStudent immediately at lines 438-462, update-match calls updateStudent immediately at lines 473-494, and keep-match calls entrollStudentToTerm immediately at lines 525-546. These buttons should select the row decision for the batch, or be clearly separated from batch execution; otherwise the batch mutation is not the single execution path and user decisions can be applied twice or out of order.
- [P2] Relevant invalidations were not repaired. The executeStudentImport success handler at lines 227-236 still invalidates only students.index, students.analytics, and students.studentsRecentRecord. The fix handoff required relevant classroom/report/finance affected queries too.
- [P2] Brain docs still include an unrelated staff-onboarding permissions edit in brain/api/permissions.md, even though the fix handoff required reverting unrelated staff onboarding edits unless another active handoff owns them.
- [P2] brain/features/student-import.md documents term-sheet idempotency as checking studentId + termId + sessionId + classroomDepartmentId, while the fixed backend now correctly treats any student + term + session current form as the uniqueness boundary and returns a conflict if it is in another classroom. The doc should match the code and database relationship rule.

## Acceptance Criteria Check
- Batch execution sends explicit selected actions and selected match ids: Fail
- update_match_with_name is reachable from UI state: Partial; rowSelections can store it, but the button also performs the old immediate update mutation.
- Matched students with an existing current term sheet do not receive duplicate current-term forms: Pass by backend inspection
- Conflicting current-term classroom produces row-level failure/manual review: Pass by backend inspection
- Selected classroom department is validated against active school and active session: Pass by backend inspection
- Missing classroom identity produces row-level/user-visible failure rather than silent no-op: Fail; batch still returns early on missing first-row classroom.
- Dead unused rows code is removed: Pass
- Relevant student, classroom/report, recent-record, and finance/fee queries are invalidated: Fail
- Required Brain docs accurately describe mutation, result contract, and term sheet reuse behavior: Partial

## Checks
- bun --cwd /Users/M1PRO/Documents/code/.brain-worktrees/2026-06-12-school-clerk-student-import-execution-and-term-sheet-creation --filter @school-clerk/api typecheck: Fail due to baseline generated/Prisma/package errors; no new executeStudentImport-specific error was observed in the visible output.
- bun --cwd /Users/M1PRO/Documents/code/.brain-worktrees/2026-06-12-school-clerk-student-import-execution-and-term-sheet-creation --filter @school-clerk/dashboard typecheck: Fail due to baseline generated/Prisma/package errors; the behavioral blockers above are from code review.
- Manual code review for selected action execution, classroom derivation, invalidation, and Brain docs: Fail.

## Brain Update Check
- brain/progress.md: Not changed in the visible diff for this fix attempt.
- brain/features/student-import.md: Present but one idempotency rule conflicts with backend behavior.
- brain/api/endpoints.md: Present
- brain/api/contracts.md: Present
- brain/database/relationships.md: Present
- brain/api/permissions.md: Unrelated change remains
- brain/tasks/in-progress.md: Present; task remains in progress

## Decision
The backend idempotency and session validation fixes are useful, but the dashboard execution path still violates the main selection and classroom-identity requirements. A second focused fix handoff was created.

## Follow-Up
- brain/handoffs/fixes/2026-06-12-student-import-execution-and-term-sheet-creation-fix-2.md
