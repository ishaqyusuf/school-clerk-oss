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

- ID: ASMT-WB-ROUNDTRIP-001
- Title: Verify the signed RTL assessment workbook round trip with legacy Qur'an scores
- Completed: 2026-07-19
- Outcome: Completed a local-only dashboard round trip for Daarul Hadith, 1447/1448 1st Term, الأول الإعدادي. Renamed the existing الحديث assessment to الامتحان, retained the existing المتون الامتحان, created four weighted Qur'an score assessments plus four zero-weight page-reference fields, downloaded and preservation-safely populated an 18-column signed RTL workbook from the legacy CSV, mapped eight subject-only columns to new 100-point/100%-weight الامتحان assessments, and applied 139 new plus 2 updated scores. Verification confirmed 22 unchanged and 53 blank cells, zero conflicts/invalid/stale rows, 141 unique WORKBOOK_IMPORT history rows, correct Qur'an totals, and one idempotent import after a repeated Apply. The test exposed and fixed workbook export authorization failing because the shared Prisma soft-delete extension injected `deletedAt` into a model that uses `revokedAt`; export lookup now uses the primary key with explicit scope/revocation checks, and the shared extension only filters models that actually declare `deletedAt`. Production data was not changed.
- Related changes: `apps/api/src/db/queries/assessment-workbooks.ts`, `apps/api/src/db/queries/assessment-workbooks.test.ts`, `packages/db/src/prisma.ts`, `.brain/features/assessment-workbook-round-trip.md`
- Owner: Codex

## Completed Task

- ID: ACADEMIC-RTL-001
- Title: Automatic RTL for academic data surfaces
- Completed: 2026-07-18
- Outcome: Added tenant-scoped Auto/LTR/RTL academic data direction with bounded weighted script detection, safe LTR fallback, five-minute caching, administrator-only overrides in School Profile, and a scoped dashboard provider. Student, classroom, subject, roster, attendance, assessment, and report data surfaces now mirror their data layout when resolved RTL while English navigation, settings, tabs, toolbars, buttons, dialogs, and global application direction remain LTR. Existing per-report direction cookies continue to override an individual report.
- Related changes: `packages/db/src/schema/school.prisma`, `packages/db/src/academic-data-direction.ts`, `apps/api/src/db/queries/school-settings.ts`, `apps/api/src/trpc/routers/school-settings.routes.ts`, `apps/dashboard/src/components/academic-data-direction/*`, `apps/dashboard/src/lib/academic-data-direction/server.ts`, academic table/card/report components, `.brain/features/academic-data-direction.md`, `.brain/decisions/ADR-0009-scoped-academic-data-direction.md`
- Owner: Codex

## Completed Task

- ID: STUD-IMP-PROD-ERROR
- Title: Harden student import production error handling and row-level import
- Completed: 2026-07-12
- Outcome: Completed the `.scratch/student-import-production-error` bundle. Student import now keeps staged review data when verification or execution receives an HTML/non-JSON response, shows a friendly recovery alert with redacted diagnostics, supports per-row `Import row` execution without disturbing remaining rows, returns structured tRPC errors for import classroom/session validation failures, and has production-like tenant-route checks confirming valid verification/execution and invalid inputs return JSON instead of HTML.
- Related changes: `apps/api/src/db/queries/students.ts`, `apps/api/src/db/queries/students.test.ts`, `apps/dashboard/src/components/modals/student-import/import-activities.tsx`, `apps/dashboard/src/components/modals/student-import/import-errors.ts`, `apps/dashboard/src/components/modals/student-import/import-errors.test.ts`, `brain/api/contracts.md`, `brain/features/student-import.md`, `brain/progress.md`
- Owner: Codex

## Completed Task

- ID: ASMT-001
- Title: Make assessments and sub-assessments reliable across recording, reports, print, and PDF output
- Completed: 2026-07-12
- Outcome: Completed the assessment reliability pass across ordering, printable-column filtering, grouped assessment print modes, parent-aware labels, print-status warnings, and API validation. Browser smoke on local Crestview verified the grouped total-mode workflow for `Codex Print Total Smoke`: the subject assessment manager's result-print preview shows the parent total column only, and the student report print table renders `Codex Print Total Smoke(30)` while omitting the `Codex Oral Child` and `Codex Written Child` columns.
- Related changes: `packages/assessment-results/src/index.ts`, `apps/api/src/db/queries/assessments.ts`, `apps/api/src/db/queries/report-sheet.ts`, `apps/api/src/db/queries/subjects.ts`, `apps/dashboard/src/components/forms/assessment-form.tsx`, `apps/dashboard/src/components/subject-assessments.tsx`, `apps/dashboard/src/features/student-report/report-model.ts`, `packages/db/src/schema/assessment.prisma`, `packages/db/src/schema/migrations/20260712133000_assessment_print_modes/migration.sql`, `brain/features/assessment-results-and-sub-assessments.md`, `brain/api/contracts.md`, `brain/api/endpoints.md`, `brain/database/schema.md`, `brain/database/migrations.md`, `brain/progress.md`
- Owner: Codex

