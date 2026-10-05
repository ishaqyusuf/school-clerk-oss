# ADR-0041: Atomic school and owner provisioning

Date: 2026-09-08
Status: Accepted for implementation; verification deferred.

## Context

Signup committed account/school/domain first, invoked generic Better Auth signup (including session cookies), then attached the user. A later failure ran compensating deletes. User email is not globally unique, and the default Prisma soft-delete extension hid archived collisions from queries that omitted an explicit deletedAt filter.

## Decision

Auth validates bounded inputs and hashes with Better Auth's existing default password implementation. DB owns one Serializable transaction creating the new SaasAccount, SchoolProfile, optional TenantDomain, unverified Admin User and canonical credential Account (providerId=credential, accountId=userId). User is account-attached at creation. Collision reads explicitly include archived records using `deletedAt:{}`; reject rather than adopt/restore. SchoolProfile is checked even when the domain table exists. Existing missing-domain-table compatibility remains outside the transaction probe; any unexpected failure rolls back the full transaction.

The signup UI already navigates to a tenant login handoff. Preserve that path and require ordinary sign-in after creation; do not create an implicit pre-attachment session. Disable Better Auth's generic email signup after migrating its only repository caller. Dedicated staff/parent provisioning remains unchanged. No automatic role/module grants beyond the existing signup Admin role are introduced.

Midday supplies thin orchestration, provider-owned password/session semantics and DB-owned writes; keep SchoolClerk's Better Auth/Prisma rather than copying Supabase/Drizzle. Explicit auth package registration adapts the inspected provider credential schema and default hash; custom hashing/provider hooks would require a coordinated update.

## Limits

No schema changes, live database writes, legacy deletions, emails, domain provisioning or tests are performed by the agent. Serializable checks protect this transaction path, not a global uniqueness invariant against every unrelated legacy writer; ambiguous history stays denied and needs separate review. Post-commit domain/email/notification effects remain independently fallible, without a durable outbox or retry guarantee. Missing deployment configuration is not repaired automatically. Existing consumers outside this repository using generic signup must move to school signup; there is no insecure compatibility bypass.

All tests/typechecks/builds/browser/mobile checks remain deferred. Source conformance is not runtime or concurrency proof.
