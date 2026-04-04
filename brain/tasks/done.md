# Done

## Purpose
Record of completed tasks and delivery outcomes.

## How To Use
- Move finished items from in-progress.
- Capture completion date and outcome.
- Reference PR/commit when available.

## Template
## Completed Task
- ID:
- Title:
- Completed:
- Outcome:
- Related changes:
- Owner:

## Completed Task
- ID: TASK-2026-03-16-auth-navigation-hardening
- Title: Harden tenant auth flow and align dashboard redirects with permitted navigation
- Completed: 2026-03-16
- Outcome: Fixed shared UI stylesheet package export/linking issues, allowed tenant localhost origins in Better Auth using request-aware trusted origins, prevented login cookie reset from crashing when school/session/term data is missing, and aligned dashboard default routing with the `gnd` proxy pattern so authenticated `/` and `/login` requests resolve to the first permitted sidebar link for the signed-in role.
- Related changes: `packages/ui/package.json`, `packages/ui/globals.css`, `apps/web/src/app/layout.tsx`, `packages/auth/src/index.ts`, `apps/dashboard/src/actions/cookies/auth-cookie.ts`, `apps/dashboard/src/sidebar/utils.ts`, `apps/dashboard/src/app/dashboard/[domain]/(auth)/login/client.tsx`, `apps/dashboard/src/app/dashboard/[domain]/(sidebar)/page.tsx`, `apps/dashboard/src/proxy.ts`
- Owner: Codex

## Completed Task
- ID: TASK-2026-03-25-dashboard-proxy-host-compat
- Title: Broaden dashboard proxy host compatibility across localhost, portless dev hosts, and production
- Completed: 2026-03-25
- Outcome: Centralized dashboard tenant host parsing so the active proxy and tenant cookie lookup now resolve the same canonical tenant slug for plain localhost subdomains, the documented portless dashboard localhost hostnames, production tenant subdomains, and verified custom domains.
- Related changes: `apps/dashboard/src/utils/tenant-host.ts`, `apps/dashboard/src/proxy.ts`, `apps/dashboard/src/actions/cookies/auth-cookie.ts`, `brain/bugs/2026-03-16-dashboard-localhost-redirect-loop.md`, `brain/api/permissions.md`
- Owner: Codex

## Completed Task
- ID: TASK-2026-04-01-teachers-page-loading
- Title: Fix teachers page loading failure and document current staff invite/teacher permission gaps
- Completed: 2026-04-01
- Outcome: Fixed the teachers page query wiring so the search filter no longer crashes the page, scoped teacher list loading to the active tenant/session/term, added basic teacher search by name/title/email, and documented that staff invite emails plus teacher classroom/subject permission management are not implemented yet.
- Related changes: `apps/dashboard/src/app/dashboard/[domain]/(sidebar)/staff/teachers/search-params.ts`, `apps/dashboard/src/components/tables/staffs/index.tsx`, `apps/dashboard/src/components/tables/staffs/table.tsx`, `apps/dashboard/src/components/tables/staffs/columns.tsx`, `apps/dashboard/src/components/tables/staffs/empty-states.tsx`, `apps/dashboard/src/actions/get-staff-list.ts`, `apps/dashboard/src/utils/where.staff.ts`, `brain/api/permissions.md`, `CLAUDE.md`
- Owner: Copilot

## Completed Task
- ID: TASK-2026-04-01-staff-invite-and-permissions
- Title: Implement staff invite onboarding and teacher classroom/subject assignment workflow
- Completed: 2026-04-01
- Outcome: Added teacher create/edit flows that capture role, classroom permissions, subject permissions, and optional onboarding email delivery; synced assignments into existing staff permission tables; and wired invites into Better Auth password setup links.
- Related changes: `apps/dashboard/src/actions/save-staff.ts`, `apps/dashboard/src/actions/schema.ts`, `apps/dashboard/src/components/forms/staff-form.tsx`, `apps/dashboard/src/components/controls/form-multiple-selector.tsx`, `apps/dashboard/src/components/staffs/form-context.tsx`, `apps/dashboard/src/components/sheets/staff-create-sheet.tsx`, `apps/dashboard/src/components/sheets/staff-overview-sheet.tsx`, `apps/dashboard/src/components/sheets/global-sheets.tsx`, `apps/dashboard/src/hooks/use-staff-params.ts`, `apps/dashboard/src/app/dashboard/[domain]/(auth)/reset-password/client.tsx`, `apps/api/src/trpc/routers/staff.routes.ts`, `packages/auth/src/index.ts`, `brain/api/permissions.md`, `CLAUDE.md`
- Owner: Copilot