## Completed Task

- ID: STUD-IMP-006
- Title: Batch Classroom Student Import Support
- Completed: 2026-07-12
- Outcome: Added explicit single/multiple classroom import modes, multi-classroom paste parsing, ambiguous-classroom handling, row-level classroom assignment during review, classroom scope summaries, row-targeted verification/execution behavior, and parser/API/browser coverage. Browser smoke on `daarulhadith.localhost:2200` verified a two-classroom paste moves from upload to review and completes execution with `Import complete`, `NEW CREATED 2`, `TERM SHEETS 2`, and `ERRORS 0`; DB verification for smoke run `60856831` confirmed both created students have current term forms in different classroom departments.
- Related changes: `apps/dashboard/src/components/modals/student-import/index.tsx`, `apps/dashboard/src/components/modals/student-import/parser.ts`, `apps/dashboard/src/components/modals/student-import/import-activities.tsx`, `apps/dashboard/src/components/modals/student-import/parser.test.ts`, `apps/api/src/db/queries/students.ts`, `apps/api/src/db/queries/students.test.ts`, `apps/api/src/trpc/routers/students.routes.ts`, `brain/features/student-import.md`, `brain/progress.md`
- Owner: Codex

## Completed Task

- ID: STAFF-AUTH-001
- Title: Add senior secondary staff assignment scopes
- Completed: 2026-07-12
- Outcome: Added hierarchy-aware teacher academic access grants for whole-class, department/arm, subject-across-class, and subject-in-department scopes. Effective access now resolves dynamically from `StaffAcademicAccessGrant` plus legacy selected/all department assignments and is used by teacher authorization, teacher workspace, assessment recording context options, subject lists, report sheets, staff save/form-data paths, staff list summaries, and staff overview effective counts. Runtime smoke verified a local Crestview teacher can load `/teacher`, `/teacher/assessments`, and `/teacher/reports` without the tenant recovery screen, login redirect, or dashboard error boundary after applying the grant migration locally.
- Related changes: `packages/db/src/schema/staffs.prisma`, `packages/db/src/schema/classroom.prisma`, `packages/db/src/schema/migrations/20260712120000_staff_academic_access_grants/migration.sql`, `packages/db/src/staff-academic-access.ts`, `packages/db/src/staff-academic-access-assignments.ts`, `apps/api/src/lib/teacher-authorization.ts`, `apps/api/src/db/queries/report-sheet.ts`, `apps/api/src/db/queries/subjects.ts`, `apps/api/src/trpc/routers/assessment.routes.ts`, `apps/api/src/trpc/routers/staff.routes.ts`, `apps/dashboard/src/actions/save-staff.ts`, `apps/dashboard/src/actions/schema.ts`, `apps/dashboard/src/actions/get-teacher-workspace.ts`, `apps/dashboard/src/components/forms/staff-form.tsx`, `apps/dashboard/src/components/staff/staff-overview-shell.tsx`, `brain/features/staff-management.md`, `brain/api/contracts.md`, `brain/api/permissions.md`, `brain/database/schema.md`, `brain/database/relationships.md`, `brain/database/migrations.md`
- Owner: Codex

## Completed Task

- ID: TASK-2026-07-12-dashboard-session-persistence
- Title: Harden dashboard tenant session persistence
- Completed: 2026-07-12
- Outcome: Extended remembered Better Auth sessions to 30 days, made the tenant workspace cookie HTTP-only and lifetime-aligned with remembered sessions, defaulted login to remember trusted devices, added tenant workspace cookie cleanup on sign-out, and allowed dashboard server/proxy helpers to reconstruct tenant context from a still-valid Better Auth session when the workspace cookie is missing, malformed, stale, or mismatched against the active tenant/user/session token.
- Related changes: `packages/auth/src/index.ts`, `apps/dashboard/src/actions/cookies/auth-cookie.ts`, `apps/dashboard/src/app/[domain]/(auth)/login/*`, `apps/dashboard/src/app/[domain]/(auth)/signout/page.tsx`, `brain/api/permissions.md`
- Owner: Codex

## Completed Task

- ID: TASK-2026-07-09-dev-infra-db-modes
- Title: Replicate GND-style local, remote-dev, and production DB infra for SchoolClerk
- Completed: 2026-07-09
- Outcome: Added a development infra resolver for `remote-dev` and `local` DB modes, restored Docker Postgres compose support, added local-service startup that skips Docker for remote DBs, wired root dev workflows plus DB and jobs package scripts through the shared resolver, and kept jobs deploy on production env loading.
- Related changes: `scripts/with-dev-infra.ts`, `scripts/start-dev-services.sh`, `docker-compose.yml`, `package.json`, `packages/db/package.json`, `packages/jobs/package.json`, `packages/jobs/trigger.config.ts`, `.env.example`, `packages/jobs/.env.example`, `brain/database/migrations.md`
- Owner: Codex

