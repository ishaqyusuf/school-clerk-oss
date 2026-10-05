# ADR-0025: AI tool authorization and request-bound confirmation

## Status
Accepted; request binding and transactional consumption implemented, runtime verification pending.

## Context
The AI master module and broad capabilities do not authorize every domain projected by a tool. A model-visible confirmation token is not proof that the current user approved execution. Cached sessions, workspace selections and tool definitions may be stale.

## Decision
- Keep pure per-tool capability/module requirements in `packages/ai`; keep live session/account/workspace/settings authorization in the dashboard adapter. Follow the Midday package-owned contracts and authenticated-context pattern.
- Filter model tools and frontend suggestions, but require fresh authorization through mandatory runtime dependencies before execution and again on confirmation. Mixed projections require every domain they read.
- Require the current authenticated workflow request to match the exact confirmation tool/token/input. Permit only one matching attempt within that request. A model may propose a mutation but cannot authorize it by echoing a token in text.
- Sign validated v2 payloads bound to a random 256-bit confirmation ID, user, school, conversation, academic session/term, tool and input, with a ten-minute lifetime. Reject old/unversioned/v1 tokens and require a configured signing secret. Expired or changed actions need a new preview/review.
- Before returning a token, create a namespaced `Verification` row containing its digest, tenant/user/conversation binding and expiry. The DB package checks the owned active run/conversation. Never upsert/recreate a consumed approval.
- All five current mutation tools delete the exact unexpired approval in the same transaction as their domain writes. Missing/consumed records deny the mutation. A failed transaction rolls back both consumption and domain writes; assessment serialization retry therefore retries the same approval after rollback. No schema change or new external service is required.
- Preserve established module grants, roles and data. Do not provision access or infer new default bundles.

## Consequences and remaining work
This is request binding, not proof of a particular browser gesture. An authenticated caller can submit a confirmation request. The request-local latch alone is not durable consumption; the stored row and transactional deletion provide the cross-request single-use boundary. A missing row always denies access, so deletion/expiry cleanup cannot revive an approval. Runtime concurrency/rollback behavior remains unverified. This does not deduplicate separately issued and separately approved actions.

All five mutation tools now save versioned output receipts and completion activity in the same transaction as domain writes and approval consumption. Receipt/activity failure rolls back the transaction; there is no separate post-commit completion write. Later stream failures cannot downgrade an already-completed execution. A connection can still fail after commit; the owner-scoped, current-module/tool-filtered run receipt GET and manual UI expose authoritative saved output without replaying writes. No receipt is not proof of rollback: the transaction may be in flight, inaccessible under current permissions, or from a legacy execution lacking the receipt marker. No exactly-once delivery or complete domain-idempotency claim is made. Enrollment classroom/session semantics and fee effects still need the broader service audit.

Fresh authorization checks do not cancel already-running transactions. Historical transcript/analytics scope is now implemented by ADR-0026's conservative conversation envelope and server-owned persistence; runtime verification and legacy review remain pending. General activity/notification disclosure, enrollment/finance mixed-domain consistency and legacy direct entrypoints remain under CORE-002/AI-001.

No tests, typechecks, builds, lint/formatters or browser/mobile QA were run, per the implementation-first instruction. Deferred verification must include missing/unknown modules, mixed projections, session/role/workspace revocation, model self-confirmation, payload tampering/user mismatch/expiry, repeated and concurrent requests, stock races, target ownership and narrow-screen keyboard/touch behavior.