## Completed Task
- ID: TASK-2026-04-01-k12-teacher-workspace
- Title: Add dedicated K-12 teacher workspace routes and basic staff overview pages
- Completed: 2026-04-01
- Outcome: Added the `(k-12-teachers)` dashboard route group with a dedicated `/teacher` workspace, moved teacher sidebar navigation into its own guarded module, tightened teacher visibility in admin navigation, and replaced the remaining staff coming-soon stubs with tenant-scoped overview pages for non-teaching staff, departments, and staff attendance readiness.
- Related changes: `apps/dashboard/src/components/sidebar/links.ts`, `apps/dashboard/src/sidebar/utils.ts`, `apps/dashboard/src/actions/get-staff-list.ts`, `apps/dashboard/src/actions/get-staff-pages.ts`, `apps/dashboard/src/actions/get-teacher-workspace.ts`, `apps/dashboard/src/components/staff/basic-staff-pages.tsx`, `apps/dashboard/src/components/teachers/workspace-pages.tsx`, `apps/dashboard/src/app/dashboard/[domain]/(sidebar)/(k-12-teachers)/layout.tsx`, `apps/dashboard/src/app/dashboard/[domain]/(sidebar)/(k-12-teachers)/teacher/**`, `apps/dashboard/src/app/dashboard/[domain]/(sidebar)/staff/non-teaching/page.tsx`, `apps/dashboard/src/app/dashboard/[domain]/(sidebar)/staff/departments/page.tsx`, `apps/dashboard/src/app/dashboard/[domain]/(sidebar)/staff/attendance/page.tsx`, `brain/api/permissions.md`, `CLAUDE.md`
- Owner: Copilot

## Completed Task
- ID: FIN-001
- Title: Bulk fee application — apply fee to all eligible students in a class
- Completed: 2026-04-02
- Outcome: Added fee-application preview plus confirmation from the fees-management table and implemented idempotent class-wide StudentFee creation for current-term FeeHistory records, so admins can apply a fee to all eligible students in scope without duplicating charges.
- Related changes: `apps/api/src/trpc/routers/transaction.routes.ts`, `apps/dashboard/src/components/tables/fees-management/data-table.tsx`, `apps/dashboard/src/components/tables/fees-management/columns.tsx`, `brain/features/student-fees.md`
- Owner: Codex

## Completed Task
- ID: FIN-002
- Title: Student payment tab (StudentTransactionOverview) upgrade
- Completed: 2026-04-02
- Outcome: Replaced the legacy student fee display with current-term FeeHistory-backed status rows, surfaced unapplied school fees in outstanding totals, preloaded the receive-payment sheet from the student view, and enforced classroom scope validation for fee-history allocations on the server.
- Related changes: `apps/api/src/trpc/routers/finance.routes.ts`, `apps/dashboard/src/components/students/student-transaction-overview.tsx`, `apps/dashboard/src/components/sheets/receive-payment-sheet.tsx`, `brain/features/student-fees.md`
- Owner: Codex