## Completed Task

- ID: TASK-2026-07-09-assessment-public-links
- Title: Public assessment-recording links and classroom-wide subject assignment hardening
- Completed: 2026-07-09
- Outcome: Added public assessment-recording links that capture the current classroom/term/subject filters, support admin direct generation with expiry, staff request/approval/rejection flow with notifications, hashed signed public tokens, token-scoped score entry, link revocation, and public recording UI. Verified the existing classroom-wide `ALL` subject assignment model remains the source of truth for current and future classroom subjects and tightened the staff-form option typing.
- Related changes: `apps/api/src/db/queries/assessment-public-links.ts`, `apps/api/src/trpc/routers/assessment.routes.ts`, `apps/dashboard/src/components/assessment-public-links-panel.tsx`, `apps/dashboard/src/components/assessment-recording-results-table.tsx`, `packages/db/src/schema/assessment.prisma`, `packages/notifications/src/types/assessment-public-link.ts`, `brain/features/assessment-results-and-sub-assessments.md`
- Owner: Codex

## Completed Task

- ID: ADM-DOC-2026-07-01
- Title: Admission portal and document template phase delivery
- Completed: 2026-07-01
- Outcome: Completed ADM-001 through ADM-005 and DOC-001 through DOC-004. The system now supports website-visible/manual admission links, class-specific age/document requirements, parent admission submission, submission/approval emails, approval payment handoff, admission-letter PDF template selection/open/download, result template preferences, constrained JSON document templates, and custom admission/result template requests with quote/payment/build/ready tracking. Verification covers server-side admission/document smokes, real Resend delivery, live Blob upload/delete, public school-site home/admissions enrollment discovery, direct/manual enrollment routes, browser form submission, dashboard approval/payment, dashboard admission-letter PDF open/download, dashboard document-template settings, and Prisma 7 runtime/typecheck coverage.
- Related changes: `apps/api/src/db/queries/enrollment-links.ts`, `apps/api/src/trpc/schemas/enrollment-links.ts`, `apps/dashboard/src/components/enrollment/enrollment-management-client.tsx`, `apps/dashboard/src/app/[domain]/(sidebar)/settings/document-templates/page.tsx`, `apps/school-site/src/app/enroll/[code]/*`, `apps/school-site/src/app/api/pdf/admission-letter/route.ts`, `apps/school-site/src/app/[[...slug]]/page.tsx`, `packages/db/src/schema/schema.prisma`, `packages/db/prisma.config.ts`, `packages/db/src/prisma.ts`, `packages/pdf/src/documents/*`, `packages/pdf/src/json-template/*`, `tests/admission-document-flow.smoke.ts`, `tests/admission-dashboard-browser.smoke.spec.ts`, `brain/tasks/admission-portal-and-document-template-system.md`
- Owner: Codex

## Completed Task

- ID: TASK-2026-06-19-school-registration-production-onboarding
- Title: Tighten production school registration, verification, and tenant domain provisioning
- Completed: 2026-06-19
- Outcome: Updated self-serve school signup to derive separate public-site and dashboard tenant URLs, provision both exact Vercel project domains in production, send a 24-hour owner email verification link, expose a public tenant `/verify-email` route, and route public-site login/enrollment auth links to `dashboard.{subdomain}.school-clerk.com`.
- Related changes: `apps/dashboard/src/actions/create-saas-profile.ts`, `apps/dashboard/src/features/signup/tenant-urls.ts`, `apps/dashboard/src/utils/domain.ts`, `apps/dashboard/src/app/[domain]/(auth)/verify-email/page.tsx`, `apps/dashboard/src/proxy.ts`, `apps/dashboard/src/env.ts`, `apps/school-site/src/app/login/page.tsx`, `apps/school-site/src/lib/enrollment/actions.ts`, `brain/features/school-registration-onboarding.md`, `brain/system/architecture.md`, `brain/system/overview.md`, `brain/api/contracts.md`, `brain/api/permissions.md`, `brain/database/schema.md`
- Owner: Codex

## Completed Task

- ID: STUD-IMP-005
- Title: Student Import Follow-Up Refinements
- Completed: 2026-06-17
- Outcome: Completed the student batch import UX polish pass. Import parsing now supports comma/dot-delimited name parts while preserving recognized row-level gender aliases, global/manual gender inputs use compact `M` / `F` toggle controls, review rows show parsed name chips, no-match rows default to `Import new`, `Skip` is disabled for no-match rows, and `Cancel Import` returns to the initial import screen before execution.
- Related changes: `apps/dashboard/src/components/modals/student-import/index.tsx`, `apps/dashboard/src/components/modals/student-import/import-activities.tsx`, `brain/features/student-import.md`, `brain/plans/2026-06-13-ux-ui-student-import-follow-up-refinements.md`, `brain/tasks/roadmap.md`, `brain/progress.md`
- Owner: Codex

