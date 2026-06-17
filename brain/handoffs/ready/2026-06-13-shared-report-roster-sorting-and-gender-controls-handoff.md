# Brain Handoff: Shared Report Roster Sorting And Gender Controls

## Status
Ready

## Source Plan
brain/plans/2026-06-12-ux-ui-shared-report-roster-sorting-and-gender-controls.md

## Task
- Task Title: Shared Report Roster Sorting And Gender Controls
- Task File: brain/tasks/in-progress.md

## Recommended Agent
- Agent: open-code
- Reason: Focused shared helper/component work with API mutation verification.

## Goal
Make assessment recording and classroom report sheet rosters use the same default order: male students first, then alphabetical names, with a gender picker column available in both table workflows.

## Context To Read First
- brain/plans/2026-06-12-ux-ui-shared-report-roster-sorting-and-gender-controls.md
- brain/features/assessment-results-and-sub-assessments.md
- brain/api/permissions.md
- apps/dashboard/src/components/assessment-recording-results-table.tsx
- apps/dashboard/src/components/classroom-result-table.tsx
- packages/assessment-results/src/index.ts
- apps/api/src/trpc/routers/students.routes.ts
- apps/api/src/db/queries/students.ts

## Implementation Instructions
1. Add or extend shared assessment-result roster sorting so both report tables can order rows by gender with `Male` first, then by display name.
2. Use the shared sort in `AssessmentRecordingResultsTable` and `ClassroomResultTable` without duplicating local ordering rules.
3. Add a compact student gender picker column near the student identity columns in both tables.
4. Reuse the existing `students.changeGender` mutation path or existing student-table gender update pattern.
5. Refetch or invalidate the relevant report data after a gender update so the visible gender and row order update.
6. Check sticky column offsets, duplicate-name badges, row selection, score editing, LTR layout, and RTL layout after inserting the new column.
7. Verify the gender update route is tenant-safe and role-appropriate; update permissions documentation if behavior changes or is clarified.

## Acceptance Criteria
- Assessment recording rows are ordered with Male students first, then Female students, with names sorted alphabetically within each gender group.
- Classroom report sheet rows use the same default ordering.
- Assessment recording includes a visible Gender column with controls to update the student's gender.
- Classroom report sheet includes the same gender update capability without breaking sticky columns, selection checkboxes, RTL/LTR layout, or score cells.
- Updating gender refreshes the visible table state and keeps the report query data consistent.
- Existing student score editing, print selection, and duplicate-name indicators still work.

## Files Or Areas Likely Involved
- packages/assessment-results/src/index.ts
- apps/dashboard/src/components/assessment-recording-results-table.tsx
- apps/dashboard/src/components/classroom-result-table.tsx
- apps/dashboard/src/components/tables/students/student-list-row.tsx
- apps/dashboard/src/components/tables/students/student-grid-card.tsx
- apps/api/src/trpc/routers/students.routes.ts
- apps/api/src/db/queries/students.ts

## Do Not Change
- Do not change score calculation semantics.
- Do not move the task to done.
- Do not broaden the scope beyond this handoff.

## Required Checks
- `bun --filter @school-clerk/dashboard typecheck`
- `bun --filter @school-clerk/api typecheck`
- Manual check: assessment recording row order and gender update behavior.
- Manual check: classroom report sheet row order and gender update behavior in LTR and RTL layouts.
- Manual check: gender update authorization does not allow cross-tenant or unauthorized updates.

## Queue Item
/Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-13-school-clerk-shared-report-roster-sorting-and-gender-controls.json

## Brain Update Contract
After implementation, update only the relevant files:

- `brain/progress.md`: summarize completed implementation work.
- `brain/features/assessment-results-and-sub-assessments.md`: update if roster sorting or gender update behavior is formalized.
- `brain/api/permissions.md`: update if gender update authorization is changed or clarified.
- `brain/api/endpoints.md`: update if API routes changed.
- `brain/api/contracts.md`: update if request/response shapes changed.
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
