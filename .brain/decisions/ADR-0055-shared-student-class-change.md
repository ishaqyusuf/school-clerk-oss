# ADR-0055: Shared transactional student class change

- Date: 2026-09-08
- Status: backend written; client integration subsequently written in ADR-0056; all verification pending
- Related: CORE-002, ADR-0047, ADR-0052, ADR-0054

## Decision

Single and bulk class-change endpoints delegate through a thin API adapter to one DB-owned Serializable transaction. Follow the inspected Midday schema/protected-router/tenant-query boundary; retain SchoolClerk Prisma, endpoint names and normal same-session move behavior. Shared bounded schemas and the existing exact-name normalizer belong in utils with explicit exports. The old query module re-exports the new schema/types/services for compatibility. Duplicate-name normalization is moved unchanged, not redefined.

## Authorization and transaction

Both router and direct DB service require live stored session/user/account/school with Admin/Registrar + Students/Academics. Optional displayed school/user/login-session scope must agree. The destination department/class/session must be live and same-school. Validate all 1–100 distinct requested forms before writes: live owned canonical identity, matching owned parent session form, matching live school term/session and any existing term/parent classroom ancestry. Null direct student IDs resolve only through the matching parent and are never backfilled. Closed selected terms reject the whole batch, including no-op requests.

Lock derived owned canonical students in sorted ID order and recheck wall-clock session availability after waiting. Require one active session form per selected canonical student/session. Inspect scalar references, including archived children of parents whose defaults can be updated, and reject mismatched parent ownership. Duplicate active enrollment for the selected canonical student/term is an integrity conflict. Destination identities and submitted batch members share the existing normalized-name collision rule; no first/last-map-entry overwrite can hide a conflicting identity.

Change selected term placement and each affected owned parent session default together, checking exact affected counts. Any missing/foreign/closed/malformed/duplicate/concurrent failure aborts the whole batch. Serialization conflicts return refresh guidance with no automatic retry. This coordinates the known row-lock/Serializable paths, not every unrelated legacy writer or instantaneous revocation.

## Preserved domain behavior

A new move changes selected StudentTermForm.classroomDepartmentId and its StudentSessionForm default, as the former implementation did. Other term forms keep their own placement. A form already at the destination contributes `alreadyInClass` and does not independently reset a parent default that a later term move changed. If another selected form sharing the parent actually moves, that parent's default follows that move once.

No finance charges/payments, fees, balances, assessment records, attendance, guardians or admission classification are rewritten. Existing scores/attendance retain their original subject/register links; they are not mapped into the destination's structures. Class-specific history views may therefore withhold mismatched linked history pending review. This is not fee repricing, score transfer or cross-session promotion, and does not certify full historical reporting/transfer behavior.

## Contract

Single input retains `{studentTermFormId, classroomDepartmentId}`; bulk retains `{studentTermFormIds, classroomDepartmentId}` with 1–100 unique entries. All IDs are trimmed, nonempty and at most 200 characters; optional `viewScope` is the standard school/user/login binding. Both return `{count, alreadyInClass, studentIds, termFormIds, sessionFormCount, classroomDepartmentId}`. `count` means newly moved forms, not all requested forms; `alreadyInClass` separates no-op forms. Returned record IDs were validated in the active school. Missing target/forms use NOT_FOUND; ownership/lifecycle/duplicate/scope/concurrency conflicts use CONFLICT; access denial uses FORBIDDEN. API unexpected-error copy is fixed.

The two current dashboard callers ignore the old count result and remain compatible with the new fields; external consumer compatibility is not proven. Coordinated rollout and later contract tests remain required.

## Client progress and remaining work

The initial client milestone below is historical: ADR-0056 now implements shared scoped submission, dedicated target-option reads, invalidation and recovery in both callers. Historical-domain/lifecycle coverage and all verification remain open.

Both existing mutations now disable retry and offline queuing. Directory batch confirmation prevents automatic dismissal while submitting, retains errors, rejects missing/unavailable selections and bounds, and explains session-default/history effects. Overview shows inline recovery and disables the picker while changing records. Existing responsive wrapping/44px confirmation controls remain; no mobile behavior is verified.

Required next implementation: shared scope-bearing class-change hook, target/selection-safe completion and reset, precise record/list/report invalidations, current scoped classroom-option reads, complete readiness/confirmation/error/mobile behavior in both callers. These are not optional QA-only tasks. Class-bound history/report semantics and remaining lifecycle writers remain separate coverage, along with the whole portfolio.

## Evidence and deferred verification

Schema/normalizer/service/DB source and call sites were read back. Search confirms both API endpoints use the shared adapter/service; legacy query implementations were removed and re-exports retained. Scoped tracked-file `git diff --check` passed. No tests/test writing, typechecks/builds/lint/formatters, browser/mobile/keyboard QA, schema/live operations, dependency install or commits.

Later verify input bounds/duplicates, forged/direct/stale scope, expired/deleted identity, cross-session/foreign/closed ancestry, null IDs, parent/sibling mismatches, batch name collisions, duplicate enrollment, concurrent move/enrollment/archive, whole-batch rollback, repeat counts/default preservation, retained financial/academic history and 320/375/768 UI flows. CORE-002 remains 5/10; portfolio remains 0/14 verified.
