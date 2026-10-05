# ADR-0032: Resolve staff invitation identity before credential issuance

Date: 2026-09-07
Status: Implementation written; verification deferred

## Context

Staff profiles are still linked to User by email, not a durable foreign key. Resend/copy selected the first email match, while the general credential upsert could revive an archived account or reassign a canonical provider key. The existing password-setup proof protected token consumption but did not resolve these identity ambiguities.

## Decision

Use a shared DB-owned pending identity resolver for resend/copy, proof issuance, public completion and worker delivery. Require an active school in the specified non-purging account, a non-completed/non-ACTIVE staff profile, canonical lowercase matching emails and one globally unambiguous non-deleted same-account User. Other active same-account staff profiles sharing the email require explicit review because password setup would affect the shared login. Include archived users in collision detection. Dashboard/auth/jobs retain allowed staff-role policy; DB queries do not import app schemas.

Use a shared credential resolver matching credential rows by userId OR canonical provider accountId. Exactly one non-deleted row must have both values equal to the resolved User ID. A missing row can be created inside the Serializable proof-issuance transaction only when no archived or mismatched row exists. Never reactivate or reassign a credential from staff actions. General staff save no longer initializes credentials, and resend/copy preflight does not mutate them.

Recheck identity in the issuance transaction, before hashing and inside public completion, and during both worker delivery-time loads. Public completion's conditional credential write also includes canonical accountId. Ignore soft-deleted delivery bindings. Keep existing input/return shapes and responsive UI composition; this server-only change needs no new sheet/table or package. Follow Midday's package-owned DB behavior and thin app orchestration.

## Limits and deferred verification

This is not a durable Staff-to-User migration, a global email-uniqueness constraint or a legacy account-adoption tool. Noncanonical/shared/archived identity records remain untouched and need explicit account review. Generic password recovery and passwordless paths remain separate work. Application-level checks cannot atomically serialize every legacy writer or recall external mail.

No live identity/credential operations, jobs/emails, schema changes, tests, typechecks, builds, lint, browser/mobile QA or commits. Later verify missing credentials, normal save/resend/copy/completion, duplicate/case-variant users, archived/mismatched credentials, shared profiles, cross-account denial, concurrent edits and transaction rollback. The overall goal remains implementation-in-progress, with final browser/mobile verification deferred by the user.