## Completed Task
- ID: FIN-003
- Title: Fees management — edit, soft-delete, and prefetch fix
- Completed: 2026-04-02
- Outcome: Added row-level edit and current-term removal actions for fees, updated fee editing to modify the active term FeeHistory instead of blindly versioning, and ensured the fees-management page prefetches previous-term fees for instant import-sheet loading.
- Related changes: `apps/api/src/db/queries/accounting.ts`, `apps/api/src/trpc/routers/transaction.routes.ts`, `apps/dashboard/src/components/school-fee/form-context.tsx`, `apps/dashboard/src/components/forms/school-fee-form.tsx`, `apps/dashboard/src/components/sheets/school-fee-create-sheet.tsx`, `apps/dashboard/src/components/tables/fees-management/data-table.tsx`, `apps/dashboard/src/components/tables/fees-management/columns.tsx`, `apps/dashboard/src/app/dashboard/[domain]/(sidebar)/finance/fees-management/page.tsx`, `brain/features/student-fees.md`
- Owner: Codex

## Completed Task
- ID: FIN-004
- Title: Post-payment receipt PDF generation
- Completed: 2026-04-02
- Outcome: Added a payment-receipt PDF template and authenticated receipt route, returned payment IDs from the receive-payment mutation, and exposed print/download actions in both the receive-payment success state and student payment history.
- Related changes: `apps/api/src/trpc/routers/finance.routes.ts`, `apps/dashboard/src/components/sheets/receive-payment-sheet.tsx`, `apps/dashboard/src/components/students/student-transaction-overview.tsx`, `apps/dashboard/src/app/api/pdf/student-payment-receipt/route.ts`, `packages/pdf/package.json`, `packages/pdf/src/payment-receipt/index.tsx`, `brain/features/student-fees.md`, `brain/api/contracts.md`
- Owner: Codex

## Completed Task
- ID: FIN-005
- Title: Billables page relabelling — clarify staff/service-only purpose
- Completed: 2026-04-02
- Outcome: Renamed the billables workspace to Service Billables across navigation, page title, create sheet, empty states, and form copy, and updated student-payment UI text to mark legacy billable additions as backward-compatibility behavior rather than the preferred path for student fees.
- Related changes: `apps/dashboard/src/components/sidebar/links.ts`, `apps/dashboard/src/app/dashboard/[domain]/(sidebar)/finance/billables/page.tsx`, `apps/dashboard/src/components/sheets/billable-create-sheet.tsx`, `apps/dashboard/src/components/forms/billable-form.tsx`, `apps/dashboard/src/components/tables/billables/data-table.tsx`, `apps/dashboard/src/components/tables/billables/columns.tsx`, `apps/dashboard/src/components/tables/billables/empty-states.tsx`, `apps/dashboard/src/components/tables/bills/empty-states.tsx`, `apps/dashboard/src/components/tables/fees-management/empty-states.tsx`, `apps/dashboard/src/components/sheets/receive-payment-sheet.tsx`, `brain/features/student-fees.md`
- Owner: Codex

## Completed Task
- ID: FIN-006
- Title: Finance payment cancellation and notification system rollout
- Completed: 2026-04-03
- Outcome: Added tenant-scoped persistent notifications with dashboard bell/page UI, registered finance email templates for every notification type, dispatched notifications for student/service/payroll payment receipt and cancellation events, and implemented cancellable service/payroll payments while preserving cancelled payment history for reporting and re-payment.
- Related changes: `packages/db/src/schema/notification.prisma`, `packages/db/src/schema/account.prisma`, `packages/db/src/schema/school.prisma`, `packages/notifications/**`, `packages/email/**`, `apps/api/src/lib/notifications.ts`, `apps/api/src/trpc/routers/notifications.routes.ts`, `apps/api/src/trpc/routers/_app.ts`, `apps/api/src/trpc/routers/finance.routes.ts`, `apps/dashboard/src/components/notifications/**`, `apps/dashboard/src/components/header.tsx`, `apps/dashboard/src/components/sidebar/links.ts`, `apps/dashboard/src/components/service-payments.tsx`, `apps/dashboard/src/components/payroll.tsx`, `apps/dashboard/src/components/students/student-transaction-overview.tsx`, `brain/api/endpoints.md`, `brain/api/contracts.md`, `brain/system/overview.md`, `brain/features/student-fees.md`, `brain/features/notifications.md`
- Owner: Codex
