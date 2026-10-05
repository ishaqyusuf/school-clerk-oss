# 04 — Build Row Cells, Match Picker, And Row Menus

**What to build:** Each sectioned review row exposes the simplified interaction model: editable name chips, closest-match summary, candidate picker, visible action dropdown, and secondary row menu. The operator can still resolve gender, classroom, name structure, match selection, search-promoted matches, resets, and valid skip/single-row actions.

**Blocked by:** 03 — Replace Review Tabs With Sectioned Table Shell.

**Status:** In Progress (implementation ready; verification deferred)

<!-- implement-with-progress:start -->
## Implementation Progress
- Status: In Progress
- Ticket Position: 4/6
- Completion: 90%
- Current Checklist: 10/10 — Final verification deferred
- Blockers: Final testing deferred by user until all implementation is finished.
- Brain Task: [Task](../../../.brain/tasks/2026-09-07-build-row-cells-match-picker-and-row-menus.md)
- Last Updated: 2026-09-07
<!-- implement-with-progress:end -->

## Current Contract
Use [Midday implementation contract](../implementation-contract.md). Newer Brain decisions supersede separate import modes, confidence/status badges in candidate summaries, and removal of skipped-only local completion. Preserve those implemented behaviors. Testing is deferred, not passed.

## Implementation Checklist

- [x] Name, surname, and other name render as compact editable chips that preserve existing name-structure selection behavior.
- [x] Row subtitle/badges show line number, classroom, gender, and blocker status clearly.
- [x] Match summary shows the selected or closest candidate, confidence, and `+N more` when additional candidates exist.
- [x] Match summary opens a viewport-constrained candidate picker, including for one candidate, with name/classroom and selected state. Other matching metadata stays in the model per the newer Brain contract.
- [x] Candidate picker remains usable on narrow screens through a suitable sheet, inline expansion, or responsive equivalent.
- [x] Action dropdown shows the current row action and disables or explains invalid candidate-dependent actions.
- [x] Preserve newer Brain row actions: visible search icon, editable name chips, and overflow reset/skip/single-row import.
- [x] Missing gender and missing/ambiguous classroom fixes are directly reachable from blocked rows.
- [x] Existing row decision defaults and manual override semantics are preserved.

- [ ] Complete final tests, responsive/browser/accessibility QA, conformance review and commit during the user-resumed verification phase.

## Implementation Evidence
- 2026-09-07: Kept name/gender/classroom/admission/search actions; made sole match candidates selectable, constrained candidate height, enlarged mobile controls and disabled row fieldsets during/after import.
- Code inspection only; no tests, typechecks, builds, browser or mobile QA were run in this implementation phase. Checked items record implementation, not final validation. No completion or commit claim.
