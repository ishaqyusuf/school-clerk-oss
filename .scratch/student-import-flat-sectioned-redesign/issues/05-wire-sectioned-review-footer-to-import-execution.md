# 05 — Wire Sectioned Review Footer To Import Execution

**What to build:** The review footer uses the new checked-row readiness model to control batch import. `Start import` should send only checked executable rows, preserve skipped/unchecked behavior, and keep the existing async job progress, completion, error, and cache invalidation behavior.

**Blocked by:** 02 — Extract Review Readiness And Count Model; 03 — Replace Review Tabs With Sectioned Table Shell; 04 — Build Row Cells, Match Picker, And Row Menus.

**Status:** In Progress (implementation ready; verification deferred)

<!-- implement-with-progress:start -->
## Implementation Progress
- Status: In Progress
- Ticket Position: 5/6
- Completion: 89%
- Current Checklist: 9/9 — Final verification deferred
- Blockers: Final testing deferred by user until all implementation is finished.
- Brain Task: [Task](../../../.brain/tasks/2026-09-07-wire-sectioned-review-footer-to-import-execution.md)
- Last Updated: 2026-09-07
<!-- implement-with-progress:end -->

## Current Contract
Use [Midday implementation contract](../implementation-contract.md). Newer Brain decisions supersede separate import modes, confidence/status badges in candidate summaries, and removal of skipped-only local completion. Preserve those implemented behaviors. Testing is deferred, not passed.

## Implementation Checklist

- [x] Sticky review footer shows total rows, checked rows, checked executable rows, checked blocked rows, unchecked rows, and skipped rows.
- [x] `Start import` requires checked executable rows with no checked blockers, except the newer valid skipped-only local-completion action.
- [x] Unchecked blocked rows do not disable `Start import`.
- [x] Execution payload includes only checked executable rows and omits skipped/unchecked rows.
- [x] Existing background import job start, polling, progress, completion, failed-row display, and result summary behavior are preserved.
- [x] Existing verification, pre-submit, batch execution, and transport error normalization are preserved.
- [x] Completed import still exposes clear start-new-import and close actions.
- [x] Relevant dashboard queries are still invalidated/refreshed after successful direct or background execution.

- [ ] Complete final tests, responsive/browser/accessibility QA, conformance review and commit during the user-resumed verification phase.

## Implementation Evidence
- 2026-09-07: Extracted review-footer.tsx with six scope-aware counters, readiness reason, safe-area padding and one execute action; removed duplicate action/count block from top controls. Existing execution and invalidation paths retained.
- Code inspection only; no tests, typechecks, builds, browser or mobile QA were run in this implementation phase. Checked items record implementation, not final validation. No completion or commit claim.
