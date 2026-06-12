# Brain Handoff: Staff Classroom Report Sheet Access

## Status
Ready

## Source Plan
brain/plans/2026-06-12-feature-staff-classroom-report-sheet-access.md

## Task
- Task Title: Staff Classroom Report Sheet Access
- Task File: brain/tasks/in-progress.md

## Recommended Agent
- Agent: open-code
- Reason: This work crosses dashboard route composition, tRPC authorization behavior, and focused reuse of existing report-sheet components.

## Goal
Give authorized staff, especially teachers with assigned classrooms, a usable classroom report sheet workspace that reuses the existing report table, filters, assessment setup, and score-entry behavior while preserving classroom/subject access controls.

## Context To Read First
- brain/plans/2026-06-12-feature-staff-classroom-report-sheet-access.md
- brain/features/assessment-results-and-sub-assessments.md
- brain/api/permissions.md
- apps/dashboard/src/components/classroom-result-table.tsx
- apps/dashboard/src/hooks/use-report-page.ts
- apps/dashboard/src/components/student-report-filters.tsx
- apps/dashboard/src/components/teachers/workspace-pages.tsx
- apps/dashboard/src/app/[domain]/(sidebar)/(k-12-teachers)/teacher/reports/page.tsx
- apps/dashboard/src/app/[domain]/(sidebar)/academic/reports/page.tsx
- apps/api/src/db/queries/report-sheet.ts
- apps/api/src/lib/teacher-authorization.ts

## Implementation Instructions
1. Find the current full classroom report sheet route/shell that provides `ReportPageProvider`, `StudentReportFilter`, and `ClassroomResultTable`.
2. Extract a reusable report-sheet shell only if needed; keep table logic centralized in the existing report components.
3. Replace or extend the teacher reports workspace so a teacher can open and use the report sheet for assigned classrooms.
4. Default or constrain the teacher classroom selector to assigned classrooms where the existing teacher workspace data makes that possible.
5. Keep `assessments.getClassroomReportSheet` protected by `assertTeacherCanAccessClassroomDepartment` for teacher users.
6. Verify score cells and assessment management still honor subject/classroom access. Do not broaden teacher write access.
7. Wire the admin academic reports surface to the same reusable report sheet workflow instead of leaving it as "Coming soon", if this is the intended admin entry point.
8. Preserve term, classroom, student search, subject filtering, totals-only mode, print, and export behavior where those controls already exist.
9. Update page metadata/navigation labels only as needed to make the workflow discoverable.
10. Update the allowed Brain docs from the Brain Update Contract after implementation.

## Acceptance Criteria
- A teacher/staff user with assigned classrooms can open the reports workspace and view the classroom report sheet table for an assigned classroom.
- The table shows students, subjects, assessment columns, subject totals, grand total, and percentage using the same calculation behavior as the existing report page.
- Staff can filter/search the report sheet without leaving the staff workspace.
- Staff can access score entry or editable score cells only within authorized classrooms/subjects.
- A teacher/staff user cannot load a classroom report sheet for an unassigned classroom.
- Admin or authorized academic staff can still view classroom report sheets without being restricted to teacher assignments.
- The old "Coming soon" reports surface is replaced or linked to the usable report sheet workflow.
- No duplicate report table implementation is introduced.

## Files Or Areas Likely Involved
- apps/dashboard/src/app/[domain]/(sidebar)/(k-12-teachers)/teacher/reports/page.tsx
- apps/dashboard/src/components/teachers/workspace-pages.tsx
- apps/dashboard/src/components/classroom-result-table.tsx
- apps/dashboard/src/components/student-report-filters.tsx
- apps/dashboard/src/hooks/use-report-page.ts
- apps/dashboard/src/app/[domain]/(sidebar)/academic/reports/page.tsx
- apps/api/src/db/queries/report-sheet.ts
- apps/api/src/lib/teacher-authorization.ts
- apps/dashboard/src/utils/tenant-page-metadata.ts
- brain/api/permissions.md
- brain/features/assessment-results-and-sub-assessments.md
- brain/progress.md

## Do Not Change
- Do not duplicate the classroom report table into a second independent implementation.
- Do not loosen teacher authorization for unassigned classrooms or subjects.
- Do not change assessment print/weighting semantics beyond what is needed for this access workflow.
- Do not move the task to done.
- Do not broaden the scope beyond this handoff.

## Required Checks
- `bun --filter @school-clerk/dashboard typecheck`
- `bun --filter @school-clerk/api typecheck`
- Manual verification of `/teacher/reports` as a teacher with assigned classrooms.
- Manual verification that a teacher cannot access an unassigned classroom by changing the classroom query param.
- Manual verification that an admin can access the classroom report sheet from the admin academic reports/report page.
- Manual verification that score entry, assessment setup, filters, print spreadsheet, and export controls still work from the reused table.

## Queue Item
/Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-school-clerk-staff-report-sheet-access.json

## Brain Update Contract
After implementation, update only the relevant files:

- `brain/progress.md`: summarize completed implementation work.
- `brain/features/assessment-results-and-sub-assessments.md`: update if user-visible report-sheet behavior changed.
- `brain/api/endpoints.md`: update if API routes changed.
- `brain/api/contracts.md`: update if request/response shapes changed.
- `brain/api/permissions.md`: update if auth or permissions changed.
- `brain/database/schema.md`: update if schema changed.
- `brain/database/migrations.md`: update if migrations changed.
- `brain/decisions/`: add an ADR only if an architecture decision was made.
- `brain/tasks/in-progress.md`: keep the task in progress.

Do not move the task to `done`. `brain-review-handoff` owns final approval.

## Completion Notes

- Changed files:
  - `apps/dashboard/src/components/student-report-filters.tsx` — added optional `allowedClassroomIds` prop to filter classroom dropdown
  - `apps/dashboard/src/components/teachers/teacher-report-sheet.tsx` — new reusable report sheet client component
  - `apps/dashboard/src/app/[domain]/(sidebar)/(k-12-teachers)/teacher/reports/page.tsx` — replaced TeacherReportsPanel with TeacherReportSheet
  - `apps/dashboard/src/app/[domain]/(sidebar)/academic/reports/page.tsx` — replaced "Coming soon" with TeacherReportSheet
- Checks run:
  - `bun --filter @school-clerk/dashboard typecheck` — no new errors in changed files; pre-existing errors in unrelated files remain
  - `bun --filter @school-clerk/api typecheck` — no new errors; pre-existing errors in unrelated files remain
- Brain docs updated:
  - `brain/progress.md` — created with implementation summary
- Unresolved issues:
  - Manual verification of teacher access with assigned classrooms pending (requires running dev server)
  - Manual verification that teacher cannot access unassigned classroom pending
  - Manual verification of admin access from academic reports page pending
  - Pre-existing dashboard type errors in finance, Prisma compatibility, and sidebar modules remain
