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
- ID: PAY-001 through PAY-010
- Title: School Payment System — full implementation
- Completed: 2026-03-30
- Outcome: Implemented a complete school payment management system across schema, tRPC, and UI layers. Key deliverables: (1) Fees model extended with optional classRoomId for classroom-scoped fee templates; (2) Wallet model extended with source field for P&L categorization; (3) Transaction router with getStudentFeeStatus, initializeStudentFees, bulkInitializeClassFees, getTermFeeSetup, saveTermFeeSetup, getStudentAllTermsAccounting, searchStudents; (4) Student Payment Portal page with debounced search, multi-term fee view, initialization flow, and cross-term payment routing; (5) Classroom Payments tab wired in classroom sheet; (6) Term fee setup wizard step with import-from-last-term; (7) Student outstanding balance indicators in student list; (8) Payment Portal sidebar nav link.
- Related changes: `packages/db/src/schema/student-activity.prisma`, `packages/db/src/schema/classroom.prisma`, `packages/db/src/schema/finance.prisma`, `apps/api/src/db/queries/accounting.ts`, `apps/api/src/db/queries/students.ts`, `apps/api/src/trpc/routers/transaction.routes.ts`, `apps/api/src/trpc/routers/finance.routes.ts`, `apps/dashboard/src/components/student-payment-portal.tsx`, `apps/dashboard/src/components/classroom-payments.tsx`, `apps/dashboard/src/components/configure-term-fee-setup.tsx`, `apps/dashboard/src/components/accounting-streams.tsx`, `apps/dashboard/src/components/configure-term.tsx`, `apps/dashboard/src/components/sheets/classroom-overview-sheet.tsx`, `apps/dashboard/src/components/students/student-transaction-overview.tsx`, `apps/dashboard/src/components/tables/students/student-list-row.tsx`, `apps/dashboard/src/components/sidebar/links.ts`, `brain/features/school-payment-system.md`
- Owner: Codex
- Commit: f37d6fc

## Completed Task
- ID: TASK-2026-03-25-dashboard-proxy-host-compat
- Title: Broaden dashboard proxy host compatibility across localhost, portless dev hosts, and production
- Completed: 2026-03-25
- Outcome: Centralized dashboard tenant host parsing so the active proxy and tenant cookie lookup now resolve the same canonical tenant slug for plain localhost subdomains, the documented portless dashboard localhost hostnames, production tenant subdomains, and verified custom domains.
- Related changes: `apps/dashboard/src/utils/tenant-host.ts`, `apps/dashboard/src/proxy.ts`, `apps/dashboard/src/actions/cookies/auth-cookie.ts`, `brain/bugs/2026-03-16-dashboard-localhost-redirect-loop.md`, `brain/api/permissions.md`
- Owner: Codex
