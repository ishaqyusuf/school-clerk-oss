# Done

## Completed Task

- ID: 2026-08-04-production-postgresql-neon-migration
- Title: Migrate Production PostgreSQL From Supabase To Neon
- Completed: 2026-08-04
- Outcome: Copied the application-owned production `public` schema and data to
  Neon, validated all 120 tables and database metadata, switched and redeployed
  the Vercel dashboard, and synchronized the Trigger.dev production database
  environment. Trigger worker version `20260804.10` was built and deployed after
  hardening its remote Prisma-client generation. Supabase-managed services were
  not part of the application data path and were not copied.
- Validation: Custom-format archive inspection; exact per-table row counts and
  content checksums; enum, constraint, index, sequence, and active-column
  comparisons; Prisma pooled-connection smoke queries; and an HTTP 200 response
  from the production dashboard after its Neon-backed deployment. The final
  post-Trigger comparison still reported 120 matching tables and zero content
  mismatches. The Trigger remote build passed; the existing broad jobs
  typecheck remains red on unrelated monorepo missing-export and NodeNext
  extension errors.
- Related changes: `.env.production`, `.brain/database/migrations.md`,
  `.brain/database/schema.md`, `.brain/system/overview.md`,
  `.brain/system/tech-stack.md`, `.brain/SYSTEM_OVERVIEW.md`,
  `.brain/decisions/ADR-0021-production-postgresql-on-neon.md`,
  `packages/jobs/trigger.config.ts`, `packages/jobs/package.json`, `bun.lock`
- Owner: Codex

## Completed Task

- ID: 2026-08-03-root-environment-contract
- Title: Canonical Root Environment And Remote Development Database Support
- Completed: 2026-08-03
- Outcome: Standardized tooling on `.env` plus exactly one of `.env.local`,
  `.env.dev`, `.env.preview`, or `.env.production`; simplified Prisma config;
  and allowed non-production structure commands to use hosted database URLs
  while preserving the exact production-target blocker.
- Validation: Focused database command and sync-pair contract tests passed.
- Related changes: `packages/db/prisma.config.ts`, `packages/db/src/local-sync.ts`,
  `turbo.json`, `.brain/database/migrations.md`
- Owner: Codex

## Completed Task

- ID: 2026-08-03-marketing-landing-theme-redesign
- Title: Veracross-Inspired Marketing Landing Page And Platform Theme
- Completed: 2026-08-03
- Outcome: Rebuilt the public marketing page around a connected school-operations
  story with an original product preview, institution-fit proof, connected
  workflows, platform modules, accessible role workspaces, rollout guidance,
  current pricing, FAQ, and responsive conversion paths. Adopted the Academic
  Evergreen semantic palette across marketing, dashboard, and shared UI while
  preserving tenant school-site theme ownership.
- Validation: Marketing production build and focused typecheck passed;
  dashboard and shared UI typechecks passed; desktop and mobile browser QA
  verified responsive rendering, the mobile menu, pointer and keyboard role-tab
  switching, accessible state updates, and zero console errors. The broad Turbo
  typecheck remains blocked by unrelated existing jobs/API database export and
  strictness failures.
- Related changes: `apps/marketing/src/components/landing`,
  `apps/marketing/src/app/page.tsx`, `apps/marketing/src/styles/globals.css`,
  `apps/dashboard/src/styles/globals.css`, `packages/ui/src/styles/globals.css`,
  `.brain/features/marketing-landing-page.md`,
  `.brain/decisions/ADR-0020-academic-evergreen-platform-theme.md`
- Owner: Codex

## Completed Task

- ID: 2026-08-02-gender-targeted-student-fees
- Title: Gender-Targeted Student Fees
- Completed: 2026-08-02
- Outcome: Added all-gender, male-only, and female-only targeting to reusable
  fees independently from admission audience, classroom scope, and
  required/optional assignment. Enforced the rule across creation, enrollment,
  promotion/rollover, both canonical gender-edit paths, reconciliation,
  student-form preview, payment import, and configured payment paths, and
  exposed it in both fee create and edit forms. The Add Fee
  modal uses a batch-level default with per-sub-fee overrides and a compact
  responsive line editor.
- Validation: 114 focused student/finance/fee/payment-import tests passed;
  dashboard typecheck passed; API typecheck reached only its two pre-existing
  academic reset/setup errors.
  Local and production schema pushes succeeded. Authenticated browser QA
  exercised combined female/new-admission/optional targeting, per-line gender
  selection, and confirmed non-overlapping mobile rows at 390 × 844 and
  320 × 800 plus one-line desktop rows at 1280 × 900.
