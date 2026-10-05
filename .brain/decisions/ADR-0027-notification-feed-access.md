# ADR-0027: Current-access notification feeds

Date: 2026-09-07
Status: Feed/client/API delivery scope implemented in source; verification and direct/worker coverage pending

## Context

Saved notification text can disclose disabled-module information. The former feed had no module filter, used a selected school independently of account ownership, created contacts during reads, and returned a full notification after mark-read. Shared API session lookup omitted expiry/deleted-user predicates.

## Decision

Follow Midday's authenticated router and DB-owned query boundaries. Resolve stored live session/user/account-owned school first. A notification-package policy explicitly classifies registered types by modules and, for privileged audiences, current roles. Unknown types deny by default. Workspace onboarding is explicit recovery information independent of module grants, not a domain-access exception.

Use a shared DB school/type/recipient predicate for list, unread count and status writes. Filter before pagination. Do not create contacts during reads or modify unavailable rows during mark-all. Single mark-read returns a minimal receipt. Existing recipient records override legacy user read state; nullable status is consistently unread. Preserve all hidden history/preferences. Shared API session lookup now excludes expired/deleted sessions and deleted users for all its callers.

## Consequences and limits

API audience/direct-user dispatchers now share a delivery loop. DB-owned helpers reload active school/account, initiating session/user, recipient membership/role/email, module configuration and preference. In-app authorization/contact/notification writes share a transaction and respect registered channels. Email rechecks after rendering, uses the current recipient address, and skips rendered school-name/domain mismatches. Confirmed partial counters are retained on subsequent failure. Logs avoid raw payloads and rendered token links. The existing synchronous API path is preserved for this guard slice; a durable outbox/job/idempotency redesign remains separate work.

Following Midday's shared notification hook pattern, one dashboard hook now owns page/bell/mobile badge queries and read mutations. Server-seeded school/user identity is combined with an allowed-type signature only after matching client auth/profile/module readiness. All API inputs must carry this displayed scope; the server recomputes permissions, denying identity mismatches and stale policy signatures. These values are cache selectors, not authorization credentials. Mutations invalidate their submitted scope. Loading/refetch/paused/error states withhold cached rows/counts; inactive queries have zero retention and no previous-data placeholders. Reload recovery refreshes both identity and feed. No optimistic status writes or automatic mutation retries.

Current-access filtering may hide historical notices after role/module changes; it does not delete them. Unclassified legacy types need deliberate review, not automatic grants. Queries capture policy at operation time; this is not transaction-wide module-revocation locking. Previously delivered browser data/email cannot be recalled, and no real-time revocation subscription is implemented. Delivery/module checks remain separate required work. Generic Activity/dynamic reads remain an audit item. No schema changes, live writes, email sends, tests, typechecks or browser/mobile QA were performed. Responsive UI is source-level only.
