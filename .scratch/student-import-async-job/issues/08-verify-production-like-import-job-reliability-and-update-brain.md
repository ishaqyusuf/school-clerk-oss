# 08 — Verify Production-Like Import Job Reliability And Update Brain

**What to build:** Verify the full async student import job path under production-like conditions and update durable Brain documentation. The feature should be demonstrably safer for large imports than the prior single-request batch execution path, and the project memory should describe the new job contract and operational behavior.

**Blocked by:** 01 — Extract Shared Student Import Row Execution; 02 — Create Student Import Job Start And Status Contract; 03 — Process Student Import Jobs In Trigger.dev; 04 — Make Import Jobs Retry-Safe And Idempotent; 05 — Route Dashboard Batch Execution Through Import Jobs; 06 — Recover And Reopen Active Import Job Progress; 07 — Polish Failure States And Row-Level Recovery.

**Status:** done

- [x] A realistic large selected-row import starts a job and returns promptly without depending on one long dashboard HTTP request.
- [x] Production-like tenant routing, auth, active school/session/term headers, and job status reads return structured JSON.
- [x] The worker processes the realistic import and records progress through completion or completed-with-failures.
- [x] Retry/idempotency behavior is verified with a partial-completion scenario.
- [x] Dashboard completion refresh behavior is verified for students, analytics, recent records, and classrooms.
- [x] Focused API, worker, and dashboard verification commands are recorded in implementation notes.
- [x] Brain feature documentation describes async student import jobs and progress/recovery behavior.
- [x] Brain API/database/system documentation records the new job contract, persisted job models, and Trigger.dev background-job boundary.
