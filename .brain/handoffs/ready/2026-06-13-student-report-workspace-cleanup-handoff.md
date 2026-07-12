# Brain Handoff: Student Report Workspace Cleanup

## Status
Ready

## Source Plan
brain/plans/2026-06-12-ux-ui-student-report-workspace-cleanup.md

## Task
- Task Title: Student Report Workspace Cleanup
- Task File: brain/tasks/in-progress.md

## Recommended Agent
- Agent: open-code
- Reason: Contained report shell/filter/table cleanup with existing cookie behavior to preserve.

## Goal
Collapse the student report page into the classroom report workflow, remove outdated print/result-entry controls, clean up mobile spacing and top configuration layout, and preserve layout direction cookie persistence.

## Context To Read First
- brain/plans/2026-06-12-ux-ui-student-report-workspace-cleanup.md
- brain/plans/2026-06-12-ux-ui-shared-report-roster-sorting-and-gender-controls.md
- brain/features/assessment-results-and-sub-assessments.md
- apps/dashboard/src/app/[domain]/(sidebar)/(student-result-portal)/student-report/student-report-view.tsx
- apps/dashboard/src/hooks/use-student-report-filter-params.ts
- apps/dashboard/src/components/student-report-filters.tsx
- apps/dashboard/src/components/classroom-result-table.tsx
- apps/dashboard/src/actions/cookies/student-report.ts

## Implementation Instructions
1. Remove the Print View tab/list from the student report view so the classroom report sheet workflow is the primary surface.
2. Remove or migrate the `tab` query-param behavior so `tab=print` URLs do not strand users on a missing state.
3. Keep selected-student print behavior working from the classroom workflow, including `PrintSelectionFooter` and hidden print output.
4. Remove the long layout/export description beginning "Switch between left-to-right and right-to-left layouts...".
5. Reorganize `ClassroomResultTable` top controls into compact responsive groups for desktop and mobile.
6. Preserve `classroomLayout` cookie behavior through `updateStudentReportCookieByName` and server-provided defaults.
7. Reduce mobile horizontal padding for the student report page and classroom result content.
8. Remove the Result Entry CTA from the admin student report page.
9. Make staff/teacher report CTA text read "Assessment Recording" and link to `/assessment-recording` only when classroom and term state is valid.

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

## Files Or Areas Likely Involved
- apps/dashboard/src/app/[domain]/(sidebar)/(student-result-portal)/student-report/student-report-view.tsx
- apps/dashboard/src/hooks/use-student-report-filter-params.ts
- apps/dashboard/src/components/student-report-filters.tsx
- apps/dashboard/src/components/classroom-result-table.tsx
- apps/dashboard/src/components/print-selection-footer.tsx
- apps/dashboard/src/actions/cookies/student-report.ts
- apps/dashboard/src/components/teachers/teacher-report-sheet.tsx
- apps/dashboard/src/components/nav-layout-client.tsx

## Do Not Change
- Do not remove selected-student printing from the classroom workflow.
- Do not break layout cookie persistence.
- Do not move the task to done.
- Do not broaden the scope beyond this handoff.

## Required Checks
- `bun --filter @school-clerk/dashboard typecheck`
- Manual check: `/student-report` at mobile and desktop widths.
- Manual check: selected student print flow still renders report cards.
- Manual check: changing LTR/RTL persists after reload.
- Manual check: admin student report has no Result Entry CTA.
- Manual check: teacher/staff reports show "Assessment Recording" only for valid classroom and term state.

## Queue Item
/Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-13-school-clerk-student-report-workspace-cleanup.json

## Brain Update Contract
After implementation, update only the relevant files:

- `brain/progress.md`: summarize completed implementation work.
- `brain/features/assessment-results-and-sub-assessments.md`: update if the student report workflow is formalized as classroom-first.
- `brain/api/endpoints.md`: update if API routes changed.
- `brain/api/contracts.md`: update if request/response shapes changed.
- `brain/api/permissions.md`: update if auth or permissions changed.
- `brain/database/schema.md`: update if schema changed.
- `brain/database/migrations.md`: update if migrations changed.
- `brain/decisions/`: add an ADR only if an architecture decision was made.
- `brain/tasks/in-progress.md`: keep the task in progress.

Do not move the task to `done`. `brain-review-handoff` owns final approval.

## Completion Notes
Fill this in after implementation:

- Changed files:
- Checks run:
- Brain docs updated:
- Unresolved issues:
