# 04 - Student import regression coverage and Brain docs

**What to build:** Add final regression coverage and Brain documentation for the hardened student import flow after the non-JSON failure handling, per-line single import action, and production transport fix have landed.

This ticket should verify the combined behavior end to end: batch import, single-line import, recoverable production transport failures, structured invalid-input errors, and dashboard cache invalidation.

**Blocked by:** 01 - Student import non-JSON error handling; 02 - Add per-line single import action to student import review; 03 - Fix production student import transport returning HTML.

**Status:** completed

- [x] Batch verification handles realistic pasted batches without non-JSON parse failures.
- [x] Batch execution imports valid selected rows and reports row-level failures in structured JSON.
- [x] Single-line import executes only one valid row and leaves the remaining staged rows intact.
- [x] Non-JSON/HTML failures show the friendly recovery state from ticket 01 and preserve staged import data.
- [x] Production-like tenant routing returns JSON for valid import verification and execution requests.
- [x] Invalid classroom/session/term inputs return structured errors that the modal displays safely.
- [x] Dashboard invalidation after batch and single-line import refreshes students, analytics, recent records, and classrooms as expected.
- [x] Brain documentation records the new production hardening behavior and per-line import action.
- [x] Verification commands and any manual production-like checks are recorded in the implementation notes.

## Implementation Notes

- Added unit coverage for non-JSON/HTML error normalization, safe diagnostics, ordinary tRPC error passthrough, and redaction.
- Added API regression coverage for typed import verification/execution validation errors.
- Ran focused import tests and both API/dashboard typechecks.
- Updated `brain/features/student-import.md`, `brain/api/contracts.md`, `brain/progress.md`, and `brain/tasks/done.md`.
