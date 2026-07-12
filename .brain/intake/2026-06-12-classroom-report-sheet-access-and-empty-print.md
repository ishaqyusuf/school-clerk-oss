# Brain Intake: Classroom Report Sheet Access And Empty Print

## Status
Handed Off

## Created Date
2026-06-12

## Last Updated
2026-06-12

## Raw Input
Staff should be able to view the classroom report sheet table structure already used in the report page, including assessment columns, score filling, filtering, and related classroom report workflows. Admins should be able to print an empty classroom report spreadsheet with a polished header similar to the existing result print, for manual record keeping.

## Generated Plans
- [x] Staff Classroom Report Sheet Access - `brain/plans/2026-06-12-feature-staff-classroom-report-sheet-access.md` - Status: In Progress
- [x] Admin Empty Classroom Report Spreadsheet Print - `brain/plans/2026-06-12-feature-admin-empty-classroom-report-spreadsheet-print.md` - Status: In Progress

## Recommended Execution Order
1. Staff Classroom Report Sheet Access - establish the staff-facing report sheet route and authorization scope before adding specialized print modes.
2. Admin Empty Classroom Report Spreadsheet Print - builds on the same classroom report sheet data and table column model.

## Agent Recommendations
- Staff Classroom Report Sheet Access: open-code - requires targeted route/component/API wiring across dashboard and tRPC authorization.
- Admin Empty Classroom Report Spreadsheet Print: open-code - requires focused UI/print layout work using existing report table and result print conventions.

## Merged Items
- Staff viewing classroom report sheets and being able to create/fill assessment records were merged because they share the same classroom report sheet workflow, filters, assessment setup, and score-entry surfaces.

## Duplicate Or Existing Items
- Adjacent existing work: `brain/tasks/in-progress.md` has `ASMT-001` for making assessments and sub-assessments reliable across recording, reports, print, and PDF output.
- Adjacent existing documentation: `brain/features/assessment-results-and-sub-assessments.md` documents `assessments.getClassroomReportSheet`, classroom review, recording, and print rules.
- Not treated as duplicate: this intake focuses on staff-facing access and blank administrative printouts, which are distinct user outcomes.

## Needs Clarification
- None.

## Skipped Items
- None.

## Approval Notes
- Approved both generated plans on 2026-06-12.

## Handoff Notes
- Staff Classroom Report Sheet Access
  - Handoff: brain/handoffs/ready/2026-06-12-staff-classroom-report-sheet-access-handoff.md
  - Queue Item: /Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-school-clerk-staff-report-sheet-access.json
  - Agent: open-code
  - Status: queued
- Admin Empty Classroom Report Spreadsheet Print
  - Handoff: brain/handoffs/ready/2026-06-12-admin-empty-classroom-report-spreadsheet-print-handoff.md
  - Queue Item: /Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-school-clerk-empty-report-spreadsheet-print.json
  - Agent: antigravity
  - Status: queued
