# Notifications System

## Overview

SchoolClerk now has a tenant-scoped notification system for in-app alerts and email delivery. The first full rollout covers finance events for student payments, service payments, and payroll payments, including both payment received/recorded and payment cancelled flows.

## Architecture

- `packages/notifications` owns the typed notification registry, payload validation, channel registration, and email template attachment for each notification type.
- `packages/email` owns reusable React Email templates, rendering, and the Clerk Ledger component system. Follow the `midday` package structure reference at `/Users/M1PRO/Documents/code/_kitchen_sink/midday/packages/email` when adding or refactoring email templates.
- `apps/api/src/lib/notifications.ts` resolves the current tenant user, targets recipients by role group, creates persistent notifications, applies stored preferences, and sends email through Resend when configured.
- `apps/api/src/trpc/routers/notifications.routes.ts` exposes list/count/read APIs for the dashboard.
- `apps/dashboard` renders notifications in the header bell and a full `/notifications` page.

## Current-access feed boundary — implementation written, verification deferred

- The feed router is authenticated; stored sessions must be unexpired/non-deleted and their user non-deleted. The selected school must belong to the user's account, which must not be pending QA purge.
- The notification package explicitly maps all 11 registry types to module access. Student finance requires Students + Billing; payroll Staff + Billing; service finance Billing; assessment Assessments; staff invitation Staff. Finance is restricted to current Admin/Accountant, payroll additionally HR, and assessment requests to Admin. Other notices retain recipient ownership. Workspace-created onboarding remains available for recovery. Unknown types and unavailable modules are withheld without deleting history.
- DB-owned queries share the same school/type/recipient predicate before pagination, counts and read-status writes. Reads do not create contacts. Recipient status overrides legacy notification read state; null recipient status counts as unread. Mark-read returns only an ID/read flag; mark-available-read preserves hidden records and their unread state.
- Page/bell distinguish loading, failed reads and available empty results, hide stale content after a failed list read, and explain access-filtered history. Controls/text wrap, touch controls have 44px minimum height, and popover width is viewport-constrained. Mobile/browser behavior is unverified.
- The sidebar supplies school/user identity to a client scope provider, which waits for matching client auth/profile and module-query readiness. Shared page/bell/mobile badge hooks key all reads by school, user and allowed-notification-type signature. Every API operation validates that displayed scope against live authenticated context; mismatch requires page reload, never an implicit switch to another school/user. Read-status callbacks invalidate the submitted scope even when rendering has since changed.
- Cached feed/count data is withheld during context loading, fetching, paused requests or errors; missing scope disables requests, no previous-scope placeholders are used, and inactive notification caches have zero retention. Fresh mount/focus requests reauthorize. This does not establish push-based revocation of already delivered content. Mobile account-menu notifications have a 44px target and viewport-constrained menu width.
- API send-time checks are implemented below; direct dashboard/worker delivery and generic dynamic Activity reads still need coverage. Previously delivered content cannot be recalled. All tests, auth fixtures, cache/race checks, browser/mobile/keyboard checks and gap fixes remain deferred. See [ADR-0027](../decisions/ADR-0027-notification-feed-access.md).

## API delivery-time authorization (implemented, untested)

2026-09-08 canonical staff URL follow-up (ADR-0036): dashboard issuance and worker checks now use the same utils-owned HTTPS tenant URL policy. Worker verifies canonical destination/path, forbids credentials/fragments and duplicate/extra setup query fields, and matches current staff/email before each existing delivery check. A valid proof/delivery digest no longer suffices for an arbitrary URL origin. Existing noncanonical queued links skip and need reissue; producer/worker configured roots must agree. No sends, jobs or runtime/browser validation occurred.

Latest identity follow-up (ADR-0032): staff worker reads now share the pending staff identity and canonical active credential resolver with public onboarding. Ambiguous/archived/cross-account/case-conflicting or shared staff identity, missing/archived/mismatched credentials, non-staff role and deleted delivery binding suppress delivery. These are current source guards, not verified runtime behavior; no email was sent.

Latest staff follow-up (ADR-0031): direct dashboard staff in-app delivery now holds a conditional lock on the exact current onboarding proof while reloading current pending identity, verified initiating session/Admin role, school/account, recipient email/role, module access and in-app preference. DB-owned creation persists current display metadata and staff/type tags. Issuance owns PENDING status; only a matching proof may record an enqueue failure. This supersedes the older unguarded-staff/in-app and unbound-worker descriptions below. Signup and other generic delivery adapters remain separate coverage; no behavioral verification or live delivery occurred.

Staff setup follow-up (ADR-0029): new invitation delivery now also requires the latest staff proof and dedicated setup capability; generic reset tokens no longer back newly issued staff links. Public completion has a token-bound atomic implementation, with concurrency/login verification still deferred. Direct in-app/status and identity-collision work remain.

Staff invitations use a separate worker guard, implemented after the API slice: producer queues a delivery-record ID and exact URL; the expiring DB binding and current school/account/staff/user/actor/token/preference/module state are checked before render and immediately before send. Shared worker email helper supports this final guard and stable provider retry keys without changing other callers' default behavior. Old unbound payloads require authorized reissue. Public staff onboarding completion and direct in-app writes remain unguarded follow-up surfaces; see ADR-0028. No live sends/jobs or behavioral verification.

