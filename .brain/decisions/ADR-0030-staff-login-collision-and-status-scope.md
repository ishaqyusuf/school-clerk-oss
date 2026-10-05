# ADR-0030: Deterministic staff login updates

Date: 2026-09-07
Status: Guard slice implemented; legacy identity model and verification pending

## Context

StaffProfile has no durable User foreign key. The former save selected the first user matching new OR previous email, then rewrote its email/name/role. That could select a different login during an email collision. Invitation callbacks also updated status by staff ID alone and could overwrite completed onboarding after a delayed response.

## Decision

Keep legacy email linkage explicit rather than inventing or backfilling a relationship. In a Serializable staff-save transaction, a DB-owned helper resolves at most one active previous-email user within the account. The incoming normalized email must not belong to another user anywhere, including archived identities. New staff cannot automatically adopt an existing login. Non-staff roles cannot be converted through this path. Reject duplicate staff targets and identity/role changes affecting other active staff profiles without explicit review. Unchanged legacy multi-school identity/role is retained. Own-admin email/role changes and external-provider email reassignment are not performed by the invitation form.

For an authorized unambiguous email change, retain the User ID, clear credential and legacy User/Staff password fields, reset email verification, revoke stored sessions and require a fresh staff setup proof. Semantic role changes revoke stored sessions; pending staff receive a new invitation. Case-only normalization is not a new identity. Collision/conditional-write errors roll back assignment and identity changes together.

Status callbacks recheck current Admin/module/school scope, then use DB-owned staff/school/account/expected-email predicates. Deleted, onboarded or ACTIVE records cannot be overwritten by late PENDING/FAILED callbacks. Zero matched rows are an intentionally skipped stale status write, not permission to broaden its target.

## Limits and verification

This is not a durable staff-user relationship or an identity merge workflow. Global uniqueness is application-enforced here; other legacy writers still need audit. Cached sessions and generic legacy passwordless/reset capabilities remain separate review surfaces. Same-email concurrent resend attempt ordering is not solved by the completed-state guard. Direct staff notification writes remain enforcement work. No schema changes, runtime credential operations, tests, typechecks, builds, UI/mobile/browser QA or commits occurred. Deferred verification must cover collisions, transaction conflicts, password invalidation/new setup, role changes, stale callbacks and cross-tenant denial.
