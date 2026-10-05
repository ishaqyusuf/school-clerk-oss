# ADR-0042: Signup handoff and channel status

Date: 2026-09-08
Status: Accepted for implementation; verification deferred.

## Decision

Resolve signup dashboard/site/login/onboarding URLs before account creation using configured HTTPS origins. Preserve explicit ports. Use the existing named school-site mapping for SchoolClerk local hosts; reject missing origins, IP/bare localhost and automatic Vercel preview roots. Dashboard signup links no longer derive trust from request Host/protocol. Server-only URL helpers share the auth-origin builder; its allowed paths now include root, login and onboarding welcome.

Account creation success is distinct from post-commit domain/email/notification outcomes. The signup action returns bounded setupStatus fields. A dedicated responsive completion component displays those results with explicit sign-in and no automatic retry/redirect. Provider acceptance is not inbox delivery, processed domain registration is not DNS/certificate readiness, and console mode explicitly means no live send. Signup default password is empty and password input supports new-password autofill and the existing 128-character maximum.

DB owns fresh active school/account/canonical owner checks and notification preferences; notification creation shares a Serializable transaction with those checks. Workspace email reads current recipient/name/slug, respects registered channel/preferences and rechecks after rendering. Verification email retains its separate bound-proof service. No raw provider error bodies or tokens are surfaced in the completion response.

Vercel utilities are ordinary server-only modules rather than remotely callable server actions. The sole signup caller supplies configured hosts and a fresh scope check before each provider request. Availability and creation share school/alias collision reads including archived records. Availability remains advisory, not reservation.

## Reference and limitations

Midday's OTP/action and state/routing patterns guide explicit mutation state, focused components and package-owned data logic. Retain existing Better Auth/Prisma/email/Vercel adapters. No table, sheet or persistent client store is needed; the completion receipt exists only in current React state.

No durable outbox, restart recovery, retry job, exactly-once delivery or provider verification is introduced. A lost response/process failure can still leave creation successful with an unconfirmed handoff; error copy advises sign-in/inbox checks before retrying. Domain partial failures are reported as needing attention, with no rollback of committed account data. Legacy query-param signup-success page, generic/legacy auth boundaries and broader enforcement still require review. No actual DB writes, provider operations, env edits or schema changes occurred. All tests/browser/mobile verification remain deferred.
