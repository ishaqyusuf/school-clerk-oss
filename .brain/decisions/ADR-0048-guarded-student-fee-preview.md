# ADR-0048: Guarded student fee preview

- Date: 2026-09-08
- Status: implemented in source; verification deferred
- Related: CORE-002, ADR-0047

## Decision and ownership

Move `academics.previewApplicableFeeHistories` into a bounded API schema, a live-authorized API service and an exported DB-owned projection. This follows the inspected Midday customer/search schema/router/query pattern while retaining Prisma, existing audience helpers and the fee-list DTO. No new page, sheet, table, bulk action or global store is needed.

The service validates direct-call input and checks live stored session/account/school, Admin/Registrar, Students + Academics + Finance and optional displayed school/user/login-session scope. Authorization and data reads share a RepeatableRead transaction. IDs do not replace credentials. Validate the term's live school session and, when supplied, classroom ownership in that session. Missing/foreign targets return NOT_FOUND, closed terms return CONFLICT, and access/scope mismatch returns FORBIDDEN rather than an empty fee list.

Select only live same-school fee items and streams, matching session/term/classroom applicability and the requested admission/gender audiences. These attributes intentionally support simulation before a student exists, not identity selection. Preserve required/optional flags, displayed fee fields and deterministic ordering. A valid empty array means no matching displayed items; it is not proof that finance configuration is correct or a price lock for a later write.

## Client contract

Both overview enrollment and student-creation previews share a browser-safe hook with standard scope-bearing tRPC input keys. Hide loading/refetch/error/paused/placeholder data and collect unused caches immediately. Use explicit retries and fresh mount/mutation invalidation, not timer/focus/reconnect refresh that silently resets active form selections. Unavailable data does not prune the draft's selected fees/payments; controls and totals are withheld until current data returns. Enrollment/payment creation in the footer waits for the preview, with no automatic mutation retry. This UI gate never replaces write-side authorization and fee recomputation.

Read-state messages and retry buttons wrap on narrow screens, use shared UI with 44px targets, and payment details stack on mobile. The create action now uses provider hooks rather than static query globals. Source inspection caught the prior DB enrollment service's missing declared utils dependency; package manifest and Bun workspace lock metadata now declare the existing workspace package. No new external dependency or installation was performed.

## Verification and limits

No tests/typechecks/builds/lint/formatters/browser/mobile QA, live reads/writes, schema actions or commits. Later cover direct calls, changed scope, revoked modules, foreign/closed/mismatched targets, audience/class applicability, empty versus failed preview, stale caches, draft preservation, footer guards and narrow-screen retry. Remaining create/import/enrollment/mutation paths and full finance configuration/amount consistency remain separate unfinished work. This does not complete CORE-002 or the portfolio.
