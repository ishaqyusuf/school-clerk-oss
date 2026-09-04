# Notifications System

## Overview

SchoolClerk now has a tenant-scoped notification system for in-app alerts and email delivery. The first full rollout covers finance events for student payments, service payments, and payroll payments, including both payment received/recorded and payment cancelled flows.

## Architecture

- `packages/notifications` owns the typed notification registry, payload validation, channel registration, and email template attachment for each notification type.
- `packages/email` owns reusable React Email templates, rendering, and the Clerk Ledger component system. Follow the `midday` package structure reference at `/Users/M1PRO/Documents/code/_kitchen_sink/midday/packages/email` when adding or refactoring email templates.
- `apps/api/src/lib/notifications.ts` resolves the current tenant user, targets recipients by role group, creates persistent notifications, applies stored preferences, and sends email through Resend when configured.
- `apps/api/src/trpc/routers/notifications.routes.ts` exposes list/count/read APIs for the dashboard.
- `apps/dashboard` renders notifications in the header bell and a full `/notifications` page.

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
- `/notifications` shows the full tenant-user feed with unread filtering and read actions.
- Finance pages continue to own the source action; notifications deep-link back into those pages instead of duplicating UI state elsewhere.
