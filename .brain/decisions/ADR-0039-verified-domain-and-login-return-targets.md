# ADR-0039: Verified domain binding and local login return targets

Date: 2026-09-08
Status: Implementation written; verification deferred

## Context

Dashboard custom-domain lookup accepted any nondeleted TenantDomain row, while auth origins required verification and account checks. Standard-domain context could use stale TenantDomain metadata despite auth/workspace resolution already using SchoolProfile. Browser login accepted network-path return destinations; server login rejected only literal `//`, and caught the successful Next.js redirect inside its authentication error handler.

## Decision

Follow Midday's post-authentication redirect ordering and package/state boundaries. Reusable domain queries stay in `packages/db/src/auth-origins.ts`; pure browser-safe return parsing lives in an explicit utils export; dashboard functions orchestrate existing tenant URL helpers. No changes to hostname topology, proxy configuration, provider or schema.

- Standard auth/dashboard domain context uses exactly one active SchoolProfile slug and active/non-purging account, aligning the existing auth-origin/workspace/staff-link policy. Standard slug resolution no longer depends on TenantDomain table availability. Deleting an alias row alone does not revoke an active SchoolProfile slug.
- Custom-domain resolution requires a canonical lowercase host-only input, exactly one nondeleted row with stored `isVerified: true`, live school/account relations and matching account IDs. Derive the canonical slug from the school; if the domain row also has a slug, require agreement. A custom-only row with a null slug can resolve through its correctly bound school. No inferred ownership or automatic repair.
- Both auth-origin checks and dashboard lookup use this shared resolver. Missing custom-domain storage denies dashboard custom lookup; unrelated errors propagate. The existing missing-table classifier remains available to signup compatibility callers. No DNS verification, record verification flag changes or provisioning were performed by the agent.
- Both login client and server use `normalizeAuthReturnTo`: bounded application-relative destinations only, optional missing leading slash, URL-normalized pathname with query/hash preserved. Reject absolute schemes, network-path references, raw controls/backslashes, encoded path separators/controls/nested-percent encoding, malformed path escapes and normalization into a leading `//` path. The `.invalid` URL base is a parser sentinel, never a request destination.
- Existing tenant URL routing applies the current host/path prefix after parsing. Invalid destinations fall back to existing role/onboarding defaults. Downstream routes must still validate their own redirect-like query fields; this parser does not authorize routes or follow embedded URLs.
- Calculate successful login destinations inside the auth try block, then redirect outside it. This preserves Next.js redirect control flow rather than displaying it as login failure. Quick-login dispatch returns directly. Server error URLs carry fixed safe messages instead of arbitrary provider/database exception text.

## Compatibility and remaining work

Unverified, archived, mismatched, noncanonical or orphaned custom-domain records can stop resolving and require authorized review. No alias backfill, DNS operation, deployment or schema rollout occurs. Stored verification is trusted provisioning state, not a fresh DNS ownership test. Session/domain changes after a check and generic provider callbacks remain separate audit surfaces.

Signup, generic auth/account mutations, legacy helpers and broader domain access remain unfinished. Return-target restrictions apply to login, not every generic link/navigation utility, which intentionally still supports external links. Existing UI layout/responsiveness is unchanged.

## Deferred verification

After user resumes: standard slug without TenantDomain table; deleted/purging/unknown schools; verified/unverified custom records; account/slug mismatch; null alias slug; uppercase/IDN/trailing-dot/port inputs; missing table vs unrelated DB failure; client/server/quick-login redirects; safe paths/query/hash; absolute/network/backslash/control/encoded/nested/malformed/dot-segment inputs; current-tenant path-style routing; successful redirect not entering error handling; mobile/desktop browser navigation. No tests, builds, types, lint or browser/UI checks ran for this slice.
