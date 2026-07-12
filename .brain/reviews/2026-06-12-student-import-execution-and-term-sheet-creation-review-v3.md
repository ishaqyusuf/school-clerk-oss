# Brain Handoff Review: Student Import Execution And Term Sheet Creation Fix 2

## Reviewed Handoff
brain/handoffs/fixes/2026-06-12-student-import-execution-and-term-sheet-creation-fix-2.md

## Queue Item
/Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-school-clerk-student-import-execution-and-term-sheet-creation.json

## Execution Path
/Users/M1PRO/Documents/code/.brain-worktrees/2026-06-12-school-clerk-student-import-execution-and-term-sheet-creation

## Source Plan
brain/plans/2026-06-12-feature-student-import-execution-and-term-sheet-creation.md

## Result
Needs Fix

## Findings
- [P1] The dashboard import component is syntactically broken. apps/dashboard/src/components/modals/student-import/import-activities.tsx lines 460-472 contain leftover updateStudent object fragments inside JSX. The dashboard typecheck fails with parse errors at lines 462, 469, 470, 471, and 472.
- [P1] Execute All still derives the mutation classroomDepartmentId from fields[0]. apps/dashboard/src/components/modals/student-import/import-activities.tsx lines 290-337 still uses fields[0]?.classRoom?.id for the top-level classroom, which was explicitly rejected in review v2.
- [P2] Missing classroom identity still silently skips rows or returns early. Lines 291-292 return when the first row has no classroom, and lines 294-331 drop rows with no activity.classRoom?.id instead of creating a visible row result/pre-submit error.
- [P2] Relevant invalidations are still not implemented. Lines 227-239 keep only student query invalidations and add a comment saying classroom/report views refresh on navigation, but fix-2 required adding relevant invalidations or documenting unavailable query keys in Brain docs, not only an inline comment.

## Acceptance Criteria Check
- Execute All never auto-keeps first exact match without explicit selection: Pass by inspection
- Batch classroom id comes from a verified selected classroom source, not fields[0]: Fail
- Row action controls select batch decisions without immediate mutations: Partial; intended behavior exists, but parse errors break the component
- Missing row/classroom/action identity creates visible row result or clear pre-submit error: Fail
- Relevant classroom/report/finance query invalidation is added or documented: Fail
- Brain docs contain no unrelated staff-onboarding permissions change and describe term-sheet conflict behavior: Partial; term-sheet doc fixed, permissions revert not fully rechecked because code is blocked

## Checks
- bun --cwd /Users/M1PRO/Documents/code/.brain-worktrees/2026-06-12-school-clerk-student-import-execution-and-term-sheet-creation --filter @school-clerk/api typecheck: Fail due to baseline generated/Prisma/package errors.
- bun --cwd /Users/M1PRO/Documents/code/.brain-worktrees/2026-06-12-school-clerk-student-import-execution-and-term-sheet-creation --filter @school-clerk/dashboard typecheck: Fail with touched-file parse errors in apps/dashboard/src/components/modals/student-import/import-activities.tsx.
- Manual code review for fix-2 acceptance: Fail.

## Brain Update Check
- brain/features/student-import.md: Present and idempotency wording improved
- brain/tasks/in-progress.md: Present; task remains in progress
- brain/progress.md: No clear fix-2 completion note found

## Decision
Fix-2 cannot be approved because the dashboard component no longer parses and two prior acceptance blockers remain. A fix-3 handoff was created.

## Follow-Up
- brain/handoffs/fixes/2026-06-12-student-import-execution-and-term-sheet-creation-fix-3.md
