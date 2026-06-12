# Brain Fix Handoff: Staff Classroom Report Sheet Access Filter Guard

## Status
Ready

## Source Review
brain/reviews/2026-06-12-staff-classroom-report-sheet-access-review.md

## Original Handoff
brain/handoffs/ready/2026-06-12-staff-classroom-report-sheet-access-handoff.md

## Source Plan
brain/plans/2026-06-12-feature-staff-classroom-report-sheet-access.md

## Queue Item
/Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-school-clerk-staff-report-sheet-access.json

## Goal
Make the teacher/staff report sheet open on an assigned classroom and prevent invalid classroom filter state from driving report or result-entry controls.

## Fix Items
1. Update `TeacherReportSheet` so teacher routes can pass assigned classroom ids and the component seeds `departmentId` to the first allowed classroom when no current `departmentId` is set.
2. If `filters.departmentId` is present but not included in `allowedClassroomIds`, clear it or replace it with the first allowed classroom before rendering table/link controls.
3. Preserve the unconstrained admin/academic behavior when `allowedClassroomIds` is omitted.
4. Do not pass `undefined` for teachers with zero assigned classrooms if that causes unrestricted classroom options. Render an empty/no-assigned-classroom state or pass an empty list that keeps the dropdown empty.
5. Ensure the Result Entry link is disabled/hidden or built only when the effective classroom and term are valid.
6. Update `brain/progress.md` with the fix and validation notes.

## Context To Read First
- brain/reviews/2026-06-12-staff-classroom-report-sheet-access-review.md
- brain/handoffs/ready/2026-06-12-staff-classroom-report-sheet-access-handoff.md
- brain/plans/2026-06-12-feature-staff-classroom-report-sheet-access.md
- apps/dashboard/src/components/teachers/teacher-report-sheet.tsx
- apps/dashboard/src/components/student-report-filters.tsx
- apps/dashboard/src/app/[domain]/(sidebar)/(k-12-teachers)/teacher/reports/page.tsx
- apps/dashboard/src/hooks/use-student-report-filter-params.ts
- apps/dashboard/src/hooks/use-report-page.ts
- brain/progress.md

## Acceptance Criteria
- Opening `/teacher/reports` as a teacher with assigned classrooms selects an assigned classroom by default and loads the report table for it.
- If the URL contains an unassigned/invalid `departmentId`, the teacher route replaces or clears it so the page does not keep using it.
- A teacher with no assigned classrooms does not see the full unrestricted classroom list.
- Admin academic reports still allow unrestricted classroom selection through the existing authorization model.
- Result Entry link is not emitted for an invalid or missing classroom/term combination.
- Existing report table, filters, print/export, and score-entry components remain reused.

## Do Not Change
- Do not duplicate `ClassroomResultTable`.
- Do not loosen API authorization.
- Do not change assessment calculation or print/export semantics.
- Do not move the task to done.

## Required Checks
- `git diff --check`
- `bun --filter @school-clerk/dashboard typecheck` if feasible; report known baseline errors separately.
- `bun --filter @school-clerk/api typecheck` if feasible; report known baseline errors separately.
- Manual or code-level verification of invalid `departmentId` handling.

## Brain Update Contract
- Update `brain/progress.md` with fix completion notes.
- Update `brain/api/permissions.md` only if authorization behavior changes.
- Keep the task in `brain/tasks/in-progress.md`.

## Completion Notes

- Changed files:
  - `apps/dashboard/src/components/teachers/teacher-report-sheet.tsx` — split into inner/outer to place `useStudentReportFilterParams` inside `ReportPageProvider`; added useEffect that seeds `departmentId` to first allowed classroom on mount, clears invalid `departmentId` not in allowed list, and clears `departmentId` when teacher has zero assigned classrooms
  - `apps/dashboard/src/components/student-report-filters.tsx` — added `isResultEntryAllowed` guard that only renders Result Entry link when `departmentId` and `termId` are both set and (if `allowedClassroomIds` provided) the classroom is in the allowed list
  - `apps/dashboard/src/app/[domain]/(sidebar)/(k-12-teachers)/teacher/reports/page.tsx` — removed `undefined` fallback for zero-assigned teachers; now always passes the classroom ID array (empty array = no classrooms, empty dropdown)
- Checks run:
  - `bun --filter @school-clerk/dashboard typecheck` — no new errors in changed files
- Brain docs updated:
  - `brain/progress.md` — updated with fix notes
- Unresolved issues:
  - Manual verification of teacher report sheet default classroom selection pending
  - Pre-existing dashboard type errors in unrelated files remain