Audience and direct-user API dispatch now share one delivery flow. Candidate discovery is not permission: each recipient/channel reloads a non-deleted/non-purging account-owned school, live initiating session/user, current recipient account membership/role/email, module configuration and preference through DB-owned helpers. Audience members must still match the selected role group at delivery time. Both registry channels and user channel preferences apply.

In-app scope/policy/preference checks, contact creation and notification/recipient creation run in one transaction. Email rechecks after template rendering, uses the freshly read recipient address, and skips stale school-name/domain rendering. These checks do not atomically lock revocation against an external send. Already delivered mail cannot be recalled. Confirmed partial successes remain in returned counters; later channel failure does not reset them. No automatic delivery retry, outbox or cross-request deduplication was introduced.

Current source-discovered API callers are assessment-link request/approval/rejection. Finance registry entries do not prove all finance events invoke dispatch. Separate direct signup/staff notification writes, the staff-invitation worker and generic delivery adapters remain coverage work. The staff worker's existing queued payload lacks school/user identity and must not be considered guarded by this API slice. All behavior is unverified; no messages were sent during implementation.

## Data Model

- `Notification`
  - tenant scoped by `schoolProfileId`
  - user scoped by `userId`
  - stores `type`, `title`, `body`, `link`, `isRead`, timestamps
- `NotificationPreference`
  - unique per tenant user plus notification type
  - stores `inApp` and `email` toggles

## Initial Finance Types

- `student_payment_received`
- `student_payment_cancelled`
- `service_payment_recorded`
- `service_payment_cancelled`
- `payroll_payment_recorded`
- `payroll_payment_cancelled`

## Assessment Public Link Types

- `assessment_public_link_requested`: sent to tenant admins when staff request a public assessment-recording link.
- `assessment_public_link_approved`: sent to the requesting staff user when an admin approves the request and generates the public URL.
- `assessment_public_link_rejected`: sent to the requesting staff user when an admin rejects the request, including the optional rejection note.

## Clerk Ledger Transactional Email Standard

Direction 01, Clerk Ledger, is the standard transactional email structure. It uses an institutional tenant wordmark, navy/paper/gold visual tokens, a compact category and reference header, ledger rows for record details, status-aware notice blocks, square primary/secondary actions, raw fallback URLs, and one tenant-aware footer. The markup is intentionally image-independent and fixed to the approved light palette so external dark-mode transformations do not replace the tenant's record-document styling.

Seven shared React Email layouts cover the 15 active message types:

- `password-reset`: password setup and reset.
- `signup-verification`: SaaS owner email verification.
- `workspace-ready`: completed school workspace onboarding.
- `staff-invitation`: staff invitation and account activation.
- `admission-submission`: admission application receipt.
- `admission-approval`: admission approval, including payment-required and no-payment branches.
- `finance-notification`: six finance events and three assessment public-link status events.

Delivery callers in auth, dashboard signup, school-site admissions, API enrollment, notification delivery, and jobs remain thin: they resolve recipients and tenant context, format the subject, render a shared layout, and invoke the existing provider boundary. They must not introduce app-owned email presentation or raw HTML templates.

For review and regression work:

- Run the live preview with `bun --cwd packages/email run dev`; it is exposed through the active `school-clerk-email` Portless hostname.
- Render the complete 15-message catalog with `bun --cwd packages/notifications run email:catalog`.
- Run layout rendering coverage with `bun --cwd packages/email test` and notification subject-contract coverage with `bun --cwd packages/notifications test`.

## Delivery Rules

- Every notification type whose registered channels include `email` must also register an email template definition, even if email sending is environment-gated by missing provider credentials. In-app-only types may return no email template.
- In-app rows are created by default unless a matching preference disables the `inApp` channel.
- Email is sent by default unless a matching preference disables the `email` channel.
- Notification emails use the current school name as the sender display name and subject prefix when available.
- Notification subjects must use `formatNotificationEmailSubject`, the notification-layer wrapper around `formatTenantEmailSubject`, instead of hand-built tenant prefixes.
- Finance notification links must stay app-relative, for example `/finance/payments`, `/finance/transactions`, and `/staff/payroll`, because the dashboard mount is proxy-handled.
- Assessment public-link notifications should link back to `/assessment-recording` for admin/requester review. Approved-request email copy may include the generated public URL because the requester needs to share it with the helper.

## UI Surface

- Header bell shows unread count and the latest notifications.
- `/notifications` shows up to 100 currently permitted tenant-user notifications with unread filtering and read actions.
- Finance pages continue to own the source action; notifications deep-link back into those pages instead of duplicating UI state elsewhere.
## Signup completion delivery — implementation written (2026-09-08)

Initial workspace email and in-app signup notices now use `packages/db/src/signup-completion.ts` current school/account/canonical owner and preference checks. Dashboard's server-only completion adapter respects registered channels, rechecks email context after render and creates notifications within a Serializable transaction. Signup's public response distinguishes provider acceptance, console/no-send, skipped and unconfirmed outcomes; it does not report inbox delivery or automatically retry account creation. Verification email remains a separate identity-proof flow. No outbox/exactly-once delivery or live sends; all tests deferred. See ADR-0042.
