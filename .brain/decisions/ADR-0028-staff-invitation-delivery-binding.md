# ADR-0028: Bound staff-invitation delivery

Date: 2026-09-07
Status: Issuance/worker slice implemented; full onboarding security and verification pending

## Context

Staff management formerly resolved actor/school from workspace cookies without the shared live Admin/module guard. Queued invitation email trusted URL/email/name snapshots with no school/user binding. The public completion action also lacks identity proof; this remains an explicit release-blocking implementation item, not solved by delivery checks.

## Decision

Management actions require current Admin and Staff module access, active account-owned school and valid selected school/session/term. Staff saves additionally require Academics because they rewrite academic assignment rows. Copy/send token issuance rechecks pending staff and same-account login/email/role.

Reuse Verification storage with namespace `staff-invitation-delivery:v1:`. Its expiring JSON binding records school/account/staff/user/actor IDs, email, role, tenant slug and SHA-256 of the exact approved URL. The worker receives only `{ deliveryId, ctaHref }`; it loads current records and validates digest, URL parameters, active reset token, pending staff, current user/role, current Admin actor, active non-purging account/school and email preference. Staff module access is checked before rendering and again immediately before provider invocation. Do not require the original browser session to remain live during a queued job; the approved binding plus current actor authority is the worker boundary.

Keep persistence/context in the DB package, pure module resolution in utils, worker orchestration in jobs, and templates in email, following the inspected Midday task/action boundaries. Existing provider retries carry stable delivery/route idempotency keys and entity headers; this is not a durable exactly-once guarantee. If current display/address data differs after rendering, skip the stale message.

## Rollout and remaining work

Update: ADR-0029 replaces generic reset-token reuse for newly issued staff links with dedicated hashed setup capabilities and latest staff-bound proof. It also replaces public ID/email-only completion with atomic password/profile/proof consumption. The worker checks that current proof. Earlier generic-token/public-completion descriptions below are historical context, not the current implementation contract.

Old jobs without delivery IDs fail validation and require a fresh authorized invitation; no legacy binding is synthesized. Deploy producer/worker together after verification. No schema migration, backfill, runtime token creation, email or worker execution was performed by the agent. The existing reset-password capability format remains unchanged. Receipt expiry is at most one day from issuance and actual reset-token expiry is checked separately.

Still required: authenticated/public-proof onboarding completion and retry after password success, user-email collision/reassignment rules, legacy/reset-link revocation, direct in-app invitation/status writes and canonical email-host review. External sends cannot be atomic with revocation or recalled. A new invitation has a new delivery key; cross-invitation deduplication is not provided. All tests, typechecks and mobile/browser QA remain deferred. No full staff-onboarding completion claim.
