# Plan: Shared Report Roster Sorting And Gender Controls

## Type
UX/UI

## Status
Proposed

## Created Date
2026-06-12

## Last Updated
2026-06-12

## Intake
- Intake File: brain/intake/2026-06-12-report-pages-and-sidebar-polish.md
- Intake Item: Sort report/assessment student lists alphabetically with male students first and add a gender picker column for updates in both assessment recording and report sheet tables.

## Goal Or Problem
Assessment recording and classroom report sheet tables should present the same predictable roster order and allow quick correction of a student's gender from the report workflow. The default list should group male students first and sort students alphabetically within each gender group.

## Current Context
- `apps/api/src/db/queries/report-sheet.ts` already loads `student.gender` and orders term forms by `student.gender` then `student.name`.
- `packages/assessment-results/src/index.ts` exposes student display helpers, `filterResultStudents`, and `buildResultRows`; both `AssessmentRecordingResultsTable` and `ClassroomResultTable` use these shared helpers.
- `apps/dashboard/src/components/assessment-recording-results-table.tsx` renders assessment score rows.
- `apps/dashboard/src/components/classroom-result-table.tsx` renders the classroom report sheet rows.
- `apps/api/src/trpc/routers/students.routes.ts` already exposes `students.changeGender`, backed by `apps/api/src/db/queries/students.ts`.
- Existing student list UI already has gender update patterns in `apps/dashboard/src/components/tables/students/student-list-row.tsx` and `student-grid-card.tsx`.

## Proposed Approach
Add a small shared roster ordering helper and a reusable dashboard gender picker cell, then use them in both report tables. Keep the mutation path on the existing `students.changeGender` procedure, invalidate the relevant classroom report query after update, and preserve the current score-entry behavior.

## Implementation Steps
- Add or extend a shared helper in `packages/assessment-results/src/index.ts` to sort `StudentTermRecord` or `ResultRow` values by gender with `Male` before `Female`, then by display name using `localeCompare`.
- Use that helper before rendering rows in both `AssessmentRecordingResultsTable` and `ClassroomResultTable`, avoiding divergent local sorting rules.
- Build a compact `StudentGenderCell` dashboard component or reuse an existing student-table gender control pattern with `students.changeGender`.
- Add a Gender column near the student identity columns in `AssessmentRecordingResultsTable`.
- Add a Gender column near the sticky student identity columns in `ClassroomResultTable`, making sure sticky offsets and RTL/LTR layout still align.
- Invalidate or refetch classroom report sheet data after gender updates so both the visible gender and default sort order update without a full page refresh.
- Ensure duplicate-name badges and print-selection checkboxes still align after the new column is inserted.
- Confirm the API remains tenant-safe; if the existing public procedure needs role/tenant hardening, update it within the same behavior boundary or document the follow-up risk.

## Affected Files Or Areas
- `packages/assessment-results/src/index.ts`
- `apps/dashboard/src/components/assessment-recording-results-table.tsx`
- `apps/dashboard/src/components/classroom-result-table.tsx`
- `apps/dashboard/src/components/tables/students/student-list-row.tsx`
- `apps/dashboard/src/components/tables/students/student-grid-card.tsx`
- `apps/api/src/trpc/routers/students.routes.ts`
- `apps/api/src/db/queries/students.ts`
- `brain/api/permissions.md`
- `brain/features/assessment-results-and-sub-assessments.md`
- `brain/progress.md`

## Acceptance Criteria
- Assessment recording rows are ordered with Male students first, then Female students, with names sorted alphabetically within each gender group.
- Classroom report sheet rows use the same default ordering.
- Assessment recording includes a visible Gender column with controls to update the student's gender.
- Classroom report sheet includes the same gender update capability without breaking sticky columns, selection checkboxes, RTL/LTR layout, or score cells.
- Updating gender refreshes the visible table state and keeps the report query data consistent.
- Existing student score editing, print selection, and duplicate-name indicators still work.

## Test Plan
- Run `bun --filter @school-clerk/dashboard typecheck`.
- Run `bun --filter @school-clerk/api typecheck`.
- Manually verify assessment recording row order and gender update behavior.
- Manually verify classroom report sheet row order and gender update behavior in both LTR and RTL layouts.
- Manually verify the gender update mutation does not expose cross-tenant or unauthorized update behavior.

## Brain Update Requirements
- Update `brain/features/assessment-results-and-sub-assessments.md` if the report/recording roster behavior is formalized there.
- Update `brain/api/permissions.md` if gender update authorization is changed or clarified.
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
- Sticky table column offsets can become misaligned after inserting the Gender column, especially in RTL mode.
- The existing `students.changeGender` route is currently a public procedure; implementation must verify whether it is safe in the current auth model or tighten/document it.
- Sorting after gender mutation may move the edited row, which is expected but should not discard unsaved score edits.

## Open Questions
- None.

## Linked Task
- Task Title: Shared Report Roster Sorting And Gender Controls
- Task File: brain/tasks/roadmap.md
