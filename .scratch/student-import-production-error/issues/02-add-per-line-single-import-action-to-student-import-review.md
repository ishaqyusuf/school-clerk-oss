# 02 - Add per-line single import action to student import review

**What to build:** Add a single import button to each student import review row so an operator can execute one row at a time without running the whole checked batch. The row-level action should use the same validation and import semantics as batch execution: classroom required, gender required, valid action required, selected match required for match-based actions, and tenant-scoped term-sheet creation behavior preserved.

After a successful single-row import, the row should show a completed state or be removed from the executable queue without disrupting the remaining staged rows.

**Blocked by:** 01 - Student import non-JSON error handling.

**Status:** completed

- [x] Each executable import review row exposes a clear single import action.
- [x] The single import action executes only that row and does not import other checked rows.
- [x] Single-row import validates classroom, gender, row action, and selected match using the same rules as batch import.
- [x] `Import new`, `Keep match`, and `Update match with name` work for one row when the row is valid.
- [x] Rows that still need classroom, gender, action, or match selection show a row-level error instead of sending an invalid request.
- [x] Successful single-row import updates the row state so it cannot be accidentally imported twice.
- [x] Remaining rows stay staged with their decisions, checked state, manual genders, and match selections unchanged.
- [x] Existing batch import still works after one or more rows have been imported individually.
- [x] The single-row action uses the same production-safe error handling from ticket 01.
- [x] Focused verification covers ready rows, exact-match rows, suspected-match rows, validation failures, successful single import, and batch import after single import.

## Implementation Notes

- Added a shared row-building helper for batch and single-row execution so validation rules stay aligned.
- Single-row import uses `students.executeStudentImport` with one row, invalidates the same dashboard query keys as batch import, and marks successful line numbers as imported.
- Invalid single-row submissions surface row-level `Import needs attention` alerts without sending malformed requests.
