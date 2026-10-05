# ADR-0057: Atomic admission classification and fee reconciliation

- Date: 2026-09-08
- Status: implementation written; verification deferred
- Related: CORE-002, ADR-0047, ADR-0049, ADR-0055

## Decision and architecture

Move single/bulk admission classification from the monolithic student query into shared browser-safe schemas, a thin API adapter and DB-owned `classifyStudentTermForms`. Follow Midday customer schema/router/query boundaries and provider-backed table mutations while preserving SchoolClerk Prisma ownership and the existing ephemeral directory bulk confirmation. No new route, sheet, table/filter/URL structure, schema migration, dependency or job is required for this existing bounded synchronous batch.

Preserve documented Admin/Registrar admission-management permission. Automatic admission fee reconciliation does not confer general payment, waiver or finance-management privileges. Router and direct service require fresh stored session/user/account/school and effective Students, Academics and Finance. Displayed school/user/login scope must agree; no grants/defaults are inferred.

## Transaction and integrity

Accept 1–100 distinct trimmed IDs bounded to 200 characters and UNCLASSIFIED/NEW_ADMISSION/RETURNING. Validate all live owned forms, matching parent/canonical identities and school/session/term/classroom ancestry. Null direct student IDs resolve only through matching owned parents without repair. Reject missing links instead of silently skipping reconciliation, closed academic terms/finance ledgers and duplicate/conflicting student-term identities.

Lock sorted canonical students, then sorted selected forms using existing finance `pg_advisory_xact_lock(hashtext(schoolId), hashtext(formId))` keys. Recheck wall-clock session expiry after waiting. Classification and every selected form's reconciliation commit together under Serializable isolation, with exact update counts. P2034 returns an explicit refresh/conflict; no automatic retry. Point-in-time checks/locks do not imply instantaneous revocation or universal ordering across other finance/lifecycle writers.

Before reconciliation, validate active attached charge school/student/session/term, stream, item and optional original classroom ancestry. An original class can differ from current placement if still owned and in the same session. Active unbound charges for an exact selected student/term fail review rather than invite duplicate charges or silent adoption. No archived identity, parent default or unrelated term is repaired.

The shared fee helper retains required-fee application and optional selections. Cancellation now repeats school/student/form/session/term ownership, active/noncancelled state, DRAFT/PENDING status, exact zero paid amount and automatic/selected assignment source. Active allocations or ledger entries prevent cancellation. Paid/partially paid, waived, negative/inconsistent paid amounts, manual and linked financial history remain. No payments, allocations or ledger records change. Other helper callers benefit from this predicate but do not inherit the service's authorization/transaction guarantees.

## Response and client

Return changed `updated`, `alreadyClassified`, owned student/form IDs and per-form `applied`, `skipped`, `total`, `cancelled`, `retained` counts. Retained means obsolete automatic/selected fees not cancelled, not balances or all preserved history. Already-classified forms still reconcile missing fees. The RPC no longer returns raw created charges/amounts.

`useClassifyStudentTerms` binds single-flight submission and local callbacks/errors to identity, role, academic context, selection and requested classification. Retry/offline queue is disabled. Successful mutations invalidate returned student/form records and related directory/academic/search/finance query families even if the originating view disappeared. Only the current mounted view can toast/close/clear selection. Invalid or unavailable selected rows cannot be partially submitted.

Confirmation stays open on failure, explains fee effects and retained history, blocks competing bulk actions while pending and uses labelled 44px controls and wrapping messages within the existing scrollable dialog. This is source-level responsive construction, not verified UI behavior.

## Conformance and remaining work

Source inspection confirms package exports, API compatibility aliases, both guarded endpoints and migration of the sole current dashboard RPC consumer. Client imports use browser-safe schemas and router types only. Route/header/filter/column/sheet structure intentionally stays unchanged for this bulk action. All tests, typechecks, builds, lint, browser/mobile/keyboard/visual QA and final verification remain deferred.

Remaining work includes gender/basic-profile/import reconciliation callers, wider finance/lifecycle concurrency enforcement and all other portfolio workstreams. Legacy ownership, module defaults/activation authority and production confirmation remain unresolved. No schema/live operations, sends, jobs, deployments or commits occurred.
