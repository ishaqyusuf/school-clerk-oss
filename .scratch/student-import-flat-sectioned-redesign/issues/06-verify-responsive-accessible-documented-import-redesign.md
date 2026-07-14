# 06 — Verify Responsive, Accessible, Documented Import Redesign

**What to build:** Complete the redesign with focused automated checks, manual browser QA, accessibility verification, and Brain documentation updates. The implementation should be demonstrably usable across setup, review, resolution, execution, completion, and mobile/narrow layouts.

**Blocked by:** 01 — Simplify Student Import Setup Screen; 02 — Extract Review Readiness And Count Model; 03 — Replace Review Tabs With Sectioned Table Shell; 04 — Build Row Cells, Match Picker, And Row Menus; 05 — Wire Sectioned Review Footer To Import Execution.

**Status:** ready-for-agent

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
- [ ] `.brain/features/student-import.md` is updated with the new setup and sectioned review behavior.
- [ ] Task tracking Brain docs are updated only if this implementation is started or completed under Brain task tracking.
- [ ] API Brain docs are updated only if implementation unexpectedly changes API contracts.
