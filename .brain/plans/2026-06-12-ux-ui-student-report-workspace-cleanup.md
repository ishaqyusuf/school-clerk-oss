# Plan: Student Report Workspace Cleanup

## Type
UX/UI

## Status
Done

## Created Date
2026-06-12

## Last Updated
2026-06-15

## Intake
- Intake File: brain/intake/2026-06-12-report-pages-and-sidebar-polish.md
- Intake Item: Student report page mobile spacing, tab removal, top-control cleanup, layout cookie preservation, and Result Entry CTA removal/rename behavior.

## Goal Or Problem
The student report page should open directly into the classroom report workflow, because the classroom tab already supports selecting students for print. The old Print View tab and long explanatory copy add clutter, mobile spacing is too wide, top controls need a cleaner layout, the layout direction preference should continue to persist in a cookie, and the admin-facing Result Entry CTA should be removed. Staff-facing report access should label the score-entry CTA as Assessment Recording instead of Result Entry.

## Current Context
- `apps/dashboard/src/app/[domain]/(sidebar)/(student-result-portal)/student-report/student-report-view.tsx` renders `Tabs` with `print` and `classroom-results`; the query param defaults to `print`.
- `apps/dashboard/src/hooks/use-student-report-filter-params.ts` defines `tab` with default `"print"`.
- `apps/dashboard/src/components/student-report-filters.tsx` renders term/classroom controls and a `Result Entry` CTA.
- `apps/dashboard/src/components/classroom-result-table.tsx` contains layout direction controls, totals-only mode, print/export actions, the long description, and `updateStudentReportCookieByName("classroomLayout", ...)`.
- `apps/dashboard/src/actions/cookies/student-report.ts` already persists `classroomLayout`.
- The completed Staff Classroom Report Sheet Access work reuses the report filter surface for staff/teacher report access.

## Proposed Approach
Collapse the student report page to the classroom results workflow as the primary surface. Remove the Print View tab UI and default tab behavior, keep print selection and `PrintSelectionFooter` available from the classroom table, tighten mobile spacing, and reorganize filters/configuration into compact responsive groups. Make the report filter CTA configurable so admin student report hides it while staff report pages can show an Assessment Recording link.

## Implementation Steps
- Remove the Print View tab and tab list from `StudentReportView`/`ReportContent`, or make the page render only the classroom result table as the active workflow.
- Update `use-student-report-filter-params.ts` so the page no longer defaults to `print`; remove or migrate the `tab` param if no longer needed.
- Ensure `Reports printMode` still renders for browser print output when selected students are printed through the existing classroom workflow.
- Remove the long `ClassroomResultTable` description beginning "Switch between left-to-right and right-to-left layouts..."
- Reorganize the top controls in `ClassroomResultTable`: layout direction, totals-only mode, print empty sheet, print spreadsheet, export, search, subject filters, and row counts should be compact, scannable, and mobile-friendly.
- Preserve existing `student-report` cookie behavior for `classroomLayout`, including reading `defaultClassroomLayout` server-side and saving changes through `updateStudentReportCookieByName`.
- Reduce mobile horizontal padding for the student report route and classroom results content; account for the global dashboard shell `px-6` wrapper if needed.
- Remove the Result Entry CTA from the admin student report page.
- Update the staff/teacher report use of `StudentReportFilter` so any score-entry CTA is labeled "Assessment Recording" and links to `/assessment-recording` only when classroom and term are valid.
- Coordinate with `brain/plans/2026-06-12-ux-ui-shared-report-roster-sorting-and-gender-controls.md` for the report sheet gender column and default row order.

## Affected Files Or Areas
- `apps/dashboard/src/app/[domain]/(sidebar)/(student-result-portal)/student-report/student-report-view.tsx`
- `apps/dashboard/src/hooks/use-student-report-filter-params.ts`
- `apps/dashboard/src/components/student-report-filters.tsx`
- `apps/dashboard/src/components/classroom-result-table.tsx`
- `apps/dashboard/src/components/print-selection-footer.tsx`
- `apps/dashboard/src/actions/cookies/student-report.ts`
- `apps/dashboard/src/components/teachers/teacher-report-sheet.tsx`
- `apps/dashboard/src/components/nav-layout-client.tsx`
- `brain/features/assessment-results-and-sub-assessments.md`
- `brain/progress.md`

## Acceptance Criteria
- Student report no longer shows a Print View tab.
- Student report opens directly into the classroom results/report sheet workflow.
- Selecting students for print and printing selected report cards still works from the classroom workflow.
- The long layout/export description is removed.
- Top configuration controls are cleaner on desktop and stack without overflow on mobile.
- Layout direction changes still persist through the `student-report` cookie and survive reload.
- Admin student report no longer shows a Result Entry CTA.
- Staff/teacher report surfaces show "Assessment Recording" instead of "Result Entry" when the score-entry link is available.
- Student report mobile horizontal padding is reduced and table content remains usable.

## Test Plan
- Run `bun --filter @school-clerk/dashboard typecheck`.
- Manually verify `/student-report` on mobile and desktop widths.
- Manually verify selected student print flow still renders report cards.
- Manually verify changing LTR/RTL persists after reload.
- Manually verify the admin student report has no Result Entry CTA.
- Manually verify teacher/staff reports show "Assessment Recording" only for valid classroom and term state.

## Brain Update Requirements
- Update `brain/features/assessment-results-and-sub-assessments.md` if the student report workflow is formalized as classroom-first.
- Update `brain/progress.md` or the active progress file after implementation.

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
- Removing the tab must not break hidden print rendering for selected students.
- Query strings that currently include `tab=print` should not strand users on a missing state.
- The shared `StudentReportFilter` is used by staff and admin contexts, so CTA visibility should be prop-driven or context-aware rather than hardcoded.
- Global shell padding may still affect mobile spacing after page-local padding is reduced.

## Open Questions
- None.

## Linked Task
- Task Title: Student Report Workspace Cleanup
- Task File: brain/tasks/roadmap.md