- Related changes: `packages/db/src/schema/finance.prisma`,
  `packages/db/src/student-fee-application.ts`,
  `apps/api/src/db/queries/finance.ts`,
  `apps/api/src/trpc/routers/academics.routes.ts`,
  `apps/dashboard/src/components/modals/add-fee-modal.tsx`,
  `.brain/features/student-fees.md`,
  `.brain/decisions/ADR-0019-finance-item-gender-audience.md`
- Owner: Codex

## Completed Task

- ID: 2026-08-02-add-fee-audience-modal
- Title: Enrollment-Targeted Add Fee Modal
- Completed: 2026-08-02
- Outcome: Replaced the duplicated Add Fee sheet instances with one global 560px Midday-style modal, exposed enrollment audience independently from required/optional assignment, flattened the fee stream controls, added plain-language behavior feedback, and preserved selected-student direct charge creation. Stale classroom targets are rejected and partial multi-line failures retain only failed lines for safe retry.
- Validation: Six focused add-fee model tests and dashboard typecheck passed. Authenticated browser verification confirmed single-dialog ownership, audience/assignment behavior, selected-student cleanup, and scrollable overflow-free mobile layouts at 390 × 844 and 320 × 800 without submitting data.
- Related changes: `apps/dashboard/src/components/modals/add-fee-modal.tsx`, `apps/dashboard/src/components/finance/forms/add-fee-model.ts`, `apps/dashboard/src/components/modals/global-modals.tsx`, `.brain/features/student-fees.md`, `.brain/features/admission-status-and-targeted-fees.md`
- Owner: Codex

## Completed Task

- ID: 2026-08-02-active-academic-metadata-editing
- Title: Current Academic Session And Term Editing
- Completed: 2026-08-02
- Outcome: Exposed direct Admin-only edit actions for the current session and term, allowed active-term title updates while locking its calendar, preserved omitted notes and closed-term immutability, and kept history-row editing available.
- Validation: 29 focused academic lifecycle/metadata/schema/reset tests passed, dashboard typecheck passed, and authenticated browser QA confirmed editable current-session and current-term modals without saving test data.
- Related changes: `apps/dashboard/src/components/academic/academic-summary-cards.tsx`, `apps/dashboard/src/components/modals/edit-academic-metadata-modal.tsx`, `apps/api/src/db/queries/academic-access.ts`, `apps/api/src/db/queries/academic-terms.ts`, `apps/api/src/trpc/schemas/academic-metadata.ts`, `.brain/features/academic-term-lifecycle-and-rollover.md`, `.brain/api/contracts.md`
- Owner: Codex

## Completed Task

- ID: 2026-08-02-inline-student-creation-payments
- Title: Fee-Specific Payments During Student Creation
- Completed: 2026-08-02
- Outcome: Added classroom/admission-aware required and optional fee rows to the student form, exact per-fee full/partial Pay now controls, pending-balance summaries, shared payment details, dynamic submit and receipt states, atomic student/charge/payment posting through the canonical ledger routine, finance-role enforcement, and overpayment protection. Removed the unused submit split-menu action.
- Validation: 94 focused student/finance/fee-application tests passed; dashboard typecheck passed; API changes typechecked with only the two pre-existing academic-term reset/setup errors remaining. Authenticated browser QA confirmed automatic Basic Tuition Fee display for the selected classroom stream, pending and paid states, dynamic totals/submit label, and zero development issues without submitting a real student.
- Related changes: `apps/dashboard/src/components/forms/student-form.tsx`, `apps/dashboard/src/components/forms/student-form-action.tsx`, `apps/api/src/db/queries/students.ts`, `apps/api/src/db/queries/finance.ts`, `packages/db/src/student-fee-application.ts`, `.brain/features/student-fees.md`, `.brain/features/finance-operations.md`, `.brain/api/contracts.md`, `.brain/api/permissions.md`
- Owner: Codex

## Completed Task

- ID: 2026-07-28-admission-status-targeted-fees
- Title: Term Admission Classification And Targeted Student Fees
- Completed: 2026-07-28
- Outcome: Added explicit term-level new-admission/returning/unclassified
  status, directory filters and bulk actions, term-derived analytics, import
  classification, finance-item admission audiences, safe fee reconciliation,
  and optional quick-fee selection during student creation.
- Validation: 89 focused API/import/UI tests pass; dashboard, database, shared
  utilities, and AI packages type-check. API typecheck reaches only its two
  pre-existing academic-term reset/setup errors. Local and production Prisma
  schema pushes succeeded.
