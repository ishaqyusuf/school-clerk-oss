# ADR-0033: Email-only, identity-bound, atomic password recovery

Date: 2026-09-07
Status: Implementation written; verification and broader auth coverage pending

## Context

The previous non-production public request returned a usable reset token without email possession. Production request initialized credentials for every matching email. Generic token-status lookup also accepted Verification.value, which holds a User ID. Installed Better Auth reset completion updates password and deletes token in separate operations, and requester callback/branding values previously influenced reset mail.

## Decision

Keep the existing Better Auth request API but apply shared DB-owned recovery eligibility at direct request, email delivery, token status and completion. Require one globally unambiguous canonical live identity, active/non-purging account and existing canonical credential. Pending staff use their dedicated onboarding proof. Never create/reactivate credentials or return reset capabilities from public request submission. Acknowledge unavailable identities generically without claiming timing indistinguishability.

Bind each newly mailed framework token to user/email/account/credential through a second expiring Verification row with hashed token lookup. Legacy unbound tokens require reissue; no automatic backfill. Email links use configured auth application origin and DB branding rather than callback/host/branding request data. The dashboard retains selected-school membership filtering; recovery itself is not disabled by module settings.

Use Better Auth's documented-by-installed-source before-hook response short circuit for `/reset-password`, retaining its response shape. Auth validates/hash passwords; the DB package owns rechecks, exact one-use proof/token consumption, credential update, legacy password clearing, other-proof invalidation and stored-session soft revocation in one Serializable transaction. No app imports or additional dependencies are introduced into DB. This follows the Midday planner's auth validation/package-boundary pattern without copying Midday's different identity provider.

## Compatibility and limits

Old reset links must be requested again after coordinated auth/dashboard rollout. Incomplete/ambiguous legacy identity and missing/archived credentials require account review; they are not silently adopted. The email landing target is the configured auth root, whose tenant routing and shared HTTPS proxy configuration still require audit. Existing broader trusted-origin reflection, dev quick-login and unused legacy passwordless helpers remain separate work. No claim of global instantaneous cached-session revocation, transaction ordering against every legacy writer or atomic external email delivery.

No tests, typechecks, builds, lint, browser/mobile QA, real sends, token/account operations, migrations or commits ran. Source and tracked whitespace inspection only. Deferred acceptance cases are recorded in the password-recovery feature document; CORE-002 and the full portfolio remain incomplete.
