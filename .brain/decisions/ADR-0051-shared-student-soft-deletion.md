# ADR-0051: Shared student soft deletion

- Date: 2026-09-08
- Status: implemented in source; all verification deferred
- Related: CORE-002, ADR-0045–0049

## Decision and ownership

Replace the API's separate canonical/academic archive operations and the dashboard action's alternate nested-write implementation with one DB-owned `softDeleteStudent` service. Follow the inspected Midday customer protected-router/tenant-query and provider-mutation/invalidation patterns, adapting them to SchoolClerk's soft deletion and retained history. Utils owns the bounded browser-safe schema; API/server action own transport and error mapping; DB owns live authorization, canonical row locking and one Serializable transaction. The server action accepts no client-supplied database/transaction handle and revalidates the directory only after commit.

## Authorization and integrity

Require a current stored session/user and same-account school in a live non-purging account, current Admin/Registrar and Students access. If active academic rows will be archived, require Academics too. Canonical-only removal remains available without Academics. Optional `viewScope { schoolId, userId, loginSessionId }` must match this live context; it never substitutes for credentials.

Lock only the exact school-owned canonical student, including archived state for repeat handling. Repeat the stored-context lookup after locking to check wall-clock session expiry following a wait; this does not change the transaction's snapshot semantics. Read scalar ownership of active session forms linked by student ID and term forms linked directly or through that student's session forms. Never return these references. Reject foreign/null-school session/term ownership, a term naming another student, or a term whose parent session form belongs to another student/school. Terms with null direct student ID are included only through an owned canonical student's owned session form; deletion does not backfill that ID. Broader classroom/term ancestry repair is not performed.

Archive the selected owned academic rows and canonical student with one timestamp in the transaction and require affected counts to match the snapshot. Any failure rolls back the archive. Already-archived canonical rows with no active academic rows return `already-deleted` without writes. Active remnants on an archived student require an integrity review rather than implicit repair. Serialization conflicts return refresh guidance without retry.

Do not hard-delete, restore, modify guardians or alter assessment, attendance, charges, payments or ledger records. Outstanding balances are not cancelled. Existing malformed/legacy rows and general archive-access policy remain outside this slice; authorization is point-in-time, not immediate concurrent revocation.

## Client contract

The result is `{ status: deleted | already-deleted, studentId }`; IDs are bounded to 1–200 characters. Missing/foreign canonical targets return NOT_FOUND, unauthorized access returns FORBIDDEN, and stale scope/integrity/concurrency failures return CONFLICT. Unexpected errors receive fixed transport messages. Both dashboard schema and API compatibility exports use the shared schema.

A shared provider hook binds student/school/user/login session, checks identity readiness, prevents overlapping submissions, disables retries and uses `networkMode: always` to avoid a paused offline deletion silently running later. Completion refreshes directory, analytics, duplicates, affected overview/history, classroom lists and search. Navigation/close callbacks run only while the same mounted scope/student is active. Errors from another scope are hidden.

Row actions keep their confirmation open on failure and explain archival/retained history. Overview retains native confirmation, shows inline recovery, and closes its sheet or returns its page to the directory after current-scope success. Controls wrap with 44px targets; row dialog height is viewport-limited and scrollable. Class/term controls are disabled during an overview record mutation, but their backend services are not certified by this slice. No table/filter/global-store redesign is needed for this mutation.

## Deferred verification

No tests/test writing, typechecks/builds/lint/formatters, browser/mobile/keyboard checks, live data operations, schema changes, dependency installation or commits. Scoped tracked-file whitespace checks and source readback passed; these do not prove types, transaction behavior or responsiveness.

Later cover direct API/action/DB calls, role/module revocation, missing/foreign targets, stale scope, canonical-only deletion, contradictory/null ownership, null direct student IDs, already-archived/partial legacy state, same-student concurrency, rollback at each write, preserved financial/assessment/guardian data, cache/navigation isolation, interrupted/offline requests and 320/375/768 confirmations. Separate term removal/class changes, other domain boundaries, ownership/default/rollout decisions and the complete portfolio remain open.
