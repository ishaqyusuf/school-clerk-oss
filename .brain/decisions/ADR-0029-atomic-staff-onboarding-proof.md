# ADR-0029: Atomic staff onboarding with bound proof

Date: 2026-09-07
Status: Implemented in source; verification and rollout pending

## Context

The former completion action accepted staff ID/email without proof, then changed profile data and marked matching email accounts verified. The browser separately reset a password first, leaving a consumed token if profile completion failed. Installed Better Auth reset handling consumes its own generic token outside the new profile transaction, so sharing that token would leave a second non-atomic path.

## Decision

New staff links use a dedicated `staff-password-setup:<SHA-256(token)>` Verification capability and a latest-per-staff proof (`id: staff-onboarding:<staffId>`, hashed `staff-onboarding:v1:` identifier). The proof records exact staff/user/school/account/email/role. Issue both rows together with 24-hour expiry; a new issuance replaces the prior proof. Raw link secrets remain only in the link/authorized delivery payload, not these lookup identifiers. Ordinary Better Auth password reset cannot consume the new namespace. This supersedes ADR-0028's initial reuse of generic reset-password tokens.

Auth package validates input, checks live context/module access before hashing, and uses Better Auth's password hash helper. A serializable DB transaction rechecks proof/capability expiry, current non-deleted/non-purging school/account, pending staff, matching user/email/role, and exactly one active credential account. It consumes both rows, writes the credential hash and profile, marks only that user email-verified, and soft-revokes stored sessions. Any missing/changed row aborts all writes. A held expired capability is checked again after consumption lock waits. The proof is a bearer invitation capability; a submitted ID/email is never sufficient.

The dashboard action delegates to auth; onboarding UI calls it once instead of first invoking generic reset. Ordinary password recovery remains unchanged. Definite transaction failure preserves retry capability; uncertain transport failure prompts sign-in before repetition, not automatic replay. Success clears the password field and replaces the token-bearing route with login. UI controls are responsive by construction, not browser-verified.

## Consequences and remaining gates

Old unbound staff links require authorized reissue; no legacy metadata or grants are fabricated. The worker now also checks the latest onboarding proof and dedicated capability. Deploy producer, worker and UI together after verification. Existing legacy generic tokens may remain usable by ordinary recovery until expiry/review; no runtime token deletion occurred. General auth cache/recovery and legacy password columns remain audit scope; soft-revoking stored sessions does not prove every cached consumer immediately rejects them.

Staff-user email collisions/reassignment, direct in-app/status writes, canonical email hosts and rollout remain unfinished. No schema changes, live credentials/tokens, emails, jobs, tests, typechecks, builds, lint or mobile/browser QA were performed. Concurrency/rollback, password login, supersession, module revocation, ambiguous response and accessibility still need deferred proof.
