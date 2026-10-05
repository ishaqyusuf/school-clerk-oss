# 01 — Simplify Student Import Setup Screen

**What to build:** The first import screen becomes a quiet paste-first setup UI. Operators should see a compact horizontal defaults form, the pasted student text as the dominant surface, a concise footer status, compact warning details when needed, and one clear `Proceed` action.

**Blocked by:** None — can start immediately.

**Status:** In Progress (implementation ready; verification deferred)

<!-- implement-with-progress:start -->
## Implementation Progress
- Status: In Progress
- Ticket Position: 1/6
- Completion: 88%
- Current Checklist: 8/8 — Final verification deferred
- Blockers: Final testing deferred by user until all implementation is finished.
- Brain Task: [Task](../../../.brain/tasks/2026-09-07-simplify-student-import-setup-screen.md)
- Last Updated: 2026-09-07
<!-- implement-with-progress:end -->

## Current Contract
Use [Midday implementation contract](../implementation-contract.md). Newer Brain decisions supersede separate import modes, confidence/status badges in candidate summaries, and removal of skipped-only local completion. Preserve those implemented behaviors. Testing is deferred, not passed.

## Implementation Checklist

- [x] The setup screen shows only the compact defaults form, paste area, footer status, and primary/secondary actions by default.
- [x] Automatic classroom-header detection, optional fallback classroom, and global gender preserve the newer Brain behavior (the separate mode switch is superseded).
- [x] Sidebar summary cards and large default warning panels are removed or collapsed from the normal setup view.
- [x] Footer status shows parsed student rows, lines/rows needing fixes, and a clear readiness state.
- [x] Detailed parser warnings remain available through a compact details affordance.
- [x] `Proceed` is disabled for empty input, no parsed student rows, and reference-data loading/failure; missing per-row classrooms remain resolvable in review per the newer automatic-header contract.
- [x] Local draft persistence and parser behavior are unchanged.
- [ ] The layout fits common mobile and desktop widths without horizontal scrolling or overlapping controls.

## Implementation Evidence
- Restoring a saved review also waits for reference data, with retry/back-to-setup recovery. An empty paste does not gate background-job recovery on these reference reads.
- 2026-09-07: Extracted setup-form.tsx from index; added reference loading/error/retry gates, distinct warning-line counts, wrapping footer, stacked sub-400px defaults and safe-area padding. Parser/draft semantics remain unchanged.
- Code inspection only; no tests, typechecks, builds, browser or mobile QA were run in this implementation phase. Checked items record implementation, not final validation. No completion or commit claim.