- Related changes: `.brain/features/admission-status-and-targeted-fees.md`,
  `.brain/decisions/ADR-0018-term-enrollment-admission-status-and-fee-audience.md`
- Owner: Codex

## Purpose

Record of completed tasks and delivery outcomes.

## How To Use

- Move finished items from in-progress.
- Capture completion date and outcome.
- Reference PR/commit when available.

## Template

## Completed Task

- ID: 2026-07-28-midday-student-directory
- Title: Midday-Style Student Directory And Shared Table Core
- Completed: 2026-07-28
- Outcome: Migrated `/students/list` to a single virtualized Midday-style table with persisted column controls, drag reordering, URL sorting, row selection, CSV export, role-gated bulk enrollment actions, and existing overview/edit sheet interoperability. Completed the shared table support layer, added typed tenant-scoped list contracts, authenticated the student router, and added atomic tenant-safe bulk class changes.
- Validation: Focused student query tests passed with 27 tests and 52 assertions; dashboard typecheck passed. API typecheck reaches only the two pre-existing academic-term reset/setup errors.
- Related changes: `apps/dashboard/src/components/tables/core`, `apps/dashboard/src/components/tables/students`, `apps/dashboard/src/hooks/use-table-dnd.ts`, `apps/dashboard/src/hooks/use-sort-params.ts`, `apps/dashboard/src/hooks/use-sort-query.ts`, `apps/api/src/db/queries/students.ts`, `apps/api/src/trpc/routers/students.routes.ts`, `.brain/features/student-directory.md`, `.brain/api/contracts.md`, `.brain/api/endpoints.md`, `.brain/api/permissions.md`
- Owner: Codex

## Completed Task

- ID:
- Title:
- Completed:
- Outcome:
- Related changes:
- Owner:

## Completed Task

- ID: ATTENDANCE-002
- Title: Repair classroom attendance capture and classroom overview navigation
- Completed: 2026-07-26
- Outcome: Fixed the first-page roster/save mismatch with one authorized complete-roster attendance query, retained the full roster for validated writes, added progressive 25-row rendering, field-level attendance validation plus server error feedback, split recording and history into `Mark attendance`/`Sessions` sub-tabs, aligned attendance type and session title in two columns, and made the classroom overview title an in-place classroom switcher.
- Validation: The red attendance-roster regression now passes; 18 focused API/UI attendance tests, dashboard typecheck, database package typecheck, and both standards/spec code-review axes pass. The dashboard production build compiled successfully but page-data collection remains blocked by missing `DATABASE_URL`/`BETTER_AUTH_SECRET` in the build environment. The broad API typecheck has two pre-existing academic-term reset/setup errors, and the full API suite has two pre-existing finance name-order expectations. Live browser QA was blocked because no School Clerk stack was running and cmux was unavailable.
- Related changes: `packages/db/src/attendance.ts`, `apps/api/src/trpc/routers/attendance.routes.ts`, `apps/dashboard/src/components/classroom-attendance-form.tsx`, `apps/dashboard/src/components/classroom-attendance-roster.tsx`, `apps/dashboard/src/components/classroom-attendance.tsx`, `apps/dashboard/src/components/sheets/classroom-overview-sheet.tsx`, `.brain/features/attendance.md`, `.brain/bugs/2026-07-26-attendance-first-page-roster-save-failure.md`
- Owner: Codex

## Completed Task

- ID: 2026-07-27-previous-term-student-payments
- Title: Previous-Term Student Payment Support
- Completed: 2026-07-27
- Outcome: Added a term-first simple cashier flow with tenant-validated historical student term choices, full session/term labels, dependent-field resets, selected-term fee and charge scoping, duplicate suppression, old-charge/current-cash accounting separation, and closed-ledger-safe missing-charge behavior. The Advanced flow remains unchanged.
- Validation: 36 focused finance tests and 6 payment-term UI tests pass; dashboard typecheck passes; authenticated live browser QA confirmed historical term switching, full option labels, paid-for/collected-in confirmation labels, and clean dependent-field resets without submitting payment. The broad suite reached 374 passes with only its existing AI assessment-history failures and Playwright/Bun discovery error; API typecheck reaches only the two existing academic-term reset/setup errors.
- Related changes: `apps/api/src/db/queries/finance.ts`, `apps/api/src/trpc/routers/finance.routes.ts`, `apps/api/src/trpc/schemas/finance.ts`, `apps/dashboard/src/components/sheets/receive-payment-sheet.tsx`, `.brain/api/finance-payments.md`, `.brain/features/student-fees.md`, `.brain/features/finance-operations.md`
- Owner: Codex

