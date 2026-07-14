# 04 — Make Import Jobs Retry-Safe And Idempotent

**What to build:** Make background student import execution safe under worker retries, partial completion, and repeated job attempts. If a job resumes after some rows have completed, successful rows should not be applied twice and existing final row results should remain stable.

**Blocked by:** 03 — Process Student Import Jobs In Trigger.dev.

**Status:** done

- [x] A completed job row is recognized before execution and is not applied again during retry/resume.
- [x] Retrying after an import-new row completed does not create a duplicate student or duplicate term sheet.
- [x] Retrying after a keep-match row completed does not create a duplicate term sheet.
- [x] Retrying after an update-match-with-name row completed does not reapply unexpected identity changes beyond the stored intended result.
- [x] Row-level uniqueness or equivalent safeguards prevent duplicate row-result records for the same job line.
- [x] Job aggregate counters remain correct after retry/resume and are not double-counted.
- [x] Worker retry behavior can recover from a simulated mid-job interruption.
- [x] Tests cover retry/resume after partial success and prove persisted outcomes remain stable.