## Completed Task

- ID: TASK-2026-06-15-production-to-local-db-import
- Title: Add production-to-local database import tooling
- Completed: 2026-06-15
- Outcome: Added a GND-style PostgreSQL sync command that can dry-run, incrementally upsert production rows into the local Docker database, reset cursors, sync one table, refresh small static tables, and normalize imported tenant domains so local dashboard hosts resolve correctly.
- Related changes: `packages/db/src/local-sync.ts`, `packages/db/scripts/sync-prod-to-local.ts`, `packages/db/package.json`, `package.json`, `.gitignore`, `brain/database/migrations.md`, `brain/progress.md`
- Owner: Codex

## Completed Task

- ID: TASK-2026-04-06-staff-management-onboarding-redesign
- Title: Redesign staff management around invite-first onboarding, richer status tracking, and mobile-responsive staff directory
- Completed: 2026-04-06
- Outcome: Reworked staff admin from a full-profile teacher form into an invite-first flow, added teacher-only classroom and subject assignment rows, surfaced pending onboarding and resend behavior in a richer mobile-responsive staff directory, and turned the reset-password screen into a staff onboarding completion step that captures profile details after password setup.
- Related changes: `packages/db/src/schema/staffs.prisma`, `packages/utils/src/constants.ts`, `apps/dashboard/src/actions/schema.ts`, `apps/dashboard/src/actions/save-staff.ts`, `apps/dashboard/src/actions/create-staff.ts`, `apps/api/src/trpc/routers/staff.routes.ts`, `apps/dashboard/src/components/forms/staff-form.tsx`, `apps/dashboard/src/components/tables/staffs/data-table.tsx`, `apps/dashboard/src/components/sheets/staff-create-sheet.tsx`, `apps/dashboard/src/components/sheets/staff-overview-sheet.tsx`, `apps/dashboard/src/app/dashboard/[domain]/(sidebar)/staff/teachers/page.tsx`, `apps/dashboard/src/app/dashboard/[domain]/(sidebar)/staff/teachers/search-params.ts`, `apps/dashboard/src/app/dashboard/[domain]/(auth)/reset-password/client.tsx`, `apps/dashboard/src/components/forms/bill-form.tsx`, `brain/database/schema.md`, `brain/database/migrations.md`, `brain/api/endpoints.md`, `brain/api/contracts.md`, `brain/api/permissions.md`
- Owner: Codex

## Completed Task

- ID: TASK-2026-03-16-auth-navigation-hardening
- Title: Harden tenant auth flow and align dashboard redirects with permitted navigation
- Completed: 2026-03-16
- Outcome: Fixed shared UI stylesheet package export/linking issues, allowed tenant localhost origins in Better Auth using request-aware trusted origins, prevented login cookie reset from crashing when school/session/term data is missing, and aligned dashboard default routing with the `gnd` proxy pattern so authenticated `/` and `/login` requests resolve to the first permitted sidebar link for the signed-in role.
- Related changes: `packages/ui/package.json`, `packages/ui/globals.css`, `apps/marketing/src/app/layout.tsx`, `packages/auth/src/index.ts`, `apps/dashboard/src/actions/cookies/auth-cookie.ts`, `apps/dashboard/src/sidebar/utils.ts`, `apps/dashboard/src/app/dashboard/[domain]/(auth)/login/client.tsx`, `apps/dashboard/src/app/dashboard/[domain]/(sidebar)/page.tsx`, `apps/dashboard/src/proxy.ts`
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
- Related changes: `apps/dashboard/src/app/dashboard/[domain]/(sidebar)/staff/teachers/search-params.ts`, `apps/dashboard/src/components/tables/staffs/index.tsx`, `apps/dashboard/src/components/tables/staffs/table.tsx`, `apps/dashboard/src/components/tables/staffs/columns.tsx`, `apps/dashboard/src/components/tables/staffs/empty-states.tsx`, `apps/dashboard/src/actions/get-staff-list.ts`, `apps/dashboard/src/utils/where.staff.ts`, `brain/api/permissions.md`, `brain/engineering/coding-standards.md`
- Owner: Copilot

## Completed Task

- ID: TASK-2026-04-01-staff-invite-and-permissions
- Title: Implement staff invite onboarding and teacher classroom/subject assignment workflow
- Completed: 2026-04-01
- Outcome: Added teacher create/edit flows that capture role, classroom permissions, subject permissions, and optional onboarding email delivery; synced assignments into existing staff permission tables; and wired invites into Better Auth password setup links.
- Related changes: `apps/dashboard/src/actions/save-staff.ts`, `apps/dashboard/src/actions/schema.ts`, `apps/dashboard/src/components/forms/staff-form.tsx`, `apps/dashboard/src/components/controls/form-multiple-selector.tsx`, `apps/dashboard/src/components/staffs/form-context.tsx`, `apps/dashboard/src/components/sheets/staff-create-sheet.tsx`, `apps/dashboard/src/components/sheets/staff-overview-sheet.tsx`, `apps/dashboard/src/components/sheets/global-sheets.tsx`, `apps/dashboard/src/hooks/use-staff-params.ts`, `apps/dashboard/src/app/dashboard/[domain]/(auth)/reset-password/client.tsx`, `apps/api/src/trpc/routers/staff.routes.ts`, `packages/auth/src/index.ts`, `brain/api/permissions.md`, `brain/api/contracts.md`
- Owner: Copilot

