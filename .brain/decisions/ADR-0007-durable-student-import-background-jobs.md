# ADR-0007: Durable Student Import Background Jobs

- Status: accepted
- Date: 2026-07-14

## Context

Large student imports can exceed production HTTP request limits when every reviewed row is processed inside one tRPC mutation. The dashboard needs progress feedback, refresh recovery, and row-level results without forcing operators to keep one long request alive.

Student import already has important business rules for duplicate detection, matched-student validation, term-sheet creation/reuse, classroom conflict checks, and fee-history application. A background path must reuse those rules instead of introducing a second import implementation.

## Decision

Represent selected-row batch imports as durable database jobs.

- Create a tenant-scoped `StudentImportJob` when the dashboard starts a batch import.
- Persist one `StudentImportJobRow` per executable reviewed row with the normalized execution payload, effective classroom, action, and line number.
- Queue the `process-student-import-job` Trigger.dev task with the job id.
- Process pending/running job rows in line-number order in bounded 25-row chunks using the existing `executeStudentImport` row execution path with the job's captured school/session/term context.
- Refresh persisted aggregate counters after each chunk so dashboard polling can show processed/total progress before the whole job completes.
- Treat final row statuses as retry boundaries and recompute aggregate counters from persisted row results after each worker run.
- Poll and recover progress through `students.getStudentImportJob` instead of relying on local mutation state.

## Consequences

### Positive

- Production batch imports no longer depend on a single long dashboard/API request.
- Operators can see progress and reopen active/recent job state after refresh.
- Existing import rules remain centralized in the student import execution path.
- Retried workers do not double-count rows already marked final.

### Tradeoffs

- The API now owns job creation/status contracts while `packages/jobs` owns execution scheduling.
- Worker deployment must include the import execution module and the jobs package Prisma schema refresh.
- A worker crash during an individual row can leave that row in `RUNNING`; retries reprocess non-final rows and rely on existing duplicate/term-sheet guards to avoid duplicate enrollment writes.

## Alternatives Considered

- Client-driven recursive `useMutation` batches with a cursor.
- A synchronous API loop with a larger timeout.
- A dedicated import worker implementation separate from `executeStudentImport`.

## Follow-up Actions

- Consider explicit per-row idempotency keys if production telemetry shows crashes between row writes and row result persistence.
- Add an operator-visible cancel action if schools need to stop queued imports after starting them.
- Add Trigger deployment smoke validation for the student import task before enabling very large imports broadly.
