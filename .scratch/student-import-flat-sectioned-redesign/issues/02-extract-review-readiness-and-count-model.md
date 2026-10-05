# 02 — Extract Review Readiness And Count Model

**What to build:** A clear readiness and counting model for the reviewed import rows. The model should compute row sections, checked-row readiness, executable counts, blocked counts, skipped counts, unchecked counts, and disabled import reasons without changing parser, verification, or execution contracts.

**Blocked by:** None — can start immediately.

**Status:** In Progress (implementation ready; verification deferred)

<!-- implement-with-progress:start -->
## Implementation Progress
- Status: In Progress
- Ticket Position: 2/6
- Completion: 86%
- Current Checklist: 7/7 — Final verification deferred
- Blockers: Final testing deferred by user until all implementation is finished.
- Brain Task: [Task](../../../.brain/tasks/2026-09-07-extract-review-readiness-and-count-model.md)
- Last Updated: 2026-09-07
<!-- implement-with-progress:end -->

## Current Contract
Use [Midday implementation contract](../implementation-contract.md). Newer Brain decisions supersede separate import modes, confidence/status badges in candidate summaries, and removal of skipped-only local completion. Preserve those implemented behaviors. Testing is deferred, not passed.

## Implementation Checklist

- [x] Rows can be classified into needs-attention, match-found, and ready-to-import sections from existing verification and row-decision state.
- [x] Footer counts are computed from checked rows, including checked total, checked executable, checked blocked, unchecked, and skipped rows.
- [x] Unchecked attention rows remain counted as unchecked and do not block batch import.
- [x] Checked rows missing gender, classroom, action, or required match candidate produce deterministic disabled reasons.
- [x] No checked executable rows disables start import unless every selected valid row is skipped; preserve the newer local skipped-only completion contract.
- [x] Existing skipped-row and execution-payload semantics are preserved.
- [ ] Extracted helpers/selectors are covered by focused tests where practical.

## Implementation Evidence
- 2026-09-07: Existing pure model retained; section checked counts now exclude already-imported rows like footer counts. Blocker summaries show at most five line IDs plus a remaining count to keep the footer usable.
- Code inspection only; no tests, typechecks, builds, browser or mobile QA were run in this implementation phase. Checked items record implementation, not final validation. No completion or commit claim.