## Completed Task

- ID: 2026-07-26-attendance-remove-sick-status
- Title: Simplify Attendance Statuses And Recorder Controls
- Completed: 2026-07-26
- Outcome: Removed Sick from the attendance picker and API write contract, changed the mobile selector to three equal controls, clarified the remark field for illness notes, and normalized stored legacy Sick values to Absent instead of exposing a separate Sick status. Replaced native date inputs with one shared standard shadcn calendar, consolidated classroom and teacher attendance-wide actions into shared Mark all/Mark rest submenus for Present, Absent, and Late, retained Clear all in that menu, and made Save icon-only through medium screens. Browser-safe attendance status and bulk-update rules now live in the shared utilities package.
- Validation: Twenty-four focused attendance tests plus dashboard and shared-utils typechecks passed; authenticated browser QA at 320 × 800 and 1280 × 900 verified three controls per student, no Sick control, the shadcn calendar open/select flow, Absent plus a Sick remark, Mark rest preserving a Late mark while filling six Absent marks, responsive Save labeling, and no dialog overflow. The repository-wide suite completed with 333 passes and its existing six failures/one Playwright configuration error; the broad Turbo typecheck remains blocked by pre-existing Jobs/shared strictness failures.
- Related changes: `packages/utils/src/attendance.ts`, `apps/dashboard/src/lib/attendance.ts`, `apps/dashboard/src/components/attendance-recorder-controls.tsx`, `apps/dashboard/src/components/classroom-attendance-form.tsx`, `apps/dashboard/src/components/classroom-attendance-roster.tsx`, `apps/dashboard/src/components/teachers/teacher-attendance-workspace.tsx`, `apps/dashboard/src/components/students/student-attendance-history.tsx`, `apps/api/src/trpc/routers/attendance.routes.ts`, `.brain/features/attendance.md`, `.brain/api/contracts.md`
- Owner: Codex

## Completed Task

- ID: ACADEMIC-SESSION-SCOPED-TERM-SELECTORS-001
- Title: Scope academic term selectors to the selected session
- Completed: 2026-07-25
- Outcome: Academic history now places unscheduled term drafts last, the header and shared report/assessment filters exclude unscheduled terms and show only the selected session's terms, and Academic Management can switch the workspace into another session through its earliest scheduled term.
- Related changes: `apps/api/src/trpc/routers/academics.routes.ts`, `apps/api/src/trpc/routers/assessment.routes.ts`, `apps/dashboard/src/components/sidebar/term-switcher.tsx`, `apps/dashboard/src/actions/get-term-list.tsx`, `apps/dashboard/src/actions/cookies/auth-cookie.ts`, `apps/dashboard/src/app/[domain]/(sidebar)/academic/(dashboard)/page.tsx`, `.brain/features/academic-term-lifecycle-and-rollover.md`, `.brain/api/contracts.md`
- Owner: Codex

## Completed Task

- ID: SCHOOL-SETTINGS-NAME-FORMAT-001
- Title: Add tenant-wide student name format and Midday-style settings shell
- Completed: 2026-07-19
- Outcome: Added an administrator-controlled school preference for first/surname/other-name ordering, a shared formatter with safe fallback, tenant-context propagation across dashboard/API/AI/enrollment/finance/reports/PDF surfaces, and a Midday-style settings shell with hydrated cards and explicit Save behavior. Local and production schemas were synchronized successfully. Focused tests and all affected package typechecks pass; website/browser testing was skipped at the user's request.
- Related changes: `packages/db/src/schema/school.prisma`, `packages/utils/src/student-name.ts`, `apps/api/src/db/queries/school-settings.ts`, `apps/dashboard/src/components/settings/settings-shell.tsx`, `apps/dashboard/src/components/student-name-format/*`, `.brain/features/student-name-format.md`, `.brain/decisions/ADR-0014-tenant-student-name-format.md`
- Owner: Codex

## Completed Task

