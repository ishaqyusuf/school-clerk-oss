# Plan: Admin Empty Classroom Report Spreadsheet Print

## Type
Feature

## Status
Done

## Created Date
2026-06-12

## Last Updated
2026-06-15

## Intake
- Intake File: brain/intake/2026-06-12-classroom-report-sheet-access-and-empty-print.md
- Intake Item: Admin should be able to print an empty classroom report spreadsheet with a polished header for manual record keeping.

## Goal Or Problem
Admins need a printable blank classroom report spreadsheet that uses the current classroom report sheet structure but omits recorded scores so the school can keep manual paper records. The printout should have a polished school/report header similar to the existing result print, not just a raw browser table.

## Current Context
- `apps/dashboard/src/components/classroom-result-table.tsx` already has `printSpreadsheet`, but it prints current score values and uses a minimal heading.
- The existing classroom result grid already knows the selected classroom, visible subjects, assessment columns, students, layout direction, and totals-only state.
- `apps/dashboard/src/components/student-report-page.tsx`, `packages/pdf/src/result/**`, and the student result print/PDF route provide design references for polished result headers.
- `apps/dashboard/src/app/api/pdf/result/route.ts` uses `getClassroomReportSheet` to generate result print data.
- The requested output is for manual record keeping, so blank score cells should remain writable on paper while student names and assessment headers remain visible.

## Proposed Approach
Add an admin-only empty print action to the classroom report sheet workflow. Generate a print window or printable component that reuses the same subject/assessment column model as the active report sheet, but renders score/total cells blank. The header should include school identity when available, report title, classroom, term/session, print date, and optional metadata such as totals-only/full assessment mode. Keep it browser-printable first unless the existing result PDF pipeline has a lightweight reusable header component that can be shared without making the task too large.

## Implementation Steps
- Inspect the current student result print/PDF header and identify reusable school identity fields, typography, and layout conventions.
- Add a separate "Print Empty Sheet" action near the existing "Print Spreadsheet" action in `ClassroomResultTable`, visible only to admin or authorized academic/report users.
- Build a helper that generates print headers from available context: school name/logo if accessible, classroom name, term/session label, report title, generated date, and layout direction.
- Generate the empty spreadsheet using the active classroom roster and visible subject/assessment columns, but render all score, subject total, grand total, and percentage cells blank.
- Preserve the selected layout direction and subject/totals-only visibility so admins can print the exact manual sheet they need.
- Use print-specific CSS for a professional paper layout: compact borders, repeated table headers, clear section title, readable column groups, page margins, and no app controls.
- Ensure the printed document is usable when there are many subjects/assessment columns, including landscape-friendly styling and small but readable cell sizing.
- Do not save a result print log for empty manual sheets unless product explicitly wants manual-sheet print tracking.
- Add graceful empty states for missing classroom, missing students, or missing assessment columns.
- Update Brain docs after implementation.

## Affected Files Or Areas
- `apps/dashboard/src/components/classroom-result-table.tsx`
- `apps/dashboard/src/hooks/use-report-page.ts`
- `apps/dashboard/src/components/student-report-page.tsx`
- `packages/pdf/src/result/**`
- `apps/dashboard/src/app/api/pdf/result/route.ts`
- `apps/dashboard/src/utils/tenant-page-metadata.ts`
- Role/permission helpers for admin-only control visibility, TODO: identify exact helper during implementation
- `brain/features/assessment-results-and-sub-assessments.md`
- `brain/progress.md` or current progress tracking file

## Acceptance Criteria
- Admin users can print an empty classroom report spreadsheet from the classroom report sheet workflow.
- The printout includes a polished header with school/report identity, classroom, term/session, and print date where those values are available.
- Student names and assessment/subject columns are present, but all score and total cells are blank for manual entry.
- The empty print respects current filters such as selected classroom, selected subjects, totals-only/full assessment mode, and layout direction.
- Non-admin staff do not see the admin-only empty print action unless explicitly authorized by an existing permission model.
- The current filled "Print Spreadsheet" behavior remains available and unchanged.
- The print layout is readable on paper and does not include dashboard navigation, buttons, filters, or app chrome.

## Test Plan
- Run `bun --filter @school-clerk/dashboard typecheck`.
- Manually verify the empty print action as an admin on a classroom with students and assessments.
- Manually verify printed cells are blank even when scores already exist in the classroom report sheet.
- Manually verify filled spreadsheet printing still includes score values.
- Manually verify a teacher/non-admin account cannot see the empty print action.
- Manually verify long/wide assessment sheets remain printable without overlapping header/table content.

## Brain Update Requirements
- Update `brain/progress.md` or the active progress tracking file with the completed empty print workflow.
- Update `brain/features/assessment-results-and-sub-assessments.md` if blank manual sheet print rules are formalized.
- Update `brain/api/permissions.md` if a new admin/report permission is introduced.

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
- Very wide assessment sheets may need landscape print guidance or reduced font sizing.
- School identity/logo may not be available in the existing report page context and may need a small query/context extension.
- The current classroom table includes editable score cells; the print helper must avoid rendering interactive controls.
- Full dashboard typecheck may be blocked by a pre-existing unrelated parse error noted in `brain/tasks/in-progress.md`.

## Open Questions
- None.

## Linked Task
- Task Title: Admin Empty Classroom Report Spreadsheet Print
- Task File: brain/tasks/in-progress.md
