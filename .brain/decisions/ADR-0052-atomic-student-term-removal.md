# ADR-0052: Atomic student term removal

- Date: 2026-09-08
- Status: backend implemented; client follow-up implemented in ADR-0053; all verification pending
- Related: CORE-002, ADR-0047, ADR-0051, academic term lifecycle

## Decision and boundary

Replace independent single/bulk archive queries with shared browser-safe schemas, thin API adapters and one DB-owned Serializable service. Follow the inspected Midday protected-router/tenant-query pattern while retaining SchoolClerk soft deletion and endpoint names. Bulk removal validates every requested record rather than silently archiving a matching subset.

Both endpoints require Admin/Registrar with Students + Academics. The DB service parses input and resolves current stored session/user, active non-purging account and exact school ownership inside its transaction. Optional displayed school/user/login-session scope must match the live actor. IDs and module grants cannot choose another school.

## Record and transaction semantics

Read all requested same-school term forms, explicitly including archived rows for repeat handling. Each must have a live school-owned canonical student and parent session form, consistent student IDs, live same-school academic term/session and matching session IDs. A missing direct student ID may resolve only through its same-school parent session form's canonical student; it is not backfilled. Contradictory/missing ownership or ancestry fails before writes. No foreign record details are returned.

Active forms in CLOSED terms reject the entire batch. Valid already-archived forms need no write and count separately. Lock derived owned canonical students in sorted ID order, consistent with enrollment/canonical deletion coordination, and recheck wall-clock session expiry after waiting. Archive only selected active term forms with one timestamp and an exact affected-count check. Any failure or serialization conflict rolls back the batch; no automatic retry. This is point-in-time authorization, not push revocation or a universal guarantee against unrelated legacy writers.

Do not archive the canonical student or session form, alter another term, repair links, or mutate assessment/attendance/guardian/financial records. Outstanding balances are not cancelled. Session-level placement remains for other terms. Whole-student deletion and other lifecycle-affecting mutations are distinct workflows requiring their own conformance audit.

## Contract

Single input retains `id`; bulk retains `ids` with 1–100 distinct entries. IDs are trimmed and bounded to 1–200 characters. Both support optional `viewScope { schoolId, userId, loginSessionId }` and return `{ count, alreadyDeleted, studentIds }`: newly archived rows, valid requested rows previously archived, and validated owned canonical IDs for invalidation. Foreign/missing requested rows return NOT_FOUND; invalid ancestry, closed active terms, stale scope or concurrent change return CONFLICT; access denial is FORBIDDEN. Unexpected failures use fixed API copy. Invalid batches never receive success-shaped partial results.

The read-only `getTermFormDetails` endpoint still reuses the ID schema but does not inherit this mutation authorization service; its direct read boundary remains to audit.

## Client progress and required follow-up

The initial client milestone below is historical. ADR-0053 now implements the shared hook, scope/callback fencing, invalidation and confirmation/recovery states across all seven instances. The independent term-detail read boundary and verification remain open.

All seven current term-removal mutation instances explicitly disable retry and use `networkMode: always`, preventing an offline operation from being silently queued for later. Directory bulk confirmation stays open on failure, shows inline errors/selection bounds, explains atomic removal and retained balances, and uses viewport-capped scrolling with 44px controls. Report-filter deletion now requires confirmation and guards pending repeated clicks.

Shared scope-bearing client orchestration, request/selection-safe completion, precise invalidation and full recovery/mobile conformance across directory, overview, promotion, progression and report filters remain required. Current callbacks and the report filter's legacy static query client are not certified. These are next implementation tasks, not optional QA-only work.

## Evidence and deferred verification

Source readback and scoped tracked-file whitespace checks passed. Router/helper search confirms both endpoints delegate to one DB service; seven existing mutation instances have explicit network/retry settings. No tests/test writing, typechecks/builds/lint/formatters, mobile/browser/keyboard QA, live data operations, schema changes, dependency install or commit.

Later verify direct calls, duplicates/bounds, mixed-ownership/missing/closed batches, archived repeats, null direct student IDs, parent/session mismatch, concurrent canonical deletion/enrollment/removal, rollback, retained histories/balances, scope changes, interrupted/offline requests and 320/375/768 confirmations. CORE-002 stays 5/10; the entire portfolio and unresolved ownership/default/rollout choices remain open.