- ID: ASMT-WB-PROD-ROUNDTRIP-001
- Title: Complete the signed RTL assessment workbook round trip in production
- Completed: 2026-07-19
- Outcome: Configured production workbook signing and completed the real dashboard download, preservation-safe population, preview, mapping, confirmation, apply, and replay flow for Daarul Hadith, 1447/1448 1st Term, الأول الإعدادي. The signed 18-column RTL workbook created eight standalone `الامتحان` assessments at 100 points/100% weight, applied 139 new and 2 updated scores, retained 22 unchanged and 53 blank cells, and reported zero conflicts, invalid values, or stale rows. Production verification confirmed exactly 141 unique `WORKBOOK_IMPORT` history rows, correct Qur'an components and totals (عبد المتين 29; زينب 28), الحديث عبد السلام updated from 6 to 2, المتون فردوس updated from 60 to 70, eight standalone Qur'an assessments with no grouped parent/`الامتحان`/`المجموع`, and one import record after replaying the same idempotency confirmation. Production testing exposed two independent hosting limits; the workbook transaction now has a 10-second acquisition wait and 60-second execution timeout, and the dashboard tRPC route has a 60-second serverless duration.
- Related changes: `apps/api/src/db/queries/assessment-workbooks.ts`, `apps/api/src/db/queries/assessment-workbooks.test.ts`, `apps/dashboard/src/app/api/trpc/[...trpc]/route.ts`, `.brain/features/assessment-workbook-round-trip.md`
- Owner: Codex

## Completed Task

- ID: ASMT-UNCAPPED-LABEL-001
- Title: Simplify uncapped assessment table labels
- Completed: 2026-07-19
- Outcome: Replaced the compact `Uncapped` obtainable label with `(-)` in assessment recording and classroom result table headers while preserving the explanatory wording in assessment setup forms.
- Related changes: `apps/dashboard/src/components/assessment-recording-results-table.tsx`, `apps/dashboard/src/components/classroom-result-table.tsx`, `.brain/features/assessment-results-and-sub-assessments.md`
- Owner: Codex

## Completed Task

- ID: ASMT-RECORDING-WIDTH-001
- Title: Expand assessment recording content on large screens
- Completed: 2026-07-19
- Outcome: Preserved the focused assessment-recording width on mobile and normal desktop screens while releasing the `max-w-4xl` cap at the extra-large breakpoint, allowing dense RTL and multi-subject score tables to use the available dashboard content area.
- Related changes: `apps/dashboard/src/components/assessment-recording.tsx`, `.brain/features/assessment-results-and-sub-assessments.md`
- Owner: Codex

## Completed Task

- ID: ASMT-UNCAPPED-001
- Title: Support uncapped informational assessments
- Completed: 2026-07-19
- Outcome: Added nullable obtainable values for standalone `0%`-weight informational assessments across shared contracts, authenticated/public/AI/workbook score entry, assessment forms, recording screens, signed workbook review/apply, result totals, and printed reports. Locally converted the four approved Qur'an page-reference assessments without changing their IDs or scores. A signed RTL workbook accepted and applied `750` to an uncapped field, produced exactly one `WORKBOOK_IMPORT` history row, and the same idempotency-key replay produced no duplicate write. Production received the nullable schema only; production assessment and score data remained unchanged.
- Related changes: `packages/db/src/schema/assessment.prisma`, `packages/assessment-results`, `packages/assessment-workbooks`, `packages/ai/src/tools/assessments.ts`, `apps/api/src/db/queries/assessments.ts`, `apps/api/src/db/queries/assessment-public-links.ts`, dashboard assessment components, `.brain/features/assessment-results-and-sub-assessments.md`, `.brain/features/assessment-workbook-round-trip.md`, `.brain/database/schema.md`, `.brain/database/migrations.md`, `.brain/decisions/ADR-0013-uncapped-informational-assessments.md`
- Owner: Codex

## Completed Task

- ID: ASMT-WB-ROUNDTRIP-001
- Title: Verify the signed RTL assessment workbook round trip with legacy Qur'an scores
- Completed: 2026-07-19
- Outcome: Completed a local-only dashboard round trip for Daarul Hadith, 1447/1448 1st Term, الأول الإعدادي. Renamed the existing الحديث assessment to الامتحان, retained the existing المتون الامتحان, created four weighted Qur'an score assessments plus four zero-weight page-reference fields, downloaded and preservation-safely populated an 18-column signed RTL workbook from the legacy CSV, mapped eight subject-only columns to new 100-point/100%-weight الامتحان assessments, and applied 139 new plus 2 updated scores. Verification confirmed 22 unchanged and 53 blank cells, zero conflicts/invalid/stale rows, 141 unique WORKBOOK_IMPORT history rows, correct Qur'an totals, and one idempotent import after a repeated Apply. The test exposed and fixed workbook export authorization failing because the shared Prisma soft-delete extension injected `deletedAt` into a model that uses `revokedAt`; export lookup now uses the primary key with explicit scope/revocation checks, and the shared extension only filters models that actually declare `deletedAt`. Production data was not changed.
- Related changes: `apps/api/src/db/queries/assessment-workbooks.ts`, `apps/api/src/db/queries/assessment-workbooks.test.ts`, `packages/db/src/prisma.ts`, `.brain/features/assessment-workbook-round-trip.md`
- Owner: Codex

