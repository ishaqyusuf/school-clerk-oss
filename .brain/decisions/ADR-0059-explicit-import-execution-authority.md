# ADR-0059: Explicit import execution authority

- Date: 2026-09-22
- Status: implementation written; verification deferred
- Related: CORE-002, ADR-0057, ADR-0058

## Decision

Replace the executor's missing-currentUser bypass with explicit interactive and persisted-job authority. Follow Midday protected-router/job-dispatch and DB-owned access boundaries: `student-import-access.ts` in the DB package performs current identity/module/target reads; a thin API adapter translates errors. Public `executeStudentImport` always requires a live interactive session. The unexported executor accepts a job authority only from the persisted-job processor. No browser input accepts authority kind, creator ID or background bearer credentials.

Interactive execute/start/status services independently require stored session/user/account/school, Admin/Registrar, and effective Students, Academics and Finance. Workers reload active PENDING/RUNNING job scope and creator; creator must still be active, Admin/Registrar and in the live nonpurging school account, with all three modules. Missing creator, retired job, removed user or revoked access fails closed. Background work is a persisted authorization request, not a requirement that the initiating browser session remain open. No session secret is stored in payloads.

## Transactions and target

Execution checks live same-school session/term/classroom ancestry, closed academic term and closed finance ledger before work and within every Serializable row transaction. Queued job scope must exactly match the execution school/session/term. Job creation repeats authorization/target checks and persists the job with nested rows in one Serializable transaction; failures cannot leave a partial job without rows. Existing API schemas parse both interactive and worker row inputs.

A matched-name row now throws if its term placement conflicts, rolling back its earlier name update instead of committing it while reporting failure. Per-row result semantics remain; this is not whole-import atomicity. Initial worker status/failure transitions use active-status predicates so they cannot independently revive a cancelled/completed job.

## Status visibility

Job reads reauthorize before reading and again before serialization/token issuance. Reads always scope to the requesting creator and school, including explicit job IDs; this preserves current owner-resume UI and prevents another same-school role from opening unrelated import details by ID. They do not require current selected term to equal an older job's term. Nonowner administrative inspection remains a separate explicit workflow.

Browser Trigger read tokens are only minted through this authorized read path. Internal worker serialization does not mint browser tokens. Existing two-hour provider tokens are not instantly revoked by later module/role changes; provider payload/output columns remain suppressed. Durable delivery/token revocation policy remains follow-up.

## Conformance, omissions and remaining work

Update (2026-09-22): ADR-0060 implements atomic persisted-row receipts and terminal-preserving progress, superseding the replay/progress gaps below. Full worker/domain extraction, deeper integrity and scoped client remain unfinished. The remainder records the boundary at this ADR's original slice.

The existing import modal/table/selection/route/UI is unchanged, so no new responsiveness claim or browser work applies to this slice. No schema, dependency, deployed job, database write, live provider request, test, typecheck, build, lint or commit was performed.

The worker still imports the historical API-owned processor; moving full execution/storage to DB/domain packages is unfinished. Durable row claiming, replay-safe receipts and atomic outcome writes with domain writes are unfinished; a crash after a row transaction but before outcome persistence can still replay. Progress aggregation/cancellation races, all enrollment/fee-reference integrity checks, legacy term-form repair, scoped import client and full verification remain open. This slice is concrete access/transaction progress, not completion of import or CORE-002.
