# 07 — Polish Failure States And Row-Level Recovery

**What to build:** Make completed-with-failures jobs understandable and actionable. Operators should see which lines failed, why they failed, which rows succeeded, and a clear path to correct and retry only unresolved rows in a later import without risking completed rows.

**Blocked by:** 04 — Make Import Jobs Retry-Safe And Idempotent; 05 — Route Dashboard Batch Execution Through Import Jobs.

**Status:** done

- [x] Completed-with-failures jobs show failed line numbers with row-level reasons.
- [x] Successful rows remain marked as completed and cannot be accidentally submitted again from the same job summary.
- [x] Failed rows can be identified clearly enough for the operator to correct source data or row decisions in a later import.
- [x] Job-level infrastructure failures show friendly import error messaging and safe diagnostics.
- [x] The summary distinguishes row validation/business failures from whole-job failure.
- [x] Skipped rows remain counted separately from failed rows.
- [x] UI copy keeps the operator focused on next action rather than raw worker internals.
- [x] Tests cover completed-with-failures, whole-job failure, skipped rows, and protected successful rows.
