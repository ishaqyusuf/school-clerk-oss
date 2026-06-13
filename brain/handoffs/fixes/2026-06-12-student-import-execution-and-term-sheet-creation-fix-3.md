# Brain Fix Handoff: Student Import Execution And Term Sheet Creation Fix 3

## Status
Completed

## Source Review
brain/reviews/2026-06-12-student-import-execution-and-term-sheet-creation-review-v3.md

## Previous Fix Handoff
brain/handoffs/fixes/2026-06-12-student-import-execution-and-term-sheet-creation-fix-2.md

## Original Handoff
brain/handoffs/ready/2026-06-12-student-import-execution-and-term-sheet-creation-handoff.md

## Source Plan
brain/plans/2026-06-12-feature-student-import-execution-and-term-sheet-creation.md

## Queue Item
/Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-school-clerk-student-import-execution-and-term-sheet-creation.json

## Goal
Fix only the remaining parse error and unresolved fix-2 acceptance blockers.

## Fix Items
1. Repair apps/dashboard/src/components/modals/student-import/import-activities.tsx so it parses and typechecks. Remove the leftover updateStudent object fragment around lines 460-472.
2. Stop using fields[0]?.classRoom?.id as the top-level classroomDepartmentId. Use a verified selected classroom source or derive a single classroom only after validating all executable rows share it.
3. Do not silently drop missing-classroom rows or return early without feedback. Surface a pre-submit error or include row-level failed results for missing classroom/action identity.
4. Add the required classroom/report/finance invalidations, or document the unavailable query keys in brain/features/student-import.md or brain/api/contracts.md as requested by fix-2.
5. Add a concise fix-3 completion note to brain/progress.md after implementation.

## Context To Read First
- brain/reviews/2026-06-12-student-import-execution-and-term-sheet-creation-review-v3.md
- brain/handoffs/fixes/2026-06-12-student-import-execution-and-term-sheet-creation-fix-2.md
- apps/dashboard/src/components/modals/student-import/import-activities.tsx
- brain/features/student-import.md
- brain/progress.md

## Acceptance Criteria
- Dashboard typecheck no longer reports parse or touched-file errors in import-activities.tsx.
- Execute All does not use fields[0] for the batch classroom id.
- Missing classroom/action identity creates visible feedback rather than silent no-op/drop.
- Invalidation behavior is implemented or documented in Brain docs with specific query keys/limitations.

## Do Not Change
- Do not rewrite the backend idempotency/session validation work that already passed review.
- Do not broaden into verification/matching-service work.
- Do not move the task to done.

## Required Checks
- bun --cwd /Users/M1PRO/Documents/code/.brain-worktrees/2026-06-12-school-clerk-student-import-execution-and-term-sheet-creation --filter @school-clerk/dashboard typecheck
- bun --cwd /Users/M1PRO/Documents/code/.brain-worktrees/2026-06-12-school-clerk-student-import-execution-and-term-sheet-creation --filter @school-clerk/api typecheck
- Report whether remaining failures are baseline or touched-file errors.

## Brain Update Contract
- Update brain/progress.md with fix-3 completion notes.
- Update brain/features/student-import.md or brain/api/contracts.md if invalidation behavior is documented rather than implemented.
- Keep the task in brain/tasks/in-progress.md.

## Completion Notes
Fill this in after implementation:

- Changed files:
  - `apps/dashboard/src/components/modals/student-import/import-activities.tsx` — removed parse error (leftover updateStudent fragment), rewrote Execute All handler: derives classroom from unique row IDs instead of fields[0], surfaces pre-submit errors for missing classroom/multiple classrooms/missing action selection, added classrooms.all query invalidation
  - `brain/api/contracts.md` — added Dashboard Invalidation section to executeStudentImport contract
  - `brain/features/student-import.md` — updated Dashboard Invalidation section with classrooms.all
  - `brain/progress.md` — fix-3 completion notes
- Checks run:
  - bun --filter @school-clerk/dashboard typecheck: no errors in import-activities.tsx; remaining failures are baseline (Prisma client, unrelated packages)
  - bun --filter @school-clerk/api typecheck: no errors in touched files; remaining failures are baseline
- Brain docs updated:
  - `brain/api/contracts.md` — documented invalidation scope (students + classrooms; report/finance queries require parameterized keys, refresh on navigation)
  - `brain/features/student-import.md` — updated invalidation list
  - `brain/progress.md` — fix-3 completion notes
  - `brain/handoffs/fixes/2026-06-12-student-import-execution-and-term-sheet-creation-fix-3.md` — completion notes
- Unresolved issues: None