## Completed Task

- ID: ATTENDANCE-001
- Title: Production-ready general and subject attendance
- Completed: 2026-07-20
- Outcome: Enabled the production teacher attendance workspace and expanded administrator attendance with general/subject modes, explicit date/period and six-state roster marking, complete-roster validation, active-term and teacher-assignment authorization, atomic duplicate/idempotency guards, editable corrections, soft deletion, revision/activity audit records, student history, classroom summaries, and CSV reporting.
- Validation: 25 focused attendance/teacher-access tests pass; API, dashboard, and database package typechecks pass; Prisma generation plus required local and production schema pushes succeeded without destructive flags. Broader validation found only pre-existing unrelated finance expectation failures and jobs-package TypeScript configuration errors.
- Related changes: `apps/api/src/trpc/routers/attendance.routes.ts`, `apps/dashboard/src/components/classroom-attendance-form.tsx`, `apps/dashboard/src/components/teachers/teacher-attendance-workspace.tsx`, `packages/db/src/schema/student-activity.prisma`, `.brain/features/attendance.md`, `.brain/decisions/ADR-0016-unified-attendance-sessions-and-atomic-guards.md`
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

- ID: FIN-PAY-IMPORT-001
- Title: Durable Student And Staff Payment Import
- Completed: 2026-07-23
- Outcome: Added strict minimal student/staff CSV parsing with optional source notes, global term confirmation, Arabic-aware matching with full tenant-scoped manual selection, stream/item and term-sheet verification, grouped review/skip/duplicate decisions, durable Trigger.dev execution, configured-charge partial-payment reconciliation, row locking, refresh recovery, failed-row retry, result CSV export, canonical finance writes, and role-gated finance-page entry points. Extracted Daarul Hadith sources remain under `.scratch/payment-import/daarul-hadith` as two term-specific student files and one staff file for reviewed import.
- Validation: Reconciled 91 student rows totaling NGN 248,200 and 31 staff rows totaling NGN 280,500; Prisma generation and local/production schema pushes; API/dashboard typechecks; 13 focused tests with 49 assertions; dashboard production build; and clean diff whitespace check. The jobs package still reports its pre-existing package-wide NodeNext/shared-source typing baseline, and authenticated browser QA was not run because no reusable cmux development stack was available.
- Related changes: `packages/db/src/schema/finance-payment-import.prisma`, `apps/api/src/db/queries/payment-import.ts`, `apps/dashboard/src/components/modals/payment-import`, `packages/jobs/src/tasks/process-finance-payment-import-job.ts`, `.brain/features/payment-import.md`
- Owner: Codex

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

- ID: 2026-07-25-student-report-print-history
- Title: Term-Scoped Student Report Print History
- Completed: 2026-07-25
- Outcome: Replaced automatic pre-print logging with explicit post-print confirmation for browser Print and Print v2/PDF, secured and tenant-validated print-history APIs, added latest confirmed print dates to report roster rows, and added All/Printed/Pending page filtering whose bulk selection follows the visible roster.
- Validation: Focused API and shared report workflow/filter tests plus dashboard typecheck. Browser QA was blocked because no School Clerk stack was running and `cmux` was unavailable; project rules prohibited starting dev in the agent shell.
- Related changes: `apps/api/src/trpc/routers/assessment.routes.ts`, `apps/dashboard/src/components/print-selection-footer.tsx`, `apps/dashboard/src/components/classroom-result-table.tsx`, `packages/assessment-results/src/index.ts`, `.brain/features/assessment-results-and-sub-assessments.md`
- Owner: Codex

## Completed Task

