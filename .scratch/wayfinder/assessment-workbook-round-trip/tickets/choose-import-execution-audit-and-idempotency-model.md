# Choose Import Execution Audit And Idempotency Model

Labels: `wayfinder:research`
Status: Resolved
Blocked by: [Define Assessment Workbook Package Boundary](define-assessment-workbook-package-boundary.md), [Define Authorization And Workbook Security Model](define-authorization-and-workbook-security-model.md), [Design Import Verification And Conflict Algorithm](design-import-verification-and-conflict-algorithm.md), [Define Bare Subject Resolution And Assessment Creation Transaction](define-bare-subject-resolution-and-assessment-creation-transaction.md)
Blocks: [Define Verification And Rollout Matrix](define-verification-and-rollout-matrix.md)

## Question

Should confirmed Assessment Workbook imports execute synchronously or as durable background jobs, and what persistence, atomicity, audit, retry, and idempotency model should own the write?

## Context

The user requires an all-or-nothing confirmed import after all blocking issues are resolved. School Clerk already has durable background jobs for student imports, but one classroom workbook may fit a bounded synchronous transaction. Repeated uploads, network retries, stale review plans, and concurrent score edits must not duplicate or silently overwrite records.

## Resolve

- Estimate realistic workbook/cell volume and transaction cost.
- Compare a bounded synchronous transaction with a persisted job model and reuse of Trigger.dev patterns.
- Define import-plan freshness and revalidation immediately before writes.
- Define transaction scope for newly created assessments and score upserts.
- Define idempotency keys, duplicate confirmation, retry, replay, and crash behavior.
- Define durable import summary, per-cell outcomes, audit events, retention, and operator visibility.
- Decide whether rollback, cancel, progress recovery, or downloadable results are required for the first release.
- Define cache invalidation and post-import assessment/report refresh behavior.

## Expected Answer

A selected execution model with transaction boundaries, persistence schema (if any), idempotency/retry semantics, audit trail, performance limits, and operational trade-offs.

## Comments

Begin with the hypothesis that one bounded classroom workbook can execute synchronously in a single database transaction, but validate this with realistic maximum student/column benchmarks. Persist an import identity and idempotency key before confirmation, reverify plan freshness inside the write boundary, and record a durable summary regardless of whether execution is synchronous or job-backed. Move to a durable worker only if measured transaction limits or recovery requirements justify it.

## Resolution

Selected bounded synchronous apply. A serializable transaction rebuilds the live plan, creates assessments, upserts scores, persists one tenant-idempotent import with file digest/summary/created ids, and writes the activity audit. Replays return the stored result; mismatched reuse is rejected.
