# ADR-0031: Staff invitation generation owns status and direct notification scope

Date: 2026-09-07
Status: Implementation written; verification deferred

## Context

School/email/completed-state predicates cannot distinguish two invitations for the same pending staff member. A late success or failure callback could overwrite newer status. Direct staff in-app creation also used caller display snapshots and a preference read outside the notification transaction.

## Decision

Build the URL before persistence. Issue the dedicated capability, latest-per-staff proof and PENDING status in one Serializable transaction, with fresh identity and module checks. New or changed pending identities are NOT_SENT until issuance. Copy and resend use the same boundary; no separate success callback may write PENDING. Resent timestamps represent issuance, not delivered mail.

After issuance, an enqueue failure may write FAILED only while holding a conditional row write lock on the exact current proof. A superseding issuance or successful proof consumption competes on that row; missing, expired, consumed or identity-changed proofs skip the failure write. Do not extend expiry or broaden lookup after a mismatch. Configuration failures before issuance leave prior invitation status untouched.

Direct in-app delivery uses the same proof lock through current onboarding identity, live verified session/Admin, school/account, recipient email/role, module and preference checks and DB-owned contact/notification creation. Current database records supply display metadata. The dashboard owns authorization/orchestration, the DB package owns persistence/context helpers, and the existing notification registry owns content, following the Midday planner's package boundaries. No table/sheet/UI redesign is needed for this server-only slice.

## Limits and deferred verification

Queue acknowledgement is not delivery. An ambiguous enqueue response may still produce an email even if local status records a failure; no transactional outbox or exactly-once delivery is claimed. Previously created notices are not deleted when a new proof is issued, but old setup links cannot consume the latest proof. Identity, role and module revocation are freshly checked, not globally locked against every concurrent writer.

Legacy resend/copy first-match email resolution, durable Staff-to-User linkage, generic legacy tokens, other direct actions and deployment remain separate work. No tests, typechecks, builds, lint, browser/mobile QA, live jobs/emails, schema operations or commits were run. Later verify concurrent issuance, delayed enqueue success/failure, copy while sending, completion during failure handling, expiry, role/module/preference changes, rollback and recovery UI. Responsive browser/mobile verification remains part of the final portfolio phase.