- ID: ACADEMIC-TERM-RESET-001
- Title: Confirmed Academic Term Reset
- Completed: 2026-07-25
- Outcome: Added an Admin-only impact preview and exact typed-confirmation reset for draft/ready terms. The serializable reset clears term-scoped academic setup data and both calendar dates, returns the term to `DRAFT`, records an audit, protects active/closed terms, and blocks any term with finance records. Draft/ready term dates are independently clearable through the standardized shadcn calendar in creation, setup, and quick-edit flows. Follow-up production hardening removed concurrent queries from the single transaction connection, eliminated the `pg` client-query deprecation path, avoided repeating the full impact preview inside the transaction, and reserved response time beneath Vercel's 60-second deadline.
- Validation: Focused reset/setup/schema tests plus API/dashboard/UI typechecks; the transaction-concurrency regression test passes.
- Related changes: `apps/api/src/db/queries/academic-term-reset.ts`, `apps/api/src/trpc/routers/academics.routes.ts`, `apps/dashboard/src/app/[domain]/(sidebar)/academic/(dashboard)/page.tsx`, `.brain/features/academic-term-lifecycle-and-rollover.md`
- Owner: Codex

## Completed Task

- ID: ACADEMIC-METADATA-EDIT-001
- Title: Midday-Style Academic Session And Term Editing
- Completed: 2026-07-25
- Outcome: Removed session/term date presentation from academic history, replaced the term Dates action with Edit, added a session-row Edit action, and introduced one focused Midday-style modal for renaming sessions or draft/ready terms while updating or clearing their optional shadcn calendar dates.
- Validation: Static scoped diff checks completed; focused schema tests and package typechecks are recommended after the final combined worktree changes.
- Related changes: `apps/dashboard/src/components/modals/edit-academic-metadata-modal.tsx`, `apps/dashboard/src/app/[domain]/(sidebar)/academic/(dashboard)/page.tsx`, `apps/api/src/db/queries/academic-terms.ts`, `apps/api/src/db/queries/academic-term-setup.ts`
- Owner: Codex

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

- ID: 2026-07-27-current-term-payment-student-search
- Title: Current-Term Unique Student Payment Search
- Completed: 2026-07-27
- Outcome: Scoped the Receive Student Payment picker to non-deleted canonical students registered in the active dashboard session and term, selected display metadata from that same registration, and enforced distinct student IDs so historical term sheets cannot produce duplicate picker entries.
- Validation: 39 focused finance tests and dashboard typecheck passed; authenticated browser QA confirmed current-term-only simple results and unchanged all-term Advanced results. The repository suite completed with 379 passes plus its existing three AI assessment-history failures and one Playwright discovery error. API typecheck reached only the two pre-existing academic-term reset/setup errors.
- Related changes: `apps/api/src/db/queries/finance.ts`, `apps/api/src/db/queries/finance.test.ts`, `apps/api/src/trpc/schemas/finance.ts`, `apps/dashboard/src/components/sheets/receive-payment-sheet.tsx`, `.brain/api/finance-payments.md`, `.brain/features/student-fees.md`, `.brain/bugs/2026-07-27-payment-student-search-duplicates.md`
- Owner: Codex

## Completed Task

- ID: ACADEMIC-TERM-001
- Title: Explicit New-Term Setup, Rollover, Activation, And Closure
- Completed: 2026-07-20
- Outcome: Added tenant-safe `DRAFT`/`READY`/`ACTIVE`/`CLOSED` lifecycle management, canonical active-term selection, idempotent additive rollover runs, finance and progression activation gates, closed-term write protection, onboarding activation, term-based teacher profiles and access remapping, review/receipt UI, and authenticated browser verification. Browser QA also fixed visible date validation, locked date controls, current-session defaulting, dashboard invalidation, and create-to-setup navigation; all temporary QA records were removed. Production hardening replaced per-student enrollment and fee-charge writes with UUID-backed bulk inserts, reduced setup transaction validation to a lightweight source/target recheck, and reserved response time beneath the Vercel deadline.
- Validation: Prisma generation plus local/production schema pushes, API/UI/dashboard/database/AI typechecks, 25 focused tests with 68 assertions, dashboard production build, read-only real-database probe, authenticated Portless browser flow, and a focused 250-student regression proving one enrollment batch plus one finance-charge batch.
- Related changes: `packages/db/src/schema/school.prisma`, `packages/db/src/schema/staffs.prisma`, `packages/db/src/schema/student-activity.prisma`, `apps/api/src/db/queries/academic-term-setup.ts`, `apps/api/src/trpc/routers/academics.routes.ts`, `apps/dashboard/src/components/configure-term.tsx`, `apps/dashboard/src/components/configure-term-import.tsx`, `.brain/features/academic-term-lifecycle-and-rollover.md`, `.brain/decisions/ADR-0015-explicit-academic-term-lifecycle-and-idempotent-rollover.md`
- Owner: Codex

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

## Completed Task

