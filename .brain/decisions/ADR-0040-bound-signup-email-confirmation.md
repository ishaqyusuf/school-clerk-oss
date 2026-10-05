# ADR-0040: Bound signup email confirmation

Date: 2026-09-08
Status: Accepted for implementation; verification deferred.

## Context

Signup verification stored a raw UUID token with only a user ID. The page marked the user's current email verified while rendering GET, without binding the issued email or school. A changed email could therefore inherit an earlier proof, and link scanners could consume links.

## Decision

Use a namespaced, SHA-256-at-rest, 24-hour capability bound to canonical email, user, role, active account and school/slug. One deterministic per-user row makes reissue replace the previous proof. Reject duplicate case-insensitive identities including archived collisions. Read current identity and consume the exact proof with the conditional user update in one Serializable transaction; no session issuance or tenant attachment occurs.

GET only renders an explicit confirmation form. A bounded server action resolves the request school and delegates to auth/DB packages. Verification URLs use the configured HTTPS tenant auth builder, preserving explicit proxy ports. Delivery rechecks proof/identity after rendering. Existing old-format links are not accepted or automatically upgraded.

Midday supplies thin action/page and package-owned logic patterns. Retain SchoolClerk's Better Auth/Prisma/server-action stack; this verification does not establish a login session, unlike Midday OTP sign-in. Tables/sheets/query prefetch are inapplicable. Existing direct email transport remains pending the broader delivery/provisioning work; no outbox or exactly-once guarantee is introduced.

## Authorized self-service reissue

The confirmation surface and onboarding welcome expose an explicit fresh-link action. Require a signed Better Auth session, then recheck the stored session/token/user/expiry and an active school in the same account inside a Serializable transaction. The actor must be Admin and its current canonical email must equal the account's recorded owner email. No submitted recipient, target-user or target-school ID is used. This is conservative ownership evidence from the existing schema, not a new durable owner FK; mismatched legacy ownership needs manual review.

Reissue replaces only the acting user's proof and writes a per-user 60-second cooldown in the same transaction. Concurrent conflicts return a retryable generic unavailable state; no automatic resend/retry. Failed or console-only delivery still consumes the cooldown; the owner may explicitly retry after one minute. Already verified owners receive a no-send acknowledgement. Module entitlements do not gate identity recovery.

Initial signup and reissue share a server-only delivery adapter. Names/address/slug come from fresh DB-backed proof context and are rechecked after rendering. Provider acceptance is not delivery confirmation; console-only QA reports that no live email was sent. No provider error body, raw URL or token is returned/logged. Anonymous recovery links return to `/verify-email` after login without forwarding the old token.

## Limits and rollout

No schema change, database operation, legacy proof deletion, live send or deployment is performed. Old links need a fresh link from the signed-in owner flow; transactional signup provisioning remains unfinished. Email transport cannot atomically cancel a send after a final read; redemption rechecks current state. No durable outbox/exactly-once delivery, general abuse-rate policy or owner-identity migration is introduced. Generic Better Auth email/account endpoints are not certified by this app-specific boundary.

All tests and responsive/browser verification remain deferred until the user resumes verification after implementation. Source inspection is not security or runtime proof.
