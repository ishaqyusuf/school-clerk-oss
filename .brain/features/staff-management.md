# Staff Management

## Purpose
Track staff directory, invite onboarding, role access, and teacher assignment behavior.

## Current Behavior
- Tenant setup email URL follow-up (implemented, untested): copy/send links use configured HTTPS canonical tenant hosts and retain explicit proxy ports. Request Host/forwarded headers, LAN detection/overrides and raw app-port defaults no longer choose the destination. Worker delivery additionally checks canonical origin/path and exact setup query fields against current staff/email, both before render and send. Noncanonical queued links require authorized reissue; no real messages were sent. See [ADR-0036](../decisions/ADR-0036-canonical-staff-email-urls.md).
- Invitation identity follow-up (implemented, untested): resend/copy no longer pick the first email match. Issuance, public completion and worker delivery share a DB-owned unambiguous pending identity check. Duplicate/archived/cross-account users, noncanonical stored emails and shared active staff profiles require explicit account review, not automatic merging. Staff-role policy is checked by dashboard/auth/jobs. Credentials are created only inside proof issuance; archived, duplicate or mismatched credential ownership is rejected, never reactivated/reassigned. This supersedes the legacy resend/copy limitation below. See [ADR-0032](../decisions/ADR-0032-staff-invitation-identity-resolution.md); generic recovery and all verification remain pending.
- Invitation generation ordering (implemented, untested): capability/latest proof/PENDING status are issued together in a Serializable transaction. New or changed pending staff remain NOT_SENT until issuance; configuration errors before issuance do not downgrade an existing invitation. Resend timestamps are issuance timestamps, not provider-delivery evidence. Late queue failures must lock the matching latest proof before FAILED status; older/consumed proofs are skipped. Direct in-app notices check current proof, live Admin session, school/account, recipient identity/role, module and preference inside their write transaction. See [ADR-0031](../decisions/ADR-0031-staff-invitation-generation-ordering.md), which supersedes earlier status/direct-notification limitations below. Legacy email ambiguity in resend/copy, deployment and all verification remain pending.
- Identity update guard (untested): staff save resolves only an unambiguous previous-email login within the account. Incoming email collisions, archived logins, non-staff account reuse and automatic adoption of existing logins by new staff are rejected. Shared-profile identity changes, external-provider email reassignment and own-admin email/role edits require separate review. No automatic merge is performed.
- Unambiguous email changes keep the User ID but clear prior credential/User/Staff passwords, reset email verification, revoke stored sessions and require new onboarding. Pending role changes reissue invitations; case-only normalization does not restart setup. These writes share the Serializable staff save transaction. Invitation status callbacks check current admin/module scope and original school/email and cannot downgrade ACTIVE/onboarded staff. Legacy durable identity adoption, direct notifications and resend-attempt ordering remain unfinished. See [ADR-0030](../decisions/ADR-0030-staff-login-collision-and-status-scope.md).
- Implementation-only security update: management actions require live Admin + Staff module access, account-owned non-purging school and valid school/session/term; save also requires Academics for assignment writes. Copy/send issuance rechecks pending staff and same-account user/email/role. These paths remain untested.
- Queued staff emails now carry `{ deliveryId, ctaHref }`, with an expiring Verification binding for school/account/staff/user/actor/email/role/tenant slug and exact URL digest. Worker checks current identities, Admin authority, Staff module, reset-token expiry and email preference before rendering and immediately before send. Display/address changes suppress stale rendering. Provider retries use a stable delivery/route key; no exactly-once claim. Legacy queued snapshots require a newly authorized invite and coordinated producer/worker rollout.
- Public completion now requires a dedicated staff invitation capability plus latest staff-bound proof; submitted ID/email alone cannot authorize it. Password/profile/exact-user verification/stored-session revocation and proof consumption share one serializable transaction. Failure rolls back all writes; the browser no longer resets password separately. Staff-user collision rules, direct in-app/status writes, legacy links and runtime proof remain required. See [ADR-0029](../decisions/ADR-0029-atomic-staff-onboarding-proof.md).
- Admins can create or edit staff from the dashboard staff sheets using an invite-first flow.
- The staff form captures email, role, and teacher-only classroom/subject assignments.
- Non-teaching roles do not require classroom or subject assignment and persist empty assignment sets.
- Each teacher assignment targets one classroom and either selected active-term subjects or all subjects in that classroom.
- Subject selection in each classroom assignment supports bulk `Select all` and `Deselect all` controls so admins can quickly assign or clear the full subject list for that classroom.
- Classroom-wide subject access uses `ALL` mode on the classroom assignment; it grants access to every current and future subject in that classroom without creating one explicit staff-subject row per subject.
- Senior-secondary style academic access grants are available through `StaffAcademicAccessGrant`. The grant scopes are `CLASS`, `DEPARTMENT`, `CLASS_SUBJECT`, and `DEPARTMENT_SUBJECT`, and they resolve dynamically against the active tenant, school session, and term.
- The staff invite/edit form can now save whole-class grants, department/arm grants, and subject-across-class grants. Precise subject-in-department assignment is represented by selecting one or more department subjects under a department/arm assignment.
- Teacher authorization, teacher workspace summaries, assessment recording context options, subject lists, and classroom report sheet reads now use the shared effective access resolver so broad grants and legacy selected/all department assignments resolve through one path.
- Staff directory summaries and staff overview metrics use effective classroom/subject coverage so broad grants are reflected in teacher workload counts rather than only explicit legacy assignment rows.
- New staff onboarding links use 24-hour, hashed-at-rest `staff-password-setup:` capabilities plus a latest-per-staff proof. The auth package checks scope/expiry before hashing and again in the write transaction. They are not generic Better Auth reset tokens; old unbound links require authorized reissue. New issuance supersedes previous onboarding proof, and queued delivery checks the current proof.
- Staff invitation emails are sent with the school name as the sender display name and subject prefix when available.
- The onboarding branch of the reset-password page sends password and visible profile fields to one atomic staff-setup action. The generic recovery branch retains Better Auth reset behavior. The title field remains in the action schema but is hidden in the onboarding form for now. Success clears password state and replaces the token-bearing route with login; uncertain responses advise sign-in before repeating. All behavior and mobile/keyboard layouts are unverified.