## Completed Task

- ID: TASK-2026-04-01-k12-teacher-workspace
- Title: Add dedicated K-12 teacher workspace routes and basic staff overview pages
- Completed: 2026-04-01
- Outcome: Added the `(k-12-teachers)` dashboard route group with a dedicated `/teacher` workspace, moved teacher sidebar navigation into its own guarded module, tightened teacher visibility in admin navigation, and replaced the remaining staff coming-soon stubs with tenant-scoped overview pages for non-teaching staff, departments, and staff attendance readiness.
- Related changes: `apps/dashboard/src/components/sidebar/links.ts`, `apps/dashboard/src/sidebar/utils.ts`, `apps/dashboard/src/actions/get-staff-list.ts`, `apps/dashboard/src/actions/get-staff-pages.ts`, `apps/dashboard/src/actions/get-teacher-workspace.ts`, `apps/dashboard/src/components/staff/basic-staff-pages.tsx`, `apps/dashboard/src/components/teachers/workspace-pages.tsx`, `apps/dashboard/src/app/dashboard/[domain]/(sidebar)/(k-12-teachers)/layout.tsx`, `apps/dashboard/src/app/dashboard/[domain]/(sidebar)/(k-12-teachers)/teacher/**`, `apps/dashboard/src/app/dashboard/[domain]/(sidebar)/staff/non-teaching/page.tsx`, `apps/dashboard/src/app/dashboard/[domain]/(sidebar)/staff/departments/page.tsx`, `apps/dashboard/src/app/dashboard/[domain]/(sidebar)/staff/attendance/page.tsx`, `brain/api/permissions.md`, `brain/engineering/repo-structure.md`
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

## Completed Task

- ID: FIN-007
- Title: Stream funding model for payables, owing, and stream-wide record visibility
- Completed: 2026-04-25
- Outcome: Reworked finance streams to separate available cash from pending payables and outstanding owing, updated payroll and service payments so stream-backed payouts can consume available funds and carry shortfalls as owing, added manual owing repayment against later stream funding, and expanded stream overview/detail pages to show wallet transactions, stream-linked bills, and active billables in one place.
- Related changes: `apps/api/src/trpc/routers/finance.routes.ts`, `apps/dashboard/src/components/payroll.tsx`, `apps/dashboard/src/components/service-payments.tsx`, `apps/dashboard/src/components/accounting-streams.tsx`, `apps/dashboard/src/components/account-stream-detail.tsx`, `brain/features/stream-funding.md`, `brain/system/overview.md`, `brain/database/relationships.md`, `brain/api/contracts.md`, `brain/api/endpoints.md`

- ID: FIN-008
- Title: Finance authorization hardening and collections stabilization
- Completed: 2026-04-25
- Outcome: Added authenticated and role-enforced finance procedures for read/write routes, repaired the classroom collections summary and student drilldown queries against the current schema, fixed waived/partial/overdue collection filtering behavior, refreshed collection invalidation after waiver actions, and recorded student payment receipt/cancellation in the tenant activity log for better traceability.
- Related changes: `apps/api/src/trpc/init.ts`, `apps/api/src/trpc/routers/finance.routes.ts`, `apps/dashboard/src/components/collections/collection-students.tsx`, `brain/api/permissions.md`, `brain/api/contracts.md`, `brain/system/overview.md`, `brain/tasks/backlog.md`

- ID: FIN-009
- Title: Dedicated payable settlement and repayment model
- Completed: 2026-04-25
- Outcome: Introduced `BillSettlement` and `BillSettlementRepayment` as the canonical stream-payable settlement layer, migrated payment and repayment flows to write through settlement records, preserved backward compatibility for older invoice-backed payments with lazy settlement hydration, updated stream/payroll/service reads to prefer settlement-backed owing balances, and pushed the schema successfully to the configured database.
- Related changes: `packages/db/src/schema/finance.prisma`, `apps/api/src/trpc/routers/finance.routes.ts`, `apps/dashboard/src/components/payroll.tsx`, `apps/dashboard/src/components/service-payments.tsx`, `brain/features/stream-funding.md`, `brain/database/relationships.md`, `brain/api/contracts.md`, `brain/tasks/backlog.md`
- Owner: Codex

