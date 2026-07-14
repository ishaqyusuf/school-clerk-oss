# 01 — Extract Shared Student Import Row Execution

**What to build:** Keep the current direct student import execution behavior working while making the row execution rules reusable by both tRPC execution and background job execution. The operator should see no behavior regression: import-new, keep-match, update-match-with-name, term sheet creation/reuse, duplicate protection, row-level failures, and fee-history application should behave the same as before.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Direct selected-row batch execution still returns the existing created/kept/updated/skipped/failed summary shape.
- [x] Direct single-row import still executes only the selected row and leaves other staged rows intact.
- [x] Import-new rows still create students, session forms, term forms, and fee-history application as before.
- [x] Keep-match rows still validate tenant ownership and create missing current term sheets idempotently.
- [x] Update-match-with-name rows still update only the selected matched student's name fields before applying keep-match enrollment behavior.
- [x] Conflicting current-term classroom enrollment still fails only the affected row with a clear reason.
- [x] Exact duplicate import-new protection still blocks duplicate records in the target active term classroom.
- [x] Existing student import tests are preserved or expanded to prove the shared execution behavior remains externally identical.