- ID: 2026-07-26-classroom-and-cross-session-term-switchers
- Title: Classroom And Cross-Session Term Switchers
- Completed: 2026-07-26
- Outcome: Added an explicit classroom-specific chevron-down affordance so the overview title clearly opens classroom selection, and upgraded the administrator header switcher to display session plus term while grouping every scheduled term across all academic sessions.
- Validation: Focused classroom-trigger and term-switcher model tests, dashboard typecheck, plus authenticated browser QA confirming both chevrons, the classroom list, and multi-session term groups.
- Related changes: `apps/dashboard/src/components/classroom-select-trigger.tsx`, `apps/dashboard/src/components/sheets/classroom-overview-sheet.tsx`, `apps/dashboard/src/components/sidebar/term-switcher.tsx`, `apps/dashboard/src/components/sidebar/term-switcher-model.ts`, `.brain/features/attendance.md`, `.brain/features/academic-term-lifecycle-and-rollover.md`, `.brain/bugs/2026-07-26-classroom-and-term-switcher-affordances.md`
- Owner: Codex

## Completed Task

- ID: 2026-07-26-classroom-filter-list-and-responsive-actions
- Title: Classroom View Filter And Responsive Action Menu
- Completed: 2026-07-26
- Outcome: Moved Stream/Class view selection into the classroom search-filter menu, restored a usable classroom filter list, rendered human-readable active filter tags, and collapsed Add Classroom plus Import from Session into a More menu at the medium breakpoint and below.
- Validation: Focused shared filter-label regression test, dashboard and shared UI package typechecks, plus authenticated live browser verification at desktop and 768 × 900 responsive sizes.
- Related changes: `apps/dashboard/src/components/classroom-header.tsx`, `apps/dashboard/src/hooks/use-classroom-filter-params.ts`, `packages/ui/src/components/custom/search-filter/filter-list.tsx`, `packages/ui/src/components/custom/search-filter/filter-label.ts`, `.brain/features/academic-structure-engine.md`, `.brain/bugs/2026-07-26-classroom-filter-list-and-responsive-actions.md`
- Owner: Codex

## Completed Task

- ID: 2026-07-26-attendance-mobile-responsive-ui
- Title: Mobile-Responsive Classroom Attendance
- Completed: 2026-07-26
- Outcome: Replaced the phone-sized attendance table with touch-friendly student cards, made date and attendance actions fit narrow screens, and added responsive mobile cards for saved sessions and recorded-session details while preserving desktop tables.
- Validation: Focused attendance and populated responsive-session fixture tests plus dashboard typecheck passed; authenticated browser QA at 320 × 800, 390 × 844, and 1280 × 900 confirmed no document or classroom-dialog horizontal overflow and exercised mobile status selection and remark entry without saving.
- Related changes: `apps/dashboard/src/components/classroom-attendance-roster.tsx`, `apps/dashboard/src/components/classroom-attendance-form.tsx`, `apps/dashboard/src/components/classroom-attendance-session-lists.tsx`, `apps/dashboard/src/components/classroom-attendance-session-lists.test.tsx`, `apps/dashboard/src/components/classroom-attendance.tsx`, `.brain/features/attendance.md`, `.brain/bugs/2026-07-26-attendance-mobile-overflow.md`
- Owner: Codex

## Completed Task

- ID: 2026-07-26-classroom-list-level-ordering
- Title: Standardize Classroom And Department Level Ordering
- Completed: 2026-07-26
- Outcome: Centralized class and classroom-department ordering in the database package and applied the level-first contract to API, academic setup, student, staff, assessment, enrollment, finance, dashboard action/cache, and AI classroom-list producers. Configured class and department levels sort before unranked records, with deterministic name/id tie-breakers.
- Validation: Three focused ordering tests, database/dashboard/AI package typechecks, and both Standards/Spec review axes pass. The repository suite completed with 343 passes and its existing six failures plus one Playwright configuration error; the API typecheck reaches only the two pre-existing academic-term reset/setup errors, and the broad Turbo typecheck remains blocked by pre-existing Jobs/shared strictness failures.
- Related changes: `packages/db/src/classroom-order.ts`, `apps/api/src/db/queries/classroom.ts`, `apps/api/src/trpc/routers/classroom.routes.ts`, `apps/dashboard/src/actions/get-class-rooms.ts`, `packages/ai/src/tools/students.ts`, `.brain/features/academic-structure-engine.md`, `.brain/api/contracts.md`, `.brain/api/endpoints.md`, `.brain/decisions/ADR-0017-centralized-classroom-level-ordering.md`, `.brain/bugs/2026-07-26-classroom-list-level-ordering.md`
- Owner: Codex
