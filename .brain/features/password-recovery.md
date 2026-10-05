# Password Recovery

## Implementation status

2026-09-08 shared URL follow-up: pure HTTPS configuration moved to utils/auth-url; auth/configuration remains a compatibility re-export. Staff tenant setup generation/worker checks now use this shared policy (ADR-0036). Ordinary password recovery still uses the configured auth root, with actual HTTPS routing verification deferred.

2026-09-08 origin follow-up: configured auth root now uses strict HTTPS parsing and preserves explicit shared proxy ports; demo/HTTP fallbacks and reflected trusted origins are removed. Request/callback origin policy independently validates active tenant or verified custom-domain ownership before granting trust. Actual proxy/routing/browser behavior remains unverified; see ADR-0035. The earlier configured-root limitation below now concerns runtime validation and remaining tenant email helpers, not missing auth-origin source guards.

Recovery boundary written; all tests, browser/mobile QA and deployment verification deferred. See [ADR-0033](../decisions/ADR-0033-bound-email-password-recovery.md) and [CORE-002](../tasks/2026-09-07-core-002-tenant-module-controls.md).

## Behavior

- The forgot-password form requests emailed instructions in every environment. It never receives a usable reset link directly. The acknowledgement does not disclose account eligibility, and provider errors are not echoed to the public form.
- Recovery requires an unambiguous canonical email-linked active user, active/non-purging account and existing single canonical credential. It does not initialize/reactivate credentials. Pending staff must use the staff invitation flow. No operational module entitlement is needed for ordinary recovery.
- The dashboard request keeps selected-school membership filtering. Direct Better Auth requests share identity eligibility; possession of a new emailed token remains required regardless of where the request originated.
- Reset links use the configured auth application origin and current database school branding, not supplied callback URLs, host headers or branding headers. This changes the landing target to the configured auth root; its tenant routing and HTTPS/proxy configuration remain required implementation/verification work.
- Emailed framework tokens carry a separate hashed lookup proof binding user, email, account and credential. Old unbound tokens—including previous public development links—require a fresh request after rollout.
- Auth owns input validation and hashing. A Serializable DB transaction rechecks identity and token/proof, consumes both, updates the exact credential, clears legacy User.password, invalidates other recovery proofs and revokes stored sessions. Failed transactions roll back; uncertain network responses should be resolved by trying sign-in before repeating.
- Forgot-password content wraps, email has autocomplete/length bounds, and interactive controls have 44px minimum height. This is source-level construction, not verified mobile responsiveness.

## Deferred acceptance checks

- Normal eligible request/email/reset/sign-in, invalid-format input and neutral unavailable-account acknowledgements.
- Duplicate/case-variant/deleted users, purging accounts, missing/archived/mismatched credentials and pending staff.
- Invalid/expired/legacy/superseded tokens, User ID passed as token, concurrent consumption, expiry during lock wait, rollback and post-commit transport failure.
- Changed email/account/credential between request, delivery and completion; replay after another recovery.
- Configured root routing, trusted origins, HTTPS shared-proxy URLs, callback injection, actual email delivery and no token leakage in logs/browser responses.
- 320/375/768px layouts, long emails/errors, touch/keyboard focus and screen-reader announcements.

General quick-login, cached-session and legacy auth helpers are separate unfinished coverage. No live emails, credential changes or database operations were performed during implementation.
