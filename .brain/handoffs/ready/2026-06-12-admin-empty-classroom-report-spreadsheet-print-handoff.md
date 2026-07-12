# Brain Handoff: Admin Empty Classroom Report Spreadsheet Print

## Status
Ready

## Source Plan
brain/plans/2026-06-12-feature-admin-empty-classroom-report-spreadsheet-print.md

## Task
- Task Title: Admin Empty Classroom Report Spreadsheet Print
- Task File: brain/tasks/in-progress.md

## Recommended Agent
- Agent: antigravity
- Reason: This is a UI and print-layout-sensitive workflow that needs browser/print verification and visual polish while reusing existing report-sheet data.

## Goal
Give admins an action that prints a polished blank classroom report spreadsheet for manual record keeping, using the current classroom report sheet structure but leaving score and total cells empty.

## Context To Read First
- brain/plans/2026-06-12-feature-admin-empty-classroom-report-spreadsheet-print.md
- brain/features/assessment-results-and-sub-assessments.md
- brain/api/permissions.md
- apps/dashboard/src/components/classroom-result-table.tsx
- apps/dashboard/src/hooks/use-report-page.ts
- apps/dashboard/src/components/student-report-page.tsx
- apps/dashboard/src/app/api/pdf/result/route.ts
- packages/pdf/src/result/shared.ts
- packages/pdf/src/result/meta-data.tsx
- packages/pdf/src/result/systems/k12/index.ts

## Implementation Instructions
1. Inspect the existing filled spreadsheet print path in `ClassroomResultTable` and the current student result print/PDF header conventions.
2. Add a separate "Print Empty Sheet" or equivalent action near the existing spreadsheet print/export controls.
3. Gate the new empty print action to admin or authorized academic/report users using the repo's existing role/permission helper patterns. If no suitable helper is present, keep the check narrowly scoped and document it in `brain/api/permissions.md`.
4. Generate an empty print layout from the active classroom roster and visible subject/assessment columns.
5. Render student names and subject/assessment headers, but leave all assessment score, subject total, grand total, and percentage cells blank even when scores exist.
6. Include a polished header with available school/report identity, classroom, term/session, generated date, and the mode being printed.
7. Respect current visible state where practical: selected classroom, selected subjects, totals-only/full assessment mode, and layout direction.
8. Add print CSS that is paper-friendly: compact borders, readable cell sizing, repeated table header, no app chrome, and sane behavior for wide sheets.
9. Preserve the current filled "Print Spreadsheet" behavior unchanged.
10. Update the allowed Brain docs from the Brain Update Contract after implementation.

## Acceptance Criteria
- Admin users can print an empty classroom report spreadsheet from the classroom report sheet workflow.
- The printout includes a polished header with school/report identity, classroom, term/session, and print date where those values are available.
- Student names and assessment/subject columns are present, but all score and total cells are blank for manual entry.
- The empty print respects current filters such as selected classroom, selected subjects, totals-only/full assessment mode, and layout direction.
- Non-admin staff do not see the admin-only empty print action unless explicitly authorized by an existing permission model.
- The current filled "Print Spreadsheet" behavior remains available and unchanged.
- The print layout is readable on paper and does not include dashboard navigation, buttons, filters, or app chrome.

## Files Or Areas Likely Involved
- apps/dashboard/src/components/classroom-result-table.tsx
- apps/dashboard/src/hooks/use-report-page.ts
- apps/dashboard/src/components/student-report-page.tsx
- apps/dashboard/src/app/api/pdf/result/route.ts
- apps/dashboard/src/utils/tenant-page-metadata.ts
- packages/pdf/src/result/**
- brain/features/assessment-results-and-sub-assessments.md
- brain/api/permissions.md
- brain/progress.md

## Do Not Change
- Do not remove or alter the existing filled spreadsheet print behavior.
- Do not save a result print log for empty manual sheets unless product explicitly requires it.
- Do not render interactive score controls inside the print document.
- Do not broaden role access beyond the empty-print action.
- Do not move the task to done.
- Do not broaden the scope beyond this handoff.

## Required Checks
- `bun --filter @school-clerk/dashboard typecheck`
- Manual verification of the empty print action as an admin on a classroom with students and assessments.
- Manual verification that printed cells are blank even when scores already exist.
- Manual verification that filled spreadsheet printing still includes score values.
- Manual verification that a teacher/non-admin cannot see the empty print action.
- Manual verification that wide assessment sheets remain printable without header/table overlap.

## Queue Item
/Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-school-clerk-empty-report-spreadsheet-print.json

## Brain Update Contract
After implementation, update only the relevant files:

- `brain/progress.md`: summarize completed implementation work.
- `brain/features/assessment-results-and-sub-assessments.md`: update if blank manual sheet print rules are formalized.
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
  - `apps/dashboard/src/components/classroom-result-table.tsx`
- Checks run:
  - `bun --filter @school-clerk/dashboard typecheck` (passed with no new errors in changed files)
- Brain docs updated:
  - `brain/progress.md`
  - `brain/features/assessment-results-and-sub-assessments.md`
  - `brain/api/permissions.md`
- Unresolved issues: None.
