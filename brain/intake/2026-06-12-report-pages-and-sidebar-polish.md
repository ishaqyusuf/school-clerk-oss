# Brain Intake: Report Pages And Sidebar Polish

## Status
Handed Off

## Created Date
2026-06-12

## Last Updated
2026-06-13

## Raw Input
Assessment-recording page: remove the header subject selector, reduce mobile horizontal padding, default the subject filter to the first subject, make the header cleaner and mobile responsive, hide total columns, add helper information that clicking a subject updates assessments, rename the staff report CTA to Assessment Recording, sort student lists alphabetically with male students first, and add a gender picker column for updates including the report sheet table.

Student report page: reduce mobile horizontal padding, remove the Print View tab because the classroom tab already owns print selection and related features, remove the long layout/export description, organize top configuration controls for a cleaner mobile-friendly layout, keep layout direction stored in the user cookie, and remove the Result Entry CTA.

Sidebar: the current sidebar feels outdated; update it fully using the GND project sidebar as the reference.

## Generated Plans
- [x] Shared Report Roster Sorting And Gender Controls - `brain/plans/2026-06-12-ux-ui-shared-report-roster-sorting-and-gender-controls.md` - Status: In Progress
- [x] Assessment Recording Page Polish - `brain/plans/2026-06-12-ux-ui-assessment-recording-page-polish.md` - Status: In Progress
- [x] Student Report Workspace Cleanup - `brain/plans/2026-06-12-ux-ui-student-report-workspace-cleanup.md` - Status: In Progress
- [x] GND-Style Sidebar Refresh - `brain/plans/2026-06-12-ux-ui-gnd-style-sidebar-refresh.md` - Status: In Progress

## Recommended Execution Order
1. Shared Report Roster Sorting And Gender Controls - both assessment recording and classroom report sheet need the same student ordering and gender update behavior.
2. Assessment Recording Page Polish - can then consume the shared roster/gender behavior while simplifying its own header/table.
3. Student Report Workspace Cleanup - can consume the shared roster/gender behavior and simplify the report workspace without duplicating table logic.
4. GND-Style Sidebar Refresh - broader shell/navigation UI work should land after the page-specific changes so mobile spacing can be verified in the final shell.

## Agent Recommendations
- Shared Report Roster Sorting And Gender Controls: open-code - focused shared helper/component work with API mutation wiring.
- Assessment Recording Page Polish: open-code - contained page and table UI changes.
- Student Report Workspace Cleanup: open-code - contained report shell/filter/table cleanup.
- GND-Style Sidebar Refresh: antigravity - broader UI adaptation from the GND reference benefits from stronger visual/runtime verification.

## Merged Items
- Student list sorting and gender picker requests were merged into one shared roster plan because they must appear consistently in assessment recording and the classroom report sheet.
- The staff report CTA rename and student report Result Entry removal were merged into the student report workspace cleanup plan because both are owned by the report filter/control surface.

## Duplicate Or Existing Items
- Existing task `ASMT-001` covers assessment correctness across recording, reports, print, and PDF. These plans are UI/workflow polish and should coordinate with, not replace, that task.
- `brain/plans/2026-06-12-feature-staff-classroom-report-sheet-access.md` is Done. The new staff report CTA rename is a follow-up polish item, not a duplicate of the completed access work.
- `brain/decisions/ADR-0004-navigation-registry-and-workspace-owned-sidebar-architecture.md` already establishes the navigation registry/sidebar architecture. The sidebar refresh should preserve that architecture unless a new ADR is created.

## Needs Clarification
- None. For "update using gnd project 100%", the working assumption is to adapt the GND `packages/site-nav` visual behavior and shell polish into SchoolClerk while preserving SchoolClerk's navigation registry and tenant-aware routing.

## Skipped Items
- None.

## Approval Notes
- Approved by user on 2026-06-13 and immediately converted to implementation handoffs.

## Handoff Notes
- Shared Report Roster Sorting And Gender Controls
  - Handoff: brain/handoffs/ready/2026-06-13-shared-report-roster-sorting-and-gender-controls-handoff.md
  - Queue Item: /Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-13-school-clerk-shared-report-roster-sorting-and-gender-controls.json
  - Agent: open-code
  - Status: queued
- Assessment Recording Page Polish
  - Handoff: brain/handoffs/ready/2026-06-13-assessment-recording-page-polish-handoff.md
  - Queue Item: /Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-13-school-clerk-assessment-recording-page-polish.json
  - Agent: open-code
  - Status: queued
- Student Report Workspace Cleanup
  - Handoff: brain/handoffs/ready/2026-06-13-student-report-workspace-cleanup-handoff.md
  - Queue Item: /Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-13-school-clerk-student-report-workspace-cleanup.json
  - Agent: open-code
  - Status: queued
- GND-Style Sidebar Refresh
  - Handoff: brain/handoffs/ready/2026-06-13-gnd-style-sidebar-refresh-handoff.md
  - Queue Item: /Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-13-school-clerk-gnd-style-sidebar-refresh.json
  - Agent: antigravity
  - Status: queued
