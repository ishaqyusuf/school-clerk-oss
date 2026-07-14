# 06 — Recover And Reopen Active Import Job Progress

**What to build:** Let operators recover an active or recently completed import job after refresh, modal close, or navigation interruption. The operator should be able to reopen the student import surface and see the current import job progress or final summary instead of losing the execution context.

**Blocked by:** 05 — Route Dashboard Batch Execution Through Import Jobs.

**Status:** done

- [x] The dashboard can discover the current tenant user's active or recent student import job when opening the import flow.
- [x] A pending or running job reopens into the progress state instead of the paste/review start state.
- [x] A completed job can reopen into the final summary state with aggregate counts and row-level failures.
- [x] The UI avoids resubmitting reviewed rows when an active job already exists.
- [x] Operators can intentionally start a new import after a completed job summary.
- [x] Job status polling or realtime updates continue after a refresh when a job is active.
- [x] Tenant ownership remains enforced for active/recent job discovery.
- [x] Tests cover refresh/reopen behavior for running and completed jobs.
