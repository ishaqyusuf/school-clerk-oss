# ADR-0024: Email Proof Before Enrollment Parent Login Linking

- Status: accepted implementation design; verification and rollout pending
- Date: 2026-09-07

## Context
The former public parent-password action selected a tenant account by caller-supplied email OR application phone and returned a reset token directly for passwordless accounts. Enrollment code/application possession is not proof of account ownership. Approval also inferred a login from email/phone matches, potentially joining a login to an existing guardian's wards.

## Decision
- Request setup using the existing application/code capability, but deliver the identity proof only to the application's recorded primary-parent email. The request no longer accepts an email or password. Changing a contact email requires staff review outside this public flow.
- Issue a 256-bit random, 30-minute token. Store its SHA-256 identifier and bound application/code/parent/school/account/email scope in the existing `Verification` table. One row per parent provides a one-minute resend limit; a resend replaces the old token. Failed email delivery invalidates only that attempted token. No console/token-return shortcut is allowed.
- Compose email URLs from the configured canonical school-site root and stored tenant slug using HTTPS. Never derive the destination from caller-supplied Host/forwarded headers. Missing configuration/delivery fails visibly instead of claiming success.
- Viewing the token page is read-only. Explicit password-form submission revalidates active link, application state, primary parent/email, tenant and Admissions + Parent Portal modules, then consumes the challenge in a serializable transaction with identity/guardian changes. Failed transactions retain the challenge for retry; replay cannot repeat the committed mutation.
- Create an email-verified Parent account only when no active account already uses the email. Existing matching accounts must be unambiguous, belong to the same tenant and have the Parent role. Do not change established passwords. Only initialize a missing credential with Better Auth's existing password hash format; do not start a session automatically.
- Public application phone/name is contact data, not login ownership. New accounts do not gain phone login from that unverified value. Approval uses only an explicit verified Parent link with matching tenant/email, not an OR email/phone lookup.
- Guardian binding has conditional write predicates. Never replace a different existing user or claim an unlinked guardian with other active wards. Those cases require staff resolution. Approval without a verified login can still create enrollment/contact records without inventing login ownership.

## Consequences and Remaining Work
The success page now requests an email link; confirmation has a separate responsive, no-index/no-referrer page. Existing password users use ordinary dashboard sign-in/recovery. The app owns forms/email delivery; auth owns the challenge lifecycle/hash; DB owns scoped identity and guardian writes. No schema migration, production write, live email send, or data cleanup was performed during implementation.

Before rollout, verify concurrency/replay/expiry, revoked modules/links, changed application data, role/cross-tenant denial, credential preservation, guardian collisions, email delivery and canonical URL behavior, and mobile/browser accessibility. Audit legacy parent links created by the old path; do not silently delete or reassign them. General auth duplicate-email handling and password recovery remain separate security surfaces, not proved safe by this change.
