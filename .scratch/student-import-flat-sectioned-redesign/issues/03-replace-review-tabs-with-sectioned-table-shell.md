# 03 — Replace Review Tabs With Sectioned Table Shell

**What to build:** The review screen becomes one scrollable table-like surface instead of tabbed row cards. Operators should see `Needs attention`, `Match found`, and `Ready to import` sections in one continuous scroll, with slim section headers, counts, and row containers ready for the new row interaction model.

**Blocked by:** 02 — Extract Review Readiness And Count Model.

**Status:** In Progress (implementation ready; verification deferred)

<!-- implement-with-progress:start -->
## Implementation Progress
- Status: In Progress
- Ticket Position: 3/6
- Completion: 86%
- Current Checklist: 7/7 — Final verification deferred
- Blockers: Final testing deferred by user until all implementation is finished.
- Brain Task: [Task](../../../.brain/tasks/2026-09-07-replace-review-tabs-with-sectioned-table-shell.md)
- Last Updated: 2026-09-07
<!-- implement-with-progress:end -->

## Current Contract
Use [Midday implementation contract](../implementation-contract.md). Newer Brain decisions supersede separate import modes, confidence/status badges in candidate summaries, and removal of skipped-only local completion. Preserve those implemented behaviors. Testing is deferred, not passed.

## Implementation Checklist

- [x] Review tabs are replaced by a single scrollable review body.
- [x] Sections appear in this order: needs attention, match found, ready to import.
- [x] Each section header shows title, total count, checked count, and useful section-level selection controls where appropriate.
- [x] Only non-empty sections are displayed, preserving the newer Brain contract; empty/loading review states do not reintroduce tabs.
- [x] Row containers use a table/grid structure with columns for checkbox, student/name details, match summary, selected action, and more actions.
- [x] Gender, classroom, line number, and blocker status are accommodated in the row subtitle/badge area rather than many extra columns.
- [ ] Desktop and mobile layouts avoid horizontal scrolling and overlapping text.

## Implementation Evidence
- 2026-09-07: Existing sectioned review retained. Removed rigid desktop row minimum widths; defaults collapse on phones, rows remain stacked, and only the review body scrolls between controls/footer.
- Code inspection only; no tests, typechecks, builds, browser or mobile QA were run in this implementation phase. Checked items record implementation, not final validation. No completion or commit claim.
