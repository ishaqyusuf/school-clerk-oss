# Notifications System

## Overview
SchoolClerk now has a tenant-scoped notification system for in-app alerts and email delivery. The first full rollout covers finance events for student payments, service payments, and payroll payments, including both payment received/recorded and payment cancelled flows.

## Architecture
- `packages/notifications` owns the typed notification registry, payload validation, channel registration, and email template attachment for each notification type.
- `packages/email` owns reusable React Email templates, including the finance notification template used by the registry.
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

## Delivery Rules
- Every registered notification type must also register an email template definition, even if email sending is environment-gated by missing provider credentials.
- In-app rows are created by default unless a matching preference disables the `inApp` channel.
- Email is sent by default unless a matching preference disables the `email` channel.
- Finance notification links must stay app-relative, for example `/finance/payments`, `/finance/transactions`, and `/staff/payroll`, because the dashboard mount is proxy-handled.

## UI Surface
- Header bell shows unread count and the latest notifications.
- `/notifications` shows the full tenant-user feed with unread filtering and read actions.
- Finance pages continue to own the source action; notifications deep-link back into those pages instead of duplicating UI state elsewhere.
