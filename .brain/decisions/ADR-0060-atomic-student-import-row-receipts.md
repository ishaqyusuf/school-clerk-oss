# ADR-0060: Atomic student import row receipts

- Date: 2026-09-22
- Status: implementation written; verification deferred
- Related: CORE-002, ADR-0059

## Decision and ownership

Follow-up (ADR-0061): shared schemas, row execution and persisted-job processing have now moved to utils/DB packages; the Trigger entrypoint uses public DB exports. This supersedes the package-extraction gap recorded in this ADR's original slice, but not its rollout or verification limitations.

Use the existing StudentImportJob/StudentImportJobRow records as durable per-row receipts; no schema change is needed. Following the inspected Midday DB/query/job boundary, `packages/db/src/student-import-job-rows.ts` owns row locking, receipt persistence and aggregate snapshots. The historical API processor supplies one transaction-local domain operation shared with direct execution. It no longer fabricates a TRPCContext for queued work or commits RUNNING/outcome updates separately from domain writes. The jobs entrypoint still imports the API processor: full schema/domain/worker package extraction is unfinished, not waived by this slice.

## Transaction protocol

1. Lock the live stored job, then its exact live row. Stop if the job is terminal. Reload both records rather than trusting the worker's earlier ID list.
2. Recheck the persisted creator's current account, role and modules. Terminal rows return their stored receipt without replay. The callback parses the locked payload, checks line/action identity, and derives school/session/term from the locked job; target/closed-term/ledger authorization is repeated in the shared row operation.
3. For a PENDING row, run all student/enrollment/fee writes and save its terminal outcome in the same Serializable transaction. A failed business result throws before commit. The receipt carries student ID, whether a term sheet was created, reason and completion timestamp. Missing new enrollment prevents a successful creation receipt.
4. On an exception, acquire fresh job/row locks in a ReadCommitted recovery transaction. If a receipt already committed despite an uncertain response, return it unchanged. If the job stopped, do not mutate the row. Otherwise recheck current creator access before recording failure. This recovery path never invokes domain execution.

New code never commits an intermediate RUNNING row. A crash before commit leaves PENDING and rolls back domain writes; a crash after commit leaves the terminal receipt. This is a per-persisted-row guarantee, not whole-batch atomicity, request idempotency for direct execution, or deduplication across separately submitted jobs. Access and target checks are transactional snapshots, not instantaneous revocation of an in-flight transaction.

## Legacy and rollout

Legacy RUNNING rows are uncertain: the old worker could have committed student changes without an outcome. They are marked FAILED with a manual-review explanation instead of replaying. Existing student/term-created evidence is retained; no student deletion, fee reversal, automatic reset or repair runs. Legacy PENDING rows can proceed because the previous worker stored RUNNING before domain execution. Old terminal receipts are honored, not independently reverified.

Drain old worker versions before deploying the new protocol. An old worker that does not take these locks or save atomic receipts cannot safely overlap the new worker on the same job. No deployment, provider action, job dispatch or live database mutation occurred during implementation.

## Job progress and cancellation

Rows for one job and aggregate snapshots share the parent job lock, intentionally serializing that job's rows while allowing different jobs to proceed independently. Snapshots recompute counts from stored terminal rows and compare the live row count with the live total. A mismatch fails an active job for review. COMPLETED, COMPLETED_WITH_FAILURES, FAILED and CANCELLED states are preserved, never revived by progress or replay. Cancellation waiting behind an in-flight row takes effect after that atomic row, not halfway through it. Operational/access failures stop active jobs without replacing committed receipts; no automatic row reset is introduced.

## Conformance and deferred verification

Existing routes, modal/header/table/sheet/filter/URL state, selection, cache invalidation and responsive UI are unchanged because this is a server-side receipt slice. Scoped mobile import UI, complete enrollment/fee ancestry and full package extraction remain required later. No test files, tests, typechecks, builds, lint, browser/mobile/keyboard QA or commits were run/created. Source inspection and a scoped tracked-file whitespace check are the only current evidence.

After the user resumes verification, exercise duplicate concurrent deliveries, crashes on each side of commit, uncertain responses, failed-name/enrollment rollback, invalid stored payload identity, legacy RUNNING quarantine, role/module loss, cancellation/progress contention, missing rows and terminal-state replay. Do not declare import or CORE-002 complete from this untested slice.