- ID: FIN-010
- Title: Finance integrity and regression foundation
- Completed: 2026-04-25
- Outcome: Added finance integrity-report and canonical reporting queries, introduced a dedicated reconciliation workspace for finance operators, surfaced integrity checks and mismatch drilldowns, and established the reporting/export foundation for finance without relying on page-local calculations.
- Related changes: `apps/api/src/trpc/routers/finance.routes.ts`, `apps/dashboard/src/components/finance-reconciliation.tsx`, `apps/dashboard/src/app/dashboard/[domain]/(sidebar)/finance/reconciliation/page.tsx`, `brain/api/contracts.md`, `brain/api/endpoints.md`, `brain/features/finance-operations.md`

- ID: FIN-011
- Title: Finance reconciliation and diagnostics workspace
- Completed: 2026-04-25
- Outcome: Delivered the `/finance/reconciliation` workspace with integrity cards, mismatch drilldowns, settlement backfill action, billable generation action, and direct navigation into the main finance operational surfaces.
- Related changes: `apps/dashboard/src/components/finance-reconciliation.tsx`, `apps/dashboard/src/app/dashboard/[domain]/(sidebar)/finance/reconciliation/page.tsx`, `apps/dashboard/src/features/navigation/dashboard-nav-registry.ts`, `apps/dashboard/src/components/accounting-streams.tsx`, `brain/features/finance-operations.md`

- ID: FIN-012
- Title: Canonical finance reporting layer
- Completed: 2026-04-25
- Outcome: Added report-grade finance snapshots for streams, payroll, service payments, collections, and the owing ledger so operational views and exports can read from one canonical source.
- Related changes: `apps/api/src/trpc/routers/finance.routes.ts`, `brain/api/contracts.md`, `brain/api/endpoints.md`, `brain/features/finance-operations.md`

- ID: FIN-013
- Title: Finance export and document suite
- Completed: 2026-04-25
- Outcome: Added CSV export actions for the canonical streams, payroll, service payments, collections, and owing-ledger reports from the reconciliation workspace.
- Related changes: `apps/dashboard/src/components/finance-reconciliation.tsx`, `brain/features/finance-operations.md`

- ID: FIN-014
- Title: Billable-to-payable automation
- Completed: 2026-04-25
- Outcome: Added billable generation into payables with duplicate protection per billable history, plus dashboard actions from both the reconciliation workspace and service billables table.
- Related changes: `apps/api/src/trpc/routers/finance.routes.ts`, `apps/dashboard/src/components/tables/billables/data-table.tsx`, `brain/features/finance-operations.md`

- ID: FIN-015
- Title: Finance audit trail completion
- Completed: 2026-04-25
- Outcome: Expanded finance activity logging across stream funding, transfers, payroll/service payable creation and payment flows, settlement backfill, billable lifecycle events, waivers, discounts, and student payment events.
- Related changes: `apps/api/src/trpc/routers/finance.routes.ts`, `brain/features/finance-operations.md`, `brain/system/overview.md`

- ID: FIN-016
- Title: Finance access and approval enhancements
- Completed: 2026-04-25
- Outcome: Added admin-only approval thresholds for large discretionary finance actions such as withdrawals, transfers, fee waivers, and discounts while preserving the broader authenticated finance role enforcement.
- Related changes: `apps/api/src/trpc/routers/finance.routes.ts`, `brain/api/permissions.md`, `brain/features/finance-operations.md`

- ID: FIN-017
- Title: Collections operations upgrade
- Completed: 2026-04-25
- Outcome: Enhanced collection operations with overdue and waived rollups, classroom prioritization by outstanding balance, and clearer overdue visibility at the student fee row level.
- Related changes: `apps/api/src/trpc/routers/finance.routes.ts`, `apps/dashboard/src/components/collections/collections-dashboard.tsx`, `apps/dashboard/src/components/collections/collection-students.tsx`, `brain/features/finance-operations.md`

- ID: FIN-018
- Title: Finance module cleanup and legacy transition tooling
- Completed: 2026-04-25
- Outcome: Added settlement backfill tooling for older payable rows, shifted the finance read layer to prefer settlement-backed owing values, and reduced the remaining legacy dependence to compatibility fallback paths rather than primary logic.
- Related changes: `apps/api/src/trpc/routers/finance.routes.ts`, `apps/dashboard/src/components/payroll.tsx`, `apps/dashboard/src/components/service-payments.tsx`, `brain/features/stream-funding.md`, `brain/features/finance-operations.md`

## Completed Task

