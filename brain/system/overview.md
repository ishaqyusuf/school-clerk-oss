# System Overview

## Purpose
Operational summary of SchoolClerk domains, modules, and runtime boundaries.

## How To Use
- Update when capabilities or platform boundaries change.
- Keep concise, link out for detail.
- Reflect actual implementation state.

## Template
## Domain Summary
- Multi-tenant education operations SaaS
- Tenants represent schools or institutions

## Key Capabilities
- Admissions, academics, attendance, finance, communication
- Finance includes term-scoped accounting streams, classroom-scoped billables, a stream-detail view for per-wallet transaction statements, a receive-payment workflow that searches all students but allocates against the active term sheet, and cancellable service/payroll/student payment flows that preserve cancelled ledger history for reporting and re-payment.
- Notifications now include tenant-scoped in-app persistence plus email delivery, with typed notification definitions in `packages/notifications`, reusable email templates in `packages/email`, header bell access in the dashboard shell, and deep links into finance pages for payment events.

## Runtime Boundaries
- Frontend apps: `apps/dashboard` (authenticated product UI), `apps/web` (marketing)
- Backend services: `apps/api` tRPC/Hono API, Trigger.dev jobs in `packages/jobs`
- Data stores: PostgreSQL via Prisma models in `packages/db/src/schema/*.prisma`, including tenant/user-scoped `Notification` and `NotificationPreference` records
- External providers: Better Auth, Vercel domains, Resend email, Google Fonts (build-time fetch in Next.js)
- Tenant/domain proxying owns the dashboard mount, so product pages should navigate with app-relative paths like `/finance/...` instead of hardcoding `/dashboard/...`.

## Architectural Reference
- Use the Midday reference at `/Users/M1PRO/Documents/code/_kitchen_sink/midday` as a recurring source of inspiration for architecture and performance decisions.
- Before introducing new patterns, review `/Users/M1PRO/Documents/code/_kitchen_sink/midday` and compare structure before diverging.
- Pay close attention to coding patterns, folder organization, page implementation, analytics wiring, widgets, trackers, and related cross-cutting implementation details.
- Favor adapting proven patterns from that reference into SchoolClerk's domain instead of inventing parallel structures when the same problem shape already exists there.