## Classroom-Wide Subject Access
- Teacher assignments support a classroom-wide access mode so a teacher can be assigned to one classroom and automatically receive access to every current and future subject in that classroom.
- The default scope remains teacher-only; non-teaching roles should continue to persist empty classroom/subject assignment sets unless a separate role policy is intentionally designed later.
- Each classroom assignment supports two access modes:
  - `SELECTED`: the current behavior, where admins choose one or more active-term subjects manually.
  - `ALL`: grants access to all active-term subjects in the assigned classroom and automatically includes subjects added after the assignment.
- Existing selected-subject assignments remain valid and should continue to behave as explicit subject permissions.
- Teacher subject authorization must expand classroom-wide access anywhere subject permissions are checked, including assessment setup, assessment recording, score updates, report-sheet reads, and teacher workspace subject lists.
- The staff invitation/edit UI presents the choice as `Selected subjects` versus `All subjects in this classroom`.
- `ALL` is stored as a durable classroom assignment setting rather than backfilled into explicit subject permission rows.

## Hierarchy-Aware Academic Access Grants

- `CLASS`: grants every current/future department under the class plus active-term subjects in those departments.
- `DEPARTMENT`: grants every current/future active-term subject in one department/arm.
- `CLASS_SUBJECT`: grants the selected subject wherever it is offered under the selected class for the active term, including matching future department-subject offerings.
- `DEPARTMENT_SUBJECT`: grants one active-term subject offering inside one department/arm.
- Legacy `StaffClassroomDepartmentTermProfiles` and `StaffSubject` rows remain supported by the resolver for incremental migration and compatibility.

## Related Docs
- `brain/api/contracts.md`
- `brain/api/permissions.md`
- `brain/database/schema.md`
