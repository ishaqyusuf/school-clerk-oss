# ADR-0037: Live auth sessions and canonical password identity

Date: 2026-09-08
Status: Implementation written; verification deferred

## Context

Better Auth's email lookup selects one user and its credential accounts without School Clerk's deleted/tenant/pending-staff rules. The five-minute cookie cache bypassed DB-backed revocation. Parent phone resolution could fall back to an unscoped first match when tenant resolution failed. The `role` additional field was writable through generic auth input.

## Decision

Keep Better Auth responsible for password verification, signed cookies, callbacks, CSRF, session creation and response shapes. Add DB-owned identity/session reads and auth-owned request adapters, following Midday's package boundaries and post-authentication session checks. No replacement provider, schema or auth transport.

- Password sign-in normalizes/bounds email and bounds password length. Recovery eligibility provides unique canonical identity/credential, active account and pending-staff exclusion. Archived collisions do not choose or repair a winner. Accountless platform identities retain only the existing server-configured `SCHOOL_CLERK_PLATFORM_ADMIN_ROLES` policy and canonical credential; linked deleted/purging accounts cannot use that exception.
- Bind framework lookup to the checked user ID/email/name/role/verification state and credential ID/hash. Recheck before and after session creation; a failed post-create check removes only the new unissued session before cookies. Valid-format ineligible requests perform dummy hashing before generic invalid credentials. Timing equality is not claimed.
- Disable cookie cache authorization but retain the JWE format for old cookies during transition. Install adapter wrappers on each request context, not plugin initialization: the inspected framework rebuilds its adapter after plugin init. Direct get-session, nested session middleware, multi-session reads and session lists check DB session ID/token/user agreement, future expiry, active user and active/non-purging account (or configured accountless platform role). Return current user metadata and expiry.
- Preserve signup's session-creation/tenant-attachment sequence. Ordinary unattached signup users cannot use subsequent live-session reads before attachment. This is not a new platform-user bootstrap path.
- Mark `role` additional auth metadata `input: false`. Generic profile updates cannot set it; signup uses server-owned `Admin`. Dedicated authorized management services own role changes. Existing stored roles are not rewritten or endorsed.
- Parent phone resolution requires exactly one active school for the slug and one same-account Parent match, including archived-user collisions. No tenant means no phone lookup. Password verification remains mandatory.

## Limits and rollout

Point-in-time checks do not atomically cancel concurrent requests or retract delivered information. Session update/refresh races, generic account mutations, legacy passwordless helpers, signup provisioning, workspace-cookie ownership, existing suspicious role assignments and all domain entrypoints remain audit work. Normal tenant/module/record guards stay mandatory. Accountless platform password recovery is unchanged.

Ambiguous, mixed-case stored or archived legacy identities can require authorized identity review; no merge/reactivation/backfill occurs. Disabling cookie caching adds DB reads. Database-level email uniqueness remains unresolved. No live sessions, user mutations, env/deployment/provider/schema operations were performed by the agent.

## Deferred verification

After user resumes: direct HTTP/server API sign-in; wrong-password/dummy-hash paths; duplicate/archived email/credential rows; pending staff; deleted/purging accounts; platform-role configuration; identity/password/role changes around issuance; failed recheck and exact-new-session cleanup; old JWE caches; revoked/expired/changed-token sessions; nested authenticated endpoints/lists; cross-request wrapper isolation; signup attachment; role-injection rejection; tenantless/ambiguous/cross-tenant phones. Then browser/mobile login, redirects, recovery and onboarding. No tests, types, builds, lint or UI verification ran for this slice.