- ID: FIN-019
- Title: Standardize accounting and finance funnel and bespoke shadcn design
- Completed: 2026-06-05
- Outcome: Updated the backend to support filtering by `payerType`, `type`, and `excludeType`. Standardized all finance frontend pages (student-fees, collections, payments, fees-management, billables, bills) to pass down relevant filters so data is accurately segregated by domain. Designed the `FinanceOverview` and quick action components with a bespoke `shadcn/ui` layout featuring rich aesthetics, custom gradients, and micro-animations.
- Related changes: `apps/api/src/trpc/routers/finance.routes.ts`, `apps/api/src/db/queries/finance.ts`, `apps/dashboard/src/components/finance/finance-charges-page.tsx`, `apps/dashboard/src/components/finance/finance-items-page.tsx`, `apps/dashboard/src/components/finance/finance-payments-page.tsx`, `apps/dashboard/src/components/finance/finance-overview-stats.tsx`, `apps/dashboard/src/components/finance/forms/create-stream-form.tsx`, `apps/dashboard/src/components/finance/forms/create-item-form.tsx`, `apps/dashboard/src/components/finance/forms/transfer-funds-form.tsx`
- Owner: Codex

## Completed Task

- ID: 2026-06-12-staff-classroom-report-sheet-access
- Title: Staff Classroom Report Sheet Access
- Completed: 2026-06-12
- Outcome: Teacher/staff reports now reuse the classroom report sheet workflow, seed the default term, constrain/default teacher classroom selection to assigned classrooms, clear invalid classroom state, hide Result Entry until classroom and term are valid, and expose the same reusable report sheet from academic reports for authorized staff.
- Related changes: `apps/dashboard/src/components/teachers/teacher-report-sheet.tsx`, `apps/dashboard/src/components/student-report-filters.tsx`, `apps/dashboard/src/app/[domain]/(sidebar)/(k-12-teachers)/teacher/reports/page.tsx`, `apps/dashboard/src/app/[domain]/(sidebar)/academic/reports/page.tsx`, `brain/progress.md`
- Owner: OpenCode, reviewed by Codex

## Completed Task

- ID: STUD-IMP-001
- Title: Student Import Input And Name Parsing
- Completed: 2026-06-13
- Outcome: Approved and landed the input/name parsing worktree into `main` at merge commit `2ebe1d2`. The import modal now uses an explicit target classroom selector, optional global gender, deterministic name parsing, row validation, and preserved raw-text persistence.
- Related changes: `apps/dashboard/src/components/modals/student-import/index.tsx`, `apps/dashboard/src/components/modals/student-import/import-activities.tsx`, `brain/features/student-import.md`, `brain/plans/2026-06-12-feature-student-import-input-and-name-parsing.md`, `brain/handoffs/completed/2026-06-13-student-import-input-and-name-parsing-fix-2.md`
- Owner: antigravity, reviewed by Codex

## Completed Task

- ID: STUD-IMP-002
- Title: Student Import Verification And Matching Service
- Completed: 2026-06-13
- Outcome: Approved and landed the verification/matching worktree into `main` at merge commit `0e19470`. Batch verification now runs through `students.verifyStudentImport`, validates the selected classroom, returns match metadata, and infers missing gender when existing-name evidence is decisive.
- Related changes: `apps/api/src/db/queries/students.ts`, `apps/api/src/trpc/routers/students.routes.ts`, `apps/dashboard/src/components/modals/student-import/import-activities.tsx`, `brain/api/contracts.md`, `brain/api/endpoints.md`, `brain/features/student-import.md`, `brain/plans/2026-06-12-feature-student-import-verification-and-matching-service.md`, `brain/handoffs/completed/2026-06-12-student-import-verification-and-matching-service-handoff.md`
- Owner: open-code, reviewed by Codex

## Completed Task

- ID: STUD-IMP-004
- Title: Student Import Execution And Term Sheet Creation
- Completed: 2026-06-13
- Outcome: Approved and landed the execution/term-sheet worktree into `main` at merge commit `b6d37da`. Batch execution now supports import-new, keep-match, and update-match decisions while ensuring current session/term enrollment records are created or reused.
- Related changes: `apps/api/src/db/queries/students.ts`, `apps/api/src/trpc/routers/students.routes.ts`, `apps/dashboard/src/components/modals/student-import/import-activities.tsx`, `brain/api/contracts.md`, `brain/api/endpoints.md`, `brain/features/student-import.md`, `brain/plans/2026-06-12-feature-student-import-execution-and-term-sheet-creation.md`, `brain/handoffs/completed/2026-06-12-student-import-execution-and-term-sheet-creation-fix-3.md`
- Owner: open-code, reviewed by Codex

## Completed Task

- ID: STUD-IMP-003
- Title: Student Import Review And Resolution UI
- Completed: 2026-06-13
- Outcome: Resolved the blocked landing from worktree `/Users/M1PRO/Documents/code/.brain-worktrees/2026-06-12-school-clerk-student-import-review-and-resolution-ui` into `main`. The import review screen now uses Ready to import, Match Found, and Needs attention tabs with batch defaults, row-level decisions, full candidate metadata, manual gender resolution, and suspected-match validation that only requires a selected candidate for keep/update decisions.
- Related changes: `apps/dashboard/src/components/modals/student-import/import-activities.tsx`, `brain/features/student-import.md`, `brain/progress.md`
- Owner: Antigravity/OpenCode, landed by Codex

## Completed Task

