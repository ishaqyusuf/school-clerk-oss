# Brain Handoff Review: Staff Classroom Report Sheet Access

Created: 2026-06-12 15:35 WAT

## Reviewed Handoff
`brain/handoffs/ready/2026-06-12-staff-classroom-report-sheet-access-handoff.md`

## Queue Item
`/Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-school-clerk-staff-report-sheet-access.json`

## Execution Path
`/Users/M1PRO/Documents/code/school-clerk`

## Source Plan
`brain/plans/2026-06-12-feature-staff-classroom-report-sheet-access.md`

## Result
Needs Fix

## Findings
- [P1] `apps/dashboard/src/components/teachers/teacher-report-sheet.tsx:23` only seeds `termId`; it never seeds `departmentId` to one of the teacher's assigned classrooms. A teacher opening `/teacher/reports` lands on the reused report table with no classroom selected, so the primary acceptance criterion ("can open the reports workspace and view the classroom report sheet table for an assigned classroom") is not met without extra manual selection.
- [P1] `apps/dashboard/src/components/student-report-filters.tsx:116` filters the dropdown options, but it leaves an existing URL `departmentId` untouched when that id is not in `allowedClassroomIds`. That means a teacher can keep an out-of-scope classroom in the filter state and the Result Entry link at line 141 is built directly from that value. The API report query may reject unauthorized report reads, but the staff workspace itself should correct or clear invalid classroom state before rendering controls/links from it.
- [P2] `apps/dashboard/src/app/[domain]/(sidebar)/(k-12-teachers)/teacher/reports/page.tsx:20` passes `undefined` when a teacher has zero assigned classrooms. In `StudentReportFilter`, `undefined` means "show all classrooms", so an unassigned teacher sees the unrestricted classroom list instead of an empty/no-assigned-classroom state.

## Acceptance Criteria Check
- Teacher/staff user with assigned classrooms can open reports and view the table for an assigned classroom: Fail; no assigned classroom is selected by default.
- Table reuses existing calculation behavior: Pass by implementation reuse.
- Staff can filter/search without leaving workspace: Partial; classroom filtering exists, but invalid URL state is not corrected.
- Staff editable score access remains authorized: Partial; underlying API authorization remains, but the Result Entry link can be generated for an invalid classroom id.
- Teacher cannot load an unassigned classroom: Partial; backend should reject, but UI does not prevent or repair invalid filter state.
- Admin/academic staff can view report sheets without teacher assignment restriction: Pass by unconstrained academic route.
- "Coming soon" reports surface replaced: Pass.
- No duplicate report table implementation: Pass.

## Checks
- `bun --filter @school-clerk/dashboard typecheck`: Fail on pre-existing baseline errors in finance, Prisma/client compatibility, sidebar/nav, and related unrelated files. No clear new error in the touched report files was observed.
- `bun --filter @school-clerk/api typecheck`: Fail on pre-existing baseline errors in enrollment, finance, student-fee, students, academics, and classroom routes.
- `git diff --check`: Pass.

## Brain Update Check
- `brain/progress.md`: Present.
- `brain/tasks/in-progress.md`: Present.
- Other Brain docs: No API contract/schema changes required.

## Decision
The implementation correctly starts reusing the existing report sheet components, but it does not yet make the teacher report page safely open on an assigned classroom or sanitize invalid classroom filter state. Create a small follow-up handoff rather than broadening the task.

## Follow-Up
- `brain/handoffs/fixes/2026-06-12-staff-classroom-report-sheet-access-fix-1.md`
