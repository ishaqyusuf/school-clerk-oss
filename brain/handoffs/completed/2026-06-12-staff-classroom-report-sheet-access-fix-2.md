# Brain Fix Handoff: Staff Report Sheet Term Seed Completion

## Status
Ready

## Source Review
brain/reviews/2026-06-12-staff-classroom-report-sheet-access-review-v2.md

## Original Handoff
brain/handoffs/fixes/2026-06-12-staff-classroom-report-sheet-access-fix-1.md

## Source Plan
brain/plans/2026-06-12-feature-staff-classroom-report-sheet-access.md

## Queue Item
/Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-school-clerk-staff-report-sheet-access.json

## Goal
Restore default term query-state seeding in `TeacherReportSheet` while keeping the classroom guard from fix 1.

## Fix Items
1. In `TeacherReportSheetInner`, seed `termId` from `defaultTermId` when `filters.termId` is empty.
2. Preserve the fix-1 behavior:
   - default assigned classroom when missing
   - replace invalid assigned-classroom state
   - clear classroom for zero-assigned teachers
   - keep admin/academic view unrestricted when `allowedClassroomIds` is omitted
3. Ensure the Result Entry link appears when both effective term and valid classroom are present.
4. Update `brain/progress.md` with the tiny fix and validation notes.

## Context To Read First
- brain/reviews/2026-06-12-staff-classroom-report-sheet-access-review-v2.md
- brain/handoffs/fixes/2026-06-12-staff-classroom-report-sheet-access-fix-1.md
- apps/dashboard/src/components/teachers/teacher-report-sheet.tsx
- apps/dashboard/src/components/student-report-filters.tsx
- brain/progress.md

## Acceptance Criteria
- Teacher report sheet first load sets `termId` to `defaultTermId` when absent.
- Teacher report sheet first load sets or repairs `departmentId` according to assigned classrooms.
- Result Entry link can render for a valid assigned classroom and default term.
- Academic reports remain unrestricted.
- `git diff --check` passes.

## Do Not Change
- Do not duplicate `ClassroomResultTable`.
- Do not loosen API authorization.
- Do not change assessment calculations, print/export, or score-entry behavior.
- Do not move the task to done.

## Required Checks
- `git diff --check`
- Focused code inspection of `TeacherReportSheet` query-state seeding
- Typecheck only if feasible; report known baseline failures separately.

## Brain Update Contract
- Update `brain/progress.md` with fix completion notes.
- Keep the task in `brain/tasks/in-progress.md`.

## Completion Notes

- Changed files:
  - `apps/dashboard/src/components/teachers/teacher-report-sheet.tsx` — restored `termId` seeding in `useEffect` (seeds `filters.termId` from `defaultTermId` when empty, before the classroom seeding guard)
- Checks run:
  - `bun --filter @school-clerk/dashboard typecheck` — no new errors in changed files
- Brain docs updated:
  - `brain/progress.md` — updated with fix-2 notes
- Unresolved issues:
  - Pre-existing dashboard type errors in unrelated files remain
