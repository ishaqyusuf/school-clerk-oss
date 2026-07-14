# 03 — Process Student Import Jobs In Trigger.dev

**What to build:** Queue and process persisted student import jobs in Trigger.dev. A large reviewed import should move from pending to running to completed or completed-with-failures while rows are processed in small chunks and progress is persisted after each chunk.

**Blocked by:** 01 — Extract Shared Student Import Row Execution; 02 — Create Student Import Job Start And Status Contract.

**Status:** done

- [x] Starting an import job queues the matching Trigger.dev task with enough stable identifiers to process the persisted job.
- [x] The worker resolves the persisted job and tenant/session/term context without relying on browser cookies.
- [x] Rows are processed in bounded chunks so one large import is not one long dashboard HTTP request.
- [x] Each processed row writes a row-level result with line number, action, status, student id when applicable, term sheet creation flag, and failure reason when applicable.
- [x] Job aggregate counters update as chunks complete: processed rows, created students, kept matches, updated matches, term sheets created, skipped rows, and failed rows.
- [x] One row failure does not abort the entire job.
- [x] The final job status distinguishes all-success completion from completion with failed rows.
- [x] Focused worker/API tests prove a job processes rows and updates progress through the persisted status contract.
