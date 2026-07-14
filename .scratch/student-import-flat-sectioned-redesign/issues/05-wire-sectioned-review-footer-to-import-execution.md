# 05 — Wire Sectioned Review Footer To Import Execution

**What to build:** The review footer uses the new checked-row readiness model to control batch import. `Start import` should send only checked executable rows, preserve skipped/unchecked behavior, and keep the existing async job progress, completion, error, and cache invalidation behavior.

**Blocked by:** 02 — Extract Review Readiness And Count Model; 03 — Replace Review Tabs With Sectioned Table Shell; 04 — Build Row Cells, Match Picker, And Row Menus.

**Status:** ready-for-agent

- [ ] Sticky review footer shows total rows, checked rows, checked executable rows, checked blocked rows, unchecked rows, and skipped rows.
- [ ] `Start import` is enabled only when at least one checked row is executable and no checked row is blocked.
- [ ] Unchecked blocked rows do not disable `Start import`.
- [ ] Execution payload includes only checked executable rows and omits skipped/unchecked rows.
- [ ] Existing background import job start, polling, progress, completion, failed-row display, and result summary behavior are preserved.
- [ ] Existing verification, pre-submit, batch execution, and transport error normalization are preserved.
- [ ] Completed import still exposes clear start-new-import and close actions.
- [ ] Relevant dashboard queries are still invalidated/refreshed after successful direct or background execution.