- ID: 2026-06-12-school-clerk-empty-report-spreadsheet-print
- Title: Admin Empty Classroom Report Spreadsheet Print
- Completed: 2026-06-15
- Outcome: Landed the admin blank classroom report spreadsheet print workflow on `main`; `Print Empty Sheet` is available to `ADMIN` SaaS owners and `Admin` staff admins, keeps student/assessment headers visible, and renders score/total/percentage cells blank for manual records. Browser/print verification was skipped by user instruction.
- Related changes: `apps/dashboard/src/components/classroom-result-table.tsx`, `brain/api/permissions.md`, `brain/features/assessment-results-and-sub-assessments.md`, `brain/progress.md`
- Owner: Codex

## Completed Task

- ID: 2026-06-13-school-clerk-assessment-recording-page-polish
- Title: Assessment Recording Page Polish
- Completed: 2026-06-15
- Outcome: Removed the header subject selector, tightened mobile spacing, defaulted the score-entry table to the first loaded subject when no explicit subject is selected, hid subject total columns from score entry, and added a subject-click cue. Browser/manual verification was skipped by user instruction.
- Related changes: `apps/dashboard/src/components/assessment-recording.tsx`, `apps/dashboard/src/components/assessment-recording-results-table.tsx`, `brain/features/assessment-results-and-sub-assessments.md`, `brain/progress.md`
- Owner: Codex

## Completed Task

- ID: 2026-06-13-school-clerk-student-report-workspace-cleanup
- Title: Student Report Workspace Cleanup
- Completed: 2026-06-15
- Outcome: Removed the live Print View tab, opened student report directly to Classroom Results, preserved print-only report output, restricted the Assessment Recording CTA to valid staff/teacher classroom context, and shortened classroom result copy. Browser/manual verification was skipped by user instruction.
- Related changes: `apps/dashboard/src/app/[domain]/(sidebar)/(student-result-portal)/student-report/student-report-view.tsx`, `apps/dashboard/src/hooks/use-student-report-filter-params.ts`, `apps/dashboard/src/components/student-report-filters.tsx`, `apps/dashboard/src/components/classroom-result-table.tsx`, `brain/progress.md`
- Owner: Codex

## Completed Task

- ID: 2026-06-13-school-clerk-gnd-style-sidebar-refresh
- Title: GND-Style Sidebar Refresh
- Completed: 2026-06-15
- Outcome: Landed the GND-style sidebar rail refresh with wider collapsed/expanded widths, faster hover expansion, sidebar color tokens, active module styling, updated nav spacing/keys, link selection propagation, and matching shell offset. Browser/manual verification was skipped by user instruction.
- Related changes: `packages/site-nav/src/components/sidebar.tsx`, `packages/site-nav/src/components/sidebar-shell.tsx`, `packages/site-nav/src/components/navs-list.tsx`, `brain/progress.md`
- Owner: Codex

### School-Facing Scholaris Redesign And Dummy Data Support

- Priority: High
- Description: Track plan in `brain/plans/2026-06-19-feature-school-facing-scholaris-redesign-and-dummy-data-support.md`.
- Related Feature: school website template registry
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-06-19-feature-school-facing-scholaris-redesign-and-dummy-data-support.md
- Created Date: 2026-06-19
- Completed Date: 2026-06-19

## Completed Task

- ID: 2026-07-18-assessment-workbook-round-trip
- Title: Assessment Workbook Download, Review, And Atomic Import
- Completed: 2026-07-18
- Outcome: Added one-classroom signed `.xlsx` generation with configurable subject/assessment columns, scoped RTL output, literal Arabic/Western digit normalization, missing-assessment link/create resolution, exact token-bound preview, three-way conflict protection, atomic idempotent score and standalone-assessment writes, strict role/teacher access checks, and export/import audit records.
- Related changes: `packages/assessment-workbooks`, `apps/api/src/db/queries/assessment-workbooks.ts`, `apps/dashboard/src/components/assessment-workbooks-dialog.tsx`, `.brain/features/assessment-workbook-round-trip.md`, `.brain/decisions/ADR-0010-signed-assessment-workbook-round-trip.md`
- Owner: Codex

## Completed Task

- ID: 2026-07-18-assessment-score-value-history
- Title: Persist Assessment Score Value History
- Completed: 2026-07-18
- Outcome: Added transactional append-only previous/new value history for authenticated assessment entry, public-link entry, workbook imports, and authorized AI assessment writes. Same-value saves and explicit clears are recorded; existing scores remain canonical and are not backfilled.
- Related changes: `packages/db/src/assessment-score-history.ts`, `apps/api/src/db/queries/assessments.ts`, `apps/api/src/db/queries/assessment-public-links.ts`, `apps/api/src/db/queries/assessment-workbooks.ts`, `packages/ai/src/tools/assessments.ts`, `.brain/features/assessment-score-value-history.md`, `.brain/decisions/ADR-0011-transactional-assessment-score-value-history.md`
- Owner: Codex
