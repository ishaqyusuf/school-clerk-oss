# 06 — Verify Responsive, Accessible, Documented Import Redesign

**What to build:** Complete the redesign with focused automated checks, manual browser QA, accessibility verification, and Brain documentation updates. The implementation should be demonstrably usable across setup, review, resolution, execution, completion, and mobile/narrow layouts.

**Blocked by:** 01 — Simplify Student Import Setup Screen; 02 — Extract Review Readiness And Count Model; 03 — Replace Review Tabs With Sectioned Table Shell; 04 — Build Row Cells, Match Picker, And Row Menus; 05 — Wire Sectioned Review Footer To Import Execution.

**Status:** In Progress (documentation updated; verification deferred)

<!-- implement-with-progress:start -->
## Implementation Progress
- Status: In Progress
- Ticket Position: 6/6
- Completion: 21%
- Current Checklist: 1/14 — Final verification deferred
- Blockers: Final testing deferred by user until all implementation is finished.
- Brain Task: [Task](../../../.brain/tasks/2026-09-07-verify-responsive-accessible-documented-import-redesign.md)
- Last Updated: 2026-09-07
<!-- implement-with-progress:end -->

## Current Contract
Use [Midday implementation contract](../implementation-contract.md). Newer Brain decisions supersede separate import modes, confidence/status badges in candidate summaries, and removal of skipped-only local completion. Preserve those implemented behaviors. Testing is deferred, not passed.

## Implementation Checklist

- [ ] Existing student import parser tests still pass.
- [ ] Existing import error normalization tests still pass.
- [ ] Focused helper/UI tests cover checked-row footer counts and import gating where practical.
- [ ] Manual QA covers setup with empty, valid, warning, and blocked paste data.
- [ ] Manual QA covers single-classroom and multiple-classroom modes.
- [ ] Manual QA covers no-match ready rows, exact matches, suspected matches with multiple candidates, missing gender, and missing/ambiguous classroom.
- [ ] Manual QA covers unchecked blocker rows not blocking import.
- [ ] Manual QA covers async job execution, progress, completion, and failed-row display.
- [ ] Keyboard access works for row checkbox, name chips, action dropdown, more menu, and match candidate picker.
- [ ] Focus returns predictably after closing menus, popovers, sheets, or inline candidate details.
- [ ] Mobile/narrow layouts avoid horizontal scrolling, clipped controls, and overlapping row content.
- [x] `.brain/features/student-import.md` is updated with the new setup and sectioned review behavior.
- [x] Task tracking Brain docs are updated only if this implementation is started or completed under Brain task tracking.
- [x] API Brain docs are updated only if implementation unexpectedly changes API contracts.

## Implementation Evidence
- 2026-09-07: Implementation documentation updated; all testing and runtime/accessibility verification explicitly deferred by user.
- Code inspection only; no tests, typechecks, builds, browser or mobile QA were run in this implementation phase. Checked items record implementation, not final validation. No completion or commit claim.
