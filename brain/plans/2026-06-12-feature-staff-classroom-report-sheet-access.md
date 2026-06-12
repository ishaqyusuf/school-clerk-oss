# Plan: Staff Classroom Report Sheet Access

## Type
Feature

## Status
Done

## Created Date
2026-06-12

## Last Updated
2026-06-12

## Intake
- Intake File: brain/intake/2026-06-12-classroom-report-sheet-access-and-empty-print.md
- Intake Item: Staff should be able to view and work with the classroom report sheet table structure from the report page.

## Goal Or Problem
Staff users need a classroom report sheet workspace where they can view the same classroom results table used by the report page, filter by term/classroom/subject/student, manage assessment columns, and enter or review scores without needing to use an admin-only report workflow.

## Current Context
- `apps/dashboard/src/components/classroom-result-table.tsx` already renders a classroom report grid with subject assessment columns, score cells, filters, sorting, totals-only mode, print spreadsheet, and CSV export.
- `apps/dashboard/src/hooks/use-report-page.ts` loads classroom sheets through `assessments.getClassroomReportSheet`.
- `apps/api/src/db/queries/report-sheet.ts` currently calls `assertTeacherCanAccessClassroomDepartment`, so teacher users are scoped to assigned classrooms while non-teacher roles continue through broader application access.
- `apps/dashboard/src/app/[domain]/(sidebar)/(k-12-teachers)/teacher/reports/page.tsx` renders `TeacherReportsPanel`, but that panel currently shows assigned classrooms instead of the reusable report sheet grid.
- `apps/dashboard/src/app/[domain]/(sidebar)/academic/reports/page.tsx` is still a "Coming soon" page.
- `brain/features/assessment-results-and-sub-assessments.md` defines the target report sheet and assessment behavior, including classroom review, scoreable items, printable columns, and assessment ordering.
- Existing in-progress task `ASMT-001` covers assessment/result correctness. This plan should integrate with that work rather than changing assessment semantics independently.

## Proposed Approach
Expose the classroom report sheet workflow to staff through the teacher/staff reports workspace while preserving existing classroom authorization. Reuse the existing report page context, filter params, and `ClassroomResultTable` instead of building a second table. For teacher users, default/filter classroom choices to assigned classrooms. For admins or authorized academic staff, keep access aligned with the existing dashboard role and classroom loading behavior.

## Implementation Steps
- Identify the current route that owns the full report sheet experience, likely the student-result portal report page and `ClassroomResultTable`.
- Extract any page-level provider or layout wrapper needed to reuse `StudentReportFilter`, `ReportPageProvider`, and `ClassroomResultTable` in staff/teacher routes without duplicating table logic.
- Replace or extend `TeacherReportsPanel` so assigned staff can open the report sheet for assigned classrooms.
- Ensure the teacher report route passes a valid default term and initializes the classroom selector from assigned classrooms where possible.
- Keep `assessments.getClassroomReportSheet` protected by `assertTeacherCanAccessClassroomDepartment` for teacher users.
- Confirm score editing in `AssessmentResultsScoreCell` and assessment management in `SubjectAssessments` continue to honor subject/classroom teacher authorization.
- If the academic reports page is intended for admin staff, wire it to the same reusable report sheet shell instead of leaving the page as "Coming soon".
- Ensure filters include term, classroom, subject, student search, totals-only mode, and print/export controls as appropriate for the staff-facing route.
- Update navigation/metadata labels where needed so staff can find "Reports" or "Classroom Report Sheet" from the teacher/staff workspace.
- Record the completed behavior in Brain progress and, if behavior materially changes assessment access, update `brain/api/permissions.md`.

## Affected Files Or Areas
- `apps/dashboard/src/app/[domain]/(sidebar)/(k-12-teachers)/teacher/reports/page.tsx`
- `apps/dashboard/src/components/teachers/workspace-pages.tsx`
- `apps/dashboard/src/components/classroom-result-table.tsx`
- `apps/dashboard/src/components/student-report-filters.tsx`
- `apps/dashboard/src/hooks/use-report-page.ts`
- `apps/dashboard/src/app/[domain]/(sidebar)/academic/reports/page.tsx`
- `apps/api/src/db/queries/report-sheet.ts`
- `apps/api/src/lib/teacher-authorization.ts`
- `apps/dashboard/src/utils/tenant-page-metadata.ts`
- `brain/api/permissions.md`
- `brain/progress.md` or current progress tracking file

## Acceptance Criteria
- A teacher/staff user with assigned classrooms can open the reports workspace and view the classroom report sheet table for an assigned classroom.
- The table shows students, subjects, assessment columns, subject totals, grand total, and percentage using the same calculation behavior as the existing report page.
- Staff can filter/search the report sheet without leaving the staff workspace.
- Staff can access score entry or editable score cells only within authorized classrooms/subjects.
- A teacher/staff user cannot load a classroom report sheet for an unassigned classroom.
- Admin or authorized academic staff can still view classroom report sheets without being restricted to teacher assignments.
- The old "Coming soon" reports surface is replaced or linked to the usable report sheet workflow.
- No duplicate report table implementation is introduced.

## Test Plan
- Run `bun --filter @school-clerk/dashboard typecheck`.
- Run `bun --filter @school-clerk/api typecheck`.
- Manually verify `/teacher/reports` as a teacher with assigned classrooms.
- Manually verify a teacher cannot access a report sheet for an unassigned classroom by changing the classroom query param.
- Manually verify an admin can access the classroom report sheet from the admin academic reports/report page.
- Manually verify score entry, assessment setup, filters, print spreadsheet, and export controls still work from the reused table.

## Brain Update Requirements
- Update `brain/progress.md` or the active progress tracking file with the completed staff classroom report sheet access.
- Update `brain/api/permissions.md` if staff/report authorization behavior changes.
- Update `brain/features/assessment-results-and-sub-assessments.md` if the classroom report sheet access model or report workflow changes materially.

## Lower-Agent Readiness
- Implementation scope is clear: Yes
- File boundaries are clear: Yes
- Acceptance criteria are observable: Yes
- Required checks are listed: Yes
- Brain update requirements are listed: Yes
- Ready for handoff: Yes

## Completion Report Requirements
Lower agent must report:
- Changed files
- Checks run
- Brain docs updated
- Unresolved issues
- Any skipped acceptance criteria

## Risks / Edge Cases
- The current report page may depend on route-level context that needs a small reusable shell extraction.
- Teachers may have classroom assignments but only subject-level score permissions; score editing must not accidentally broaden access.
- Existing ASMT-001 work may change assessment ordering/printable column behavior; coordinate rather than duplicating logic.
- Full dashboard typecheck may be blocked by a pre-existing unrelated parse error noted in `brain/tasks/in-progress.md`.

## Open Questions
- None.

## Linked Task
- Task Title: Staff Classroom Report Sheet Access
- Task File: brain/tasks/in-progress.md
