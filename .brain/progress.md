# Progress

## Marketing App Rename (2026-07-12)

### Completed

- Renamed the SaaS marketing app workspace from `apps/web` / `@school-clerk/site` to `apps/marketing` / `@school-clerk/marketing`.
- Updated root build filters and dev-router tests to use the new `marketing` shorthand and package name.
- Refreshed the Bun workspace lockfile so the marketing package resolves from `apps/marketing`.
- Updated active Brain architecture and repository-structure docs to use the new marketing app name while leaving `apps/school-site`, `@school-clerk/school-site`, and `packages/site-nav` unchanged.

### Changed Files

- `apps/marketing/package.json`
- `package.json`
- `bun.lock`
- `scripts/dev.test.ts`
- `.brain/PROJECT_INDEX.md`
- `.brain/system/overview.md`
- `.brain/system/architecture.md`
- `.brain/engineering/repo-structure.md`
- `.brain/engineering/ai-rules.md`
- `.brain/engineering/shadcn-base-migration-guide.md`
- `.brain/database/migrations.md`
- `.brain/decisions/ADR-0001-baseline-system-stack-and-layered-architecture.md`
- `.brain/progress.md`

### Verification

- `bun install`
- `bun test scripts/dev.test.ts`
- `git diff --check -- package.json bun.lock scripts/dev.test.ts apps/marketing/package.json .brain/PROJECT_INDEX.md .brain/system/overview.md .brain/system/architecture.md .brain/engineering/repo-structure.md .brain/engineering/ai-rules.md .brain/database/migrations.md .brain/engineering/shadcn-base-migration-guide.md`
- `bun --filter @school-clerk/marketing build` was attempted but stayed silent for several minutes and was interrupted.

## Vercel DB Package Build Fix (2026-07-12)

### Completed

- Fixed the Vercel dashboard build failure in `@school-clerk/db:build` caused by stale `@ts-expect-error` comments on `bun:test` imports in DB package test files.
- Removed the obsolete suppressions from the staff academic access DB tests.
- Added explicit `bun-types` coverage to `packages/db` so local and Vercel TypeScript compilers resolve `bun:test` consistently.

### Changed Files

- `packages/db/src/staff-academic-access.test.ts`
- `packages/db/src/staff-academic-access-assignments.test.ts`
- `packages/db/package.json`
- `packages/db/tsconfig.json`
- `bun.lock`
- `.brain/engineering/ai-rules.md`
- `.brain/progress.md`

### Verification

- `bun test packages/db/src/staff-academic-access.test.ts packages/db/src/staff-academic-access-assignments.test.ts`
- `bun --env-file=.env.local --filter @school-clerk/db build` was attempted and got past Prisma generation without the original stale `@ts-expect-error` diagnostics, but local TypeScript did not return promptly and was interrupted.
- A targeted TypeScript compile was also attempted for the two affected test files, but it did not return promptly and was interrupted.

## Student Import Production Error Hardening (2026-07-12)

### Completed

- Added dashboard-side normalization for student import verification, batch execution, and single-row execution errors so HTML/non-JSON responses show a recoverable `Import needs attention` message instead of raw JSON parse text.
- Preserved the last successful verification report after a failed retry so staged rows, row decisions, checked state, manual gender choices, and match selections remain available for retry or cancellation.
- Added a row-level `Import row` action that validates one review row with the same classroom/gender/action/match rules as batch execution, submits only that row to `students.executeStudentImport`, marks successful rows imported, and leaves the rest of the staged review untouched.
- Converted import classroom/session validation failures in `verifyStudentImport` and `executeStudentImport` from plain `Error` throws into structured `TRPCError` responses.
- Verified production-like local tenant routing for `students.verifyStudentImportBatch` and `students.executeStudentImport` on `crestview-03553.school-clerk-dashboard.localhost:2200`: valid authenticated POST requests returned `application/json`, realistic 20-row verification returned tRPC JSON, single-row execution returned tRPC JSON, invalid classroom payloads returned JSON tRPC errors, and unauthenticated invalid verification still returned JSON instead of an HTML page.

### Changed Files

- `apps/api/src/db/queries/students.ts`
- `apps/api/src/db/queries/students.test.ts`
- `apps/dashboard/src/components/modals/student-import/import-activities.tsx`
- `apps/dashboard/src/components/modals/student-import/import-errors.ts`
- `apps/dashboard/src/components/modals/student-import/import-errors.test.ts`
- `brain/api/contracts.md`
- `brain/features/student-import.md`
- `brain/progress.md`
- `brain/tasks/done.md`

### Verification

- `bun test apps/api/src/db/queries/students.test.ts apps/dashboard/src/components/modals/student-import/import-errors.test.ts apps/dashboard/src/components/modals/student-import/parser.test.ts`
- `bun --filter @school-clerk/api typecheck`
- `bun --filter @school-clerk/dashboard typecheck`
- Direct `fetch` checks against `http://crestview-03553.school-clerk-dashboard.localhost:2200/api/trpc/...` using Better Auth API sign-in plus `Authorization` and `x-ttss-id` headers for the active school/session/term.

## Grouped Assessment Print Modes (2026-07-12)

### Completed

- Added persisted grouped assessment print modes with `ClassroomSubjectAssessment.printMode`, backed by the `ClassroomSubjectAssessmentPrintMode` enum and a default of `EXPANDED`.
- Added a migration for the new print-mode enum/column and regenerated the Prisma client.
- Extended `saveAssessement` to accept `printMode: "expanded" | "total"` and persist grouped parent rows as `EXPANDED` or `TOTAL`.
- Exposed parent assessment `id`, `index`, and `printMode` through classroom report sheet data.
- Student result browser print and PDF generation now collapse weighted child scores into one parent total column when the grouped parent is set to total mode, while expanded mode keeps child columns.
- Hardened assessment writes so grouped parent rows cannot receive direct scores and child assessment IDs cannot be reparented through a grouped assessment save payload.
- Added a shared printable-column preview helper and rendered the exact result-print columns in the subject assessment manager.
- Browser-verified the grouped total-mode workflow on local Crestview using a seeded `Codex Print Total Smoke` parent with `Codex Oral Child` and `Codex Written Child`: the assessment manager preview showed the parent print column only, and the student report print table rendered `Codex Print Total Smoke(30)` without child columns.

### Changed Files

- `packages/db/src/schema/assessment.prisma`
- `packages/db/src/schema/migrations/20260712133000_assessment_print_modes/migration.sql`
- `packages/jobs/src/schema.prisma`
- `packages/assessment-results/src/index.ts`
- `packages/assessment-results/src/index.test.ts`
- `apps/api/src/db/queries/assessments.ts`
- `apps/api/src/db/queries/assessments.test.ts`
- `apps/api/src/db/queries/report-sheet.ts`
- `apps/api/src/db/queries/report-sheet.test.ts`
- `apps/api/src/db/queries/subjects.ts`
- `apps/dashboard/src/components/forms/assessment-form.tsx`
- `apps/dashboard/src/components/subject-assessments.tsx`
- `apps/dashboard/src/features/student-report/report-model.ts`
- `apps/dashboard/src/features/student-report/report-model.test.ts`
- `brain/api/contracts.md`
- `brain/api/endpoints.md`
- `brain/database/schema.md`
- `brain/database/migrations.md`
- `brain/features/assessment-results-and-sub-assessments.md`
- `brain/tasks/in-progress.md`
- `brain/progress.md`

### Verification

- `bun run db:generate`
- `bun test packages/assessment-results/src/index.test.ts apps/dashboard/src/features/student-report/report-model.test.ts apps/api/src/db/queries/report-sheet.test.ts apps/api/src/db/queries/assessments.test.ts`
- `bun --filter @school-clerk/assessment-results typecheck`
- `bun --filter @school-clerk/api typecheck`
- `bun --filter @school-clerk/dashboard typecheck`
- `bun --filter @school-clerk/db typecheck`
- `bun --filter @school-clerk/jobs typecheck` was attempted but is blocked by existing unrelated `@jobs/schema` module-resolution and NodeNext extension errors.
- `bunx playwright test .codex/tmp/asmt-print-mode-smoke.spec.ts --reporter=line --timeout=120000`

## Assessment Print Status Warnings (2026-07-12)

### Completed

- Added shared assessment print-status helpers that derive printable weight, print label, and warnings from standalone or grouped assessment data.
- The assessment create/edit form now shows live print badges and warnings for zero-weight standalone assessments, grouped assessments with no printable child weight, and zero-weight children.
- The saved assessment list now shows `Print column`, `Print expanded`, `No print`, and `0% weight` badges where applicable, plus warning text for configurations that will not appear on printed results.
- Child rows in grouped assessments now mark zero-weight children as `No print`.

### Changed Files

- `packages/assessment-results/src/index.ts`
- `packages/assessment-results/src/index.test.ts`
- `apps/dashboard/src/components/forms/assessment-form.tsx`
- `apps/dashboard/src/components/subject-assessments.tsx`
- `brain/features/assessment-results-and-sub-assessments.md`
- `brain/tasks/in-progress.md`
- `brain/progress.md`

### Verification

- `bun test packages/assessment-results/src/index.test.ts apps/dashboard/src/features/student-report/report-model.test.ts`
- `bun --filter @school-clerk/assessment-results typecheck`
- `bun --filter @school-clerk/dashboard typecheck`

## Assessment Parent-Child Display Labels (2026-07-12)

### Completed

- Reused the shared assessment display-title helper in classroom result review and assessment recording tables.
- CSV export, printed classroom spreadsheets, blank manual spreadsheets, classroom result review headers, and assessment recording headers now show child assessments with parent context, for example `Exam - Oral`.
- Kept score IDs, saving behavior, filtering, and total calculations unchanged.

### Changed Files

- `apps/dashboard/src/components/classroom-result-table.tsx`
- `apps/dashboard/src/components/assessment-recording-results-table.tsx`
- `brain/features/assessment-results-and-sub-assessments.md`
- `brain/tasks/in-progress.md`
- `brain/progress.md`

### Verification

- `rg -n "assessment\\.title" apps/dashboard/src/components/classroom-result-table.tsx apps/dashboard/src/components/assessment-recording-results-table.tsx apps/dashboard/src/features/student-report/report-model.ts`
- `bun --filter @school-clerk/dashboard typecheck`

## Student Result Printable Assessment Filtering (2026-07-12)

### Completed

- Added a shared `isPrintableAssessment` predicate for result assessment output.
- Updated the student report model used by browser print and PDF generation to omit assessments with missing or zero `percentageObtainable`.
- Student result print/PDF output now hides subjects that have no printable assessment columns, and grade totals/percentages are computed from printable weighted columns only.
- Added regression coverage for printable assessment detection and student report table/grade generation.

### Changed Files

- `packages/assessment-results/src/index.ts`
- `packages/assessment-results/src/index.test.ts`
- `apps/dashboard/src/features/student-report/report-model.ts`
- `apps/dashboard/src/features/student-report/report-model.test.ts`
- `brain/features/assessment-results-and-sub-assessments.md`
- `brain/tasks/in-progress.md`
- `brain/progress.md`

### Verification

- `bun test packages/assessment-results/src/index.test.ts apps/dashboard/src/features/student-report/report-model.test.ts`
- `bun --filter @school-clerk/assessment-results typecheck`
- `bun --filter @school-clerk/dashboard typecheck`
- `git diff --check -- packages/assessment-results/src/index.ts packages/assessment-results/src/index.test.ts apps/dashboard/src/features/student-report/report-model.ts apps/dashboard/src/features/student-report/report-model.test.ts`

## Assessment Report Sheet Assessment Ordering (2026-07-12)

### Completed

- Made classroom report sheet assessment loading preserve configured assessment order explicitly by sorting scoreable assessments by `index` and then `id`.
- Added report-sheet query test coverage asserting the assessment `orderBy` contract is present alongside teacher subject-scope filtering.

### Changed Files

- `apps/api/src/db/queries/report-sheet.ts`
- `apps/api/src/db/queries/report-sheet.test.ts`
- `brain/progress.md`

### Verification

- `bun test apps/api/src/db/queries/report-sheet.test.ts`
- `bun --filter @school-clerk/api typecheck`

## Batch Classroom Student Import Review Assignment (2026-07-12)

### Completed

- Added per-row classroom assignment controls to the student import review cards.
- Added an explicit import mode on the modal start screen: `Single` requires a classroom and disables classroom-header parsing, while `Multiple` keeps raw classroom headers and row-level assignment.
- Row classroom overrides now feed back into verification, so same-classroom match metadata and execution payloads use the corrected target classroom.
- Rows without a resolved classroom now stay in `Needs attention` instead of appearing as ready imports.
- Ambiguous classroom sections now require explicit row assignment instead of inheriting the fallback classroom.
- Parsed rows now carry explicit `classroomResolutionStatus` metadata for resolved, missing, and ambiguous classroom states.
- Added classroom scope summaries in review and execution states with total, checked, executable, and attention counts per classroom.
- Added parser coverage for multi-classroom headers, ambiguous classroom labels, batch gender markers, explicit row gender overrides, and rows pasted before any classroom header.
- Added API coverage proving `verifyStudentImport` computes same-classroom metadata from each row target and `executeStudentImport` creates matched-student term sheets in each row target classroom.
- Browser-smoked the student import start screen on `daarulhadith.localhost:2200` with an authenticated admin context: the modal opens from `/students/list?action=student-import`, `Single` mode blocks submit until a classroom is selected, and `Multiple` mode parses a two-classroom pasted batch to `2 students` after classroom data loads.
- Browser-smoked the full multi-classroom review-to-execution path on the same tenant. Smoke run `60856831` imported two unique students across two classroom headers, reached `Import complete`, reported `NEW CREATED 2`, `TERM SHEETS 2`, and `ERRORS 0`, and was confirmed in the remote-dev DB with one current term form per created student in different classroom departments.

### Changed Files

- `apps/dashboard/src/components/modals/student-import/import-activities.tsx`
- `apps/dashboard/src/components/modals/student-import/index.tsx`
- `apps/dashboard/src/components/modals/student-import/parser.test.ts`
- `apps/api/src/db/queries/students.test.ts`
- `brain/features/student-import.md`
- `brain/tasks/in-progress.md`
- `brain/tasks/done.md`
- `brain/progress.md`

### Verification

- `bun test apps/dashboard/src/components/modals/student-import/parser.test.ts`
- `bun test apps/api/src/db/queries/students.test.ts`
- `bun test apps/dashboard/src/components/modals/student-import/parser.test.ts apps/api/src/db/queries/students.test.ts`
- `bun --filter @school-clerk/dashboard typecheck`
- `bun --filter @school-clerk/api typecheck`
- Playwright smoke against `http://daarulhadith.localhost:2200/students/list?action=student-import` using Better Auth API sign-in plus the tenant workspace cookie. The only earlier console noise observed in login-path experiments was the pre-existing login form hydration mismatch; the final modal smoke reported no non-hydration console errors.
- Playwright execution smoke against `http://daarulhadith.localhost:2200/students/list?action=student-import` using the same authenticated-cookie setup. It verified upload, review, execution completion, classroom summary, created-student count, term-sheet count, and zero-error summary for run `60856831`.
- Remote-dev DB verification queried smoke run `60856831` and confirmed `CodexSmoke60856831 Alpha` and `CodexProof60856831 Beta` exist with `Male`/`Female` gender values and current term forms in two different `classroomDepartmentId` values.

## Dashboard Session Persistence Recovery (2026-07-12)

### Completed

- Added proxy-side tenant workspace cookie recovery for requests that still have a valid Better Auth session but have lost or malformed the tenant `{subdomain}-session-cookie`.
- Recovered workspace cookies are injected into the current request headers and written back to the browser, so protected dashboard pages can load without sending the user through the recovery screen or another login.
- Kept remembered-device behavior aligned with the 30-day Better Auth session and tenant workspace cookie lifetime.

### Changed Files

- `apps/dashboard/src/proxy.ts`
- `apps/dashboard/src/actions/cookies/auth-cookie.ts`
- `apps/dashboard/src/app/[domain]/(auth)/login/actions.ts`
- `apps/dashboard/src/app/[domain]/(auth)/login/client.tsx`
- `packages/auth/src/index.ts`
- `brain/api/permissions.md`
- `brain/progress.md`

### Verification

- `bun --filter @school-clerk/dashboard typecheck`
- `bun --filter @school-clerk/auth typecheck`
- `git diff --check -- apps/dashboard/src/proxy.ts apps/dashboard/src/actions/cookies/auth-cookie.ts packages/auth/src/index.ts 'apps/dashboard/src/app/[domain]/(auth)/login/actions.ts' 'apps/dashboard/src/app/[domain]/(auth)/login/client.tsx'`

## Shared Report Roster Sorting And Gender Controls (2026-07-12)

### Completed

- Added shared assessment-result roster ordering so report/recording student lists default to `Male` first, then `Female`, with alphabetic display names inside each gender group.
- Added a compact dashboard Gender cell and wired it into assessment recording and classroom result review tables near the sticky student identity columns.
- Gender updates now invalidate/refetch report data so the visible value and default roster order refresh after correction.
- Hardened `students.changeGender` from a public, raw-id update into an authenticated, tenant-scoped mutation restricted to `ADMIN`, `Admin`, and `Registrar` roles.

### Changed Files

- `packages/assessment-results/src/index.ts`
- `apps/dashboard/src/components/student-gender-cell.tsx`
- `apps/dashboard/src/components/assessment-recording-results-table.tsx`
- `apps/dashboard/src/components/classroom-result-table.tsx`
- `apps/api/src/db/queries/students.ts`
- `apps/api/src/trpc/routers/students.routes.ts`
- `brain/features/assessment-results-and-sub-assessments.md`
- `brain/api/permissions.md`
- `brain/progress.md`

### Verification

- `bun test packages/assessment-results/src/index.test.ts apps/api/src/db/queries/students.test.ts`
- `bun --filter @school-clerk/dashboard typecheck`
- `bun --filter @school-clerk/api typecheck`
- `bun --filter @school-clerk/assessment-results typecheck`
- Browser smoke on `crestview-03553.school-clerk-dashboard.localhost:2200` verified assessment recording and classroom report tables render the Gender column, keep score cells aligned, expose three gender controls for the test classroom, move a changed `Male` student to the top of the roster, restore the original order after changing the student back to `Female`, and move sticky student/gender columns correctly between LTR and RTL report layouts. The only browser console error observed was the pre-existing login form hydration mismatch.

## Student Report Classroom Overview CTAs (2026-07-09)

### Completed

- Added an "Open classroom overview" CTA to the student report unavailable state.
- Wired unavailable reports to open the existing classroom overview side sheet on the Subjects tab.
- Added a "Classroom Overview" CTA to the visible classroom result table controls, opening the same side sheet on the Students tab.

### Changed Files

- `apps/dashboard/src/app/[domain]/(sidebar)/(student-result-portal)/student-report/student-report-view.tsx`
- `apps/dashboard/src/components/classroom-result-table.tsx`
- `brain/features/assessment-results-and-sub-assessments.md`
- `brain/progress.md`

### Verification

- `bun --filter @school-clerk/dashboard typecheck`

## Mobile Analytics Section Visibility (2026-06-17)

### Completed

- Hid analytics/stat card sections below the `md` breakpoint on non-dashboard pages, while preserving dashboard analytics sections.
- Applied the responsive behavior to student, staff, teacher workspace, finance/account, attendance, assessment, academic progression, promotion, and school profile stat sections.

### Changed Files

- `apps/dashboard/src/components/**`
- `apps/dashboard/src/app/[domain]/(sidebar)/**`

### Verification

- Lightweight diff inspection only. Project-wide typecheck and browser verification were not run in this pass.

## Student Import Follow-Up Refinements (2026-06-17)

### Completed

- Updated student import parsing so comma- or dot-delimited name parts map deterministically to `name`, `surname`, and `otherName`, while preserving recognized final gender aliases such as `M`, `F`, `Male`, and `Female`.
- Replaced global and manual row gender selects with compact `M` / `F` toggle controls mapped to canonical `Male` / `Female` values.
- Added parsed name-part chips in the review rows, kept no-match rows defaulted to `Import new`, disabled `Skip` for no-match rows, and added a pre-execution `Cancel Import` path back to the initial import screen.
- Marked the follow-up refinement plan and roadmap task as done.

### Changed Files

- `apps/dashboard/src/components/modals/student-import/index.tsx`
- `apps/dashboard/src/components/modals/student-import/import-activities.tsx`
- `brain/features/student-import.md`
- `brain/plans/2026-06-13-ux-ui-student-import-follow-up-refinements.md`
- `brain/tasks/roadmap.md`
- `brain/tasks/done.md`

### Verification

- Lightweight diff inspection only. Project-wide typecheck was not run in this pass.

## Assessment Recording Fallback Context And Current Term Selection (2026-06-15)

### Completed

- Added a fallback selector state to `/assessment-recording` so bare sidebar links can recover by selecting a term and classroom instead of rendering a broken assessment table state.
- Made assessment recording use the workspace-selected term automatically when `termId` is missing from the URL, while still preserving explicit `termId` deep links.
- Guarded classroom loading until a term is available, preventing empty term queries from running on the assessment recording page.
- Updated dashboard current-term detection to prefer terms whose start/end dates contain today, fall back to started terms without an end date, and ignore terms without a start date.
- Added dashboard shell bootstrap behavior that auto-selects the dated current term when the authenticated workspace has no term selected.

### Changed Files

- `apps/dashboard/src/components/assessment-recording.tsx`
- `apps/dashboard/src/components/nav-layout-client.tsx`
- `apps/dashboard/src/actions/cookies/auth-cookie.ts`
- `apps/api/src/trpc/routers/academics.routes.ts`
- `brain/features/assessment-results-and-sub-assessments.md`

### Verification

- `git diff --check`
- `bun --filter @school-clerk/dashboard typecheck` still fails on existing baseline errors outside the changed files, including finance transaction-client types, missing `toMoney` utilities, legacy sidebar `LinkItem` shape issues, and unrelated classroom/finance form types.

## Production-To-Local Database Import Tooling (2026-06-15)

### Completed

- Added a GND-style production-to-local database sync command for SchoolClerk's PostgreSQL database.
- Implemented dry-run, single-table sync, cursor reset, static table refresh, cursor state, local target safety checks, and batched upsert behavior.
- Updated the importer to temporarily disable triggers on all local target tables during table-by-table image imports, then restore them before disconnecting.
- Updated raw upserts to cast values to the target PostgreSQL column type so enum-backed columns import correctly.
- Updated value normalization to preserve native PostgreSQL arrays while still serializing JSON/JSONB payloads correctly.
- Added default local tenant domain normalization so imported production data resolves through local dashboard hosts such as `<tenant>.school-clerk-dashboard.localhost`.
- Wired root commands: `db:update:local`, `db:update:local:dry-run`, `db:update:local:reset`, `db:sync:prod-to-local`, `db:sync:prod-to-local:dry-run`, and `db:sync:prod-to-local:table`.

### Changed Files

- `packages/db/src/local-sync.ts`
- `packages/db/scripts/sync-prod-to-local.ts`
- `packages/db/package.json`
- `package.json`
- `.gitignore`
- `brain/database/migrations.md`
- `brain/tasks/done.md`

## Student Import Input And Name Parsing (2026-06-12)

### Completed

- Redesigned the student import modal interface to include a Target Classroom department selector and an optional Global Gender selector.
- Replaced the comma-based parsing rule with a robust deterministic parser that splits name tokens into `name`, `surname`, and `otherName` while identifying explicit row gender and global gender fallbacks.
- Provided real-time UI validation and warning feedback (line numbers, missing surnames, unrecognized genders) directly below the data entry area.
- Gated the form submission to require a target classroom selection before proceeding to the verification activity.
- Preserved existing raw text local storage persistence.
- Prevented silent defaulting of missing gender values to `Female` inside the matched student resolution logic.

### Changed Files

- `apps/dashboard/src/components/modals/student-import/index.tsx`
- `apps/dashboard/src/components/modals/student-import/import-activities.tsx`
- `brain/features/student-import.md`

### Verification

- Ran TypeScript compile checks for the dashboard application (`bun --filter @school-clerk/dashboard typecheck` and direct tsc compilation).

### Fix 1 (2026-06-12) — Input & Name Parsing Compilation and Data Flow

- Fixed TS compilation error by correctly referencing `activity.student.gender` inside `import-activities.tsx`.
- Extended the student schema to carry `classroomDepartmentId` from the input select, mapping the created activity directly to the classroom without brittle display-name matching.
- Changed the empty global gender dropdown value to `"unset"`.
- Preserved missing gender logic, sending `undefined` in updates rather than silently mapping to `"Female"`.
- Reverted unrelated Brain API doc edits.

### Fix 2 (2026-06-13) — Formatting & Schema Documentation

- Removed trailing blank line at EOF in `index.tsx` so `git diff --check` passes cleanly.
- Explicitly documented in `brain/features/student-import.md` that `student.gender` acts as the canonical effective input gender, while `student.parsedGender` retains the exact row-level value.

## Admin Empty Classroom Report Spreadsheet Print (2026-06-12)

### Completed

- Added client-side role checks using the `useAuth` hook in [classroom-result-table.tsx](file:///Users/M1PRO/Documents/code/school-clerk/apps/dashboard/src/components/classroom-result-table.tsx).
- Gated the new "Print Empty Sheet" action to users with the `ADMIN` role.
- Implemented the `printEmptySpreadsheet` callback to render student names and assessment/subject headers while keeping all score, total, grand total, and percentage cells empty for manual paper record-keeping.
- Developed a professional paper-friendly print layout in landscape mode with a polished double-bordered school header, metadata grid (Classroom, Session, Term, Print Date, and Mode), and repeated table headers on page break.
- Preserved the existing filled "Print Spreadsheet" and "Export Excel" functionalities completely unchanged.

### Changed Files

- [classroom-result-table.tsx](file:///Users/M1PRO/Documents/code/school-clerk/apps/dashboard/src/components/classroom-result-table.tsx) — Added `useAuth` integration, configs import, admin-only button, and blank print callback.

### Verification

- Dashboard typecheck run successfully with no new errors in the changed file.

## Staff Classroom Report Sheet Access (2026-06-12)

### Completed

- Added `allowedClassroomIds` prop to `StudentReportFilter` to constrain classroom dropdown
- Created `TeacherReportSheet` client component wrapping `ReportPageProvider`, `StudentReportFilter`, and `ClassroomResultTable`
- Updated teacher reports page (`/teacher/reports`) to render the full classroom report sheet with classroom constraint
- Updated academic reports page (`/academic/reports`) from "Coming soon" to the report sheet workflow (no classroom constraint for admin staff)
- Teacher authorization for classroom access preserved via existing `assertTeacherCanAccessClassroomDepartment` in `report-sheet.ts`
- Score editing, assessment management, print, export, and filter controls all reused from existing `ClassroomResultTable` without duplication

### Changed Files

- `apps/dashboard/src/components/student-report-filters.tsx` — added `allowedClassroomIds` prop
- `apps/dashboard/src/components/teachers/teacher-report-sheet.tsx` — new reusable report sheet shell
- `apps/dashboard/src/app/[domain]/(sidebar)/(k-12-teachers)/teacher/reports/page.tsx` — wired to report sheet
- `apps/dashboard/src/app/[domain]/(sidebar)/academic/reports/page.tsx` — replaced "Coming soon"

### Verification

- Dashboard and API typechecks run; no new errors in changed files
- Pre-existing type errors in unrelated files (finance, Prisma client compat, sidebar) remain as documented in `brain/tasks/in-progress.md`

### Fix 1 (2026-06-12) — Classroom Default Selection & Invalid State Guard

- `TeacherReportSheet` now seeds `departmentId` to first assigned classroom on mount when no classroom is selected
- Invalid `departmentId` (not in allowed list) is automatically cleared or replaced with first assigned classroom
- Teachers with zero assigned classrooms get an empty classroom dropdown (not unrestricted)
- Result Entry link is hidden when classroom or term is missing/invalid
- Changed files:
  - `apps/dashboard/src/components/teachers/teacher-report-sheet.tsx` — split inner/outer for provider context, added seed/clear effects
  - `apps/dashboard/src/components/student-report-filters.tsx` — added `isResultEntryAllowed` guard
  - `apps/dashboard/src/app/[domain]/(sidebar)/(k-12-teachers)/teacher/reports/page.tsx` — always passes array (no `undefined` fallback)

### Fix 2 (2026-06-12) — Restore Default Term Query-State Seeding

- Restored `termId` seeding from `defaultTermId` into `filters.termId` in `TeacherReportSheetInner`
- Term seed runs before classroom seed; both apply on first mount
- Result Entry link now appears when valid classroom + default term are present
- `TeacherReportSheet` now seeds `departmentId` to first assigned classroom on mount when no classroom is selected
- Invalid `departmentId` (not in allowed list) is automatically cleared or replaced with first assigned classroom
- Teachers with zero assigned classrooms get an empty classroom dropdown (not unrestricted)
- Result Entry link is hidden when classroom or term is missing/invalid
- Changed files:
  - `apps/dashboard/src/components/teachers/teacher-report-sheet.tsx` — split inner/outer for provider context, added seed/clear effects
  - `apps/dashboard/src/components/student-report-filters.tsx` — added `isResultEntryAllowed` guard
  - `apps/dashboard/src/app/[domain]/(sidebar)/(k-12-teachers)/teacher/reports/page.tsx` — always passes array (no `undefined` fallback)

### Review Approval (2026-06-12)

- Codex reviewed Fix 2 and approved Staff Classroom Report Sheet Access.
- Queue item approved: `/Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-school-clerk-staff-report-sheet-access.json`
- Review file: `brain/reviews/2026-06-12-staff-classroom-report-sheet-access-review-v3.md`
- Active fix handoff moved to: `brain/handoffs/completed/2026-06-12-staff-classroom-report-sheet-access-fix-2.md`
- Remaining caveat: full dashboard/API typechecks still have known unrelated baseline failures; focused code review and `git diff --check` passed.

### Fix 1 (2026-06-12) — Admin Empty Print: Role Gate Fix

- Expanded `isAdmin` gate in `classroom-result-table.tsx` from `role === "ADMIN"` (SaaS owner only) to `role === "ADMIN" || role === "Admin"` (owners + school admins)
- Code inspection confirms: blank cells regardless of existing scores, filled print unchanged, non-admin gate working, landscape print CSS, proper school/classroom/term/date/mode header
- Full browser/print verification pending stable dev server with test data

### Fix 2 (2026-06-13) — Admin Empty Print: Docs Alignment & Blocked Verification

- Updated `brain/api/permissions.md` to accurately align with the implemented `ADMIN` and `Admin` role gate for the empty print sheet.
- Attempted to run browser verification but lacked test credentials and populated data to test visually.
- Marked work as `blocked` in queue so a human or authenticated agent can complete the final verification.

### Final Landing (2026-06-15)

- Landed the existing empty print implementation and permission documentation on `main`.
- Browser/print verification was explicitly skipped by user instruction for this landing pass.
- Completion evidence is code/documentation inspection: `Print Empty Sheet` remains restricted to `ADMIN` and `Admin`, prints student names and assessment headers, and leaves score/total/percentage cells blank.

## Assessment Recording Page Polish (2026-06-15)

### Completed

- Removed the assessment recording header subject selector so the page focuses on classroom context and score entry.
- Reduced mobile horizontal padding and made the fixed header wrap/truncate long classroom names without clipping.
- Defaulted the score-entry table to the first loaded subject when no explicit `deptSubjectId` is present, while preserving explicit subject links.
- Removed subject total columns from the assessment recording score-entry table and added the cue: "Click a subject to update assessments."
- Browser/manual verification was skipped by user instruction.

### Changed Files

- `apps/dashboard/src/components/assessment-recording.tsx`
- `apps/dashboard/src/components/assessment-recording-results-table.tsx`
- `brain/features/assessment-results-and-sub-assessments.md`

## Student Report Workspace Cleanup (2026-06-15)

### Completed

- Removed the live Print View tab from the student report workspace and opened the page directly into Classroom Results.
- Kept print rendering available through the print-only report output and selection footer.
- Changed the default student-report tab query state to `classroom-results`.
- Restricted the Assessment Recording CTA to staff/teacher contexts with an allowed classroom and valid term, hiding it from the general admin report view.
- Shortened the classroom result table header copy.
- Browser/manual verification was skipped by user instruction.

### Changed Files

- `apps/dashboard/src/app/[domain]/(sidebar)/(student-result-portal)/student-report/student-report-view.tsx`
- `apps/dashboard/src/hooks/use-student-report-filter-params.ts`
- `apps/dashboard/src/components/student-report-filters.tsx`
- `apps/dashboard/src/components/classroom-result-table.tsx`

## GND-Style Sidebar Refresh (2026-06-15)

### Completed

- Ported the isolated sidebar refresh into `main`.
- Updated the desktop sidebar to the wider GND-style collapsed/expanded rail, faster hover expansion, sidebar color tokens, subtle dividers, and stronger active module styling.
- Updated nav list spacing, keys, section labels, active module expansion, and link selection propagation.
- Aligned the sidebar shell offset with the new collapsed rail width.
- Added the missing dashboard header account avatar dropdown with a logout action.
- Updated the mobile sidebar to use the refreshed site-nav drawer, SchoolClerk logo, registry-backed nav list, link-close behavior, and bottom user account menu.
- Verified the shared site-nav package typecheck. Authenticated browser verification could not be completed because the local database was unavailable at `localhost:55432`; the tenant login host still resolved.

### Changed Files

- `apps/dashboard/src/components/header.tsx`
- `apps/dashboard/src/components/header-user-menu.tsx`
- `apps/dashboard/src/components/nav-layout-client.tsx`
- `packages/site-nav/src/components/mobile-sidebar.tsx`
- `packages/site-nav/src/components/sidebar.tsx`
- `packages/site-nav/src/components/sidebar-shell.tsx`
- `packages/site-nav/src/components/navs-list.tsx`
- `packages/site-nav/src/components/user.tsx`
- `packages/site-nav/src/components/use-site-nav.tsx`

## Teacher Report Link Target (2026-06-15)

### Completed

- Changed teacher-facing Reports navigation and workspace shortcuts to open `/assessment-recording` instead of the report review workflow.
- Kept the existing `/teacher/reports` page in place for direct/backward-compatible access.

### Changed Files

- `apps/dashboard/src/features/navigation/dashboard-nav-registry.ts`
- `apps/dashboard/src/sidebar/utils.ts`
- `apps/dashboard/src/components/teachers/workspace-pages.tsx`

## Student Import Verification and Matching Service (2026-06-12)

### Completed

- Implemented an optimized backend procedure `students.verifyStudentImport` in `apps/api/src/db/queries/students.ts` to verify an entire batch of pasted students in a single network call.
- Validated that the target classroom department belongs to the active institution/session.
- Implemented missing gender inference based on existing student records with the same normalized first name (requires confidence >= 80% and at least 2 samples).
- Classified matches into exact (`fullMatch`, confidence = 100) and typos/close matches (`suspectedMatches`, distance <= 2).
- Registered the endpoint in the tRPC router `apps/api/src/trpc/routers/students.routes.ts`.
- Reworked the import modal UI `apps/dashboard/src/components/modals/student-import/import-activities.tsx` to invoke the new single-query tRPC verification endpoint, auto-selecting the target classroom department from the pasted data context, showing a target classroom select dropdown, and listing matches/suspected typos inline with actionable check/link buttons.
- Handled manual gender selection inline if gender is required and could not be inferred.

### Changed Files

- `apps/api/src/db/queries/students.ts`
- `apps/api/src/trpc/routers/students.routes.ts`
- `apps/dashboard/src/components/modals/student-import/import-activities.tsx`
- `brain/api/endpoints.md`
- `brain/api/contracts.md`

### Verification

- Ran `bun install` and typecheck validation.

## Student Import Execution And Term Sheet Creation (2026-06-12)

### Fix 3 (2026-06-13) — Parse Error, Classroom Derivation, and Error Feedback

- Removed leftover `updateStudent` object fragment causing parse errors in `import-activities.tsx` (lines 460-475)
- Replaced `fields[0]?.classRoom?.id` with validated single-classroom derivation that checks all rows for unique classroom IDs
- Added `preSubmitError` state with clear user-facing messages for: no classroom found, multiple classrooms detected, matched rows without action selection
- Added `_trpc.classrooms.all` invalidation to batch execution onSuccess
- Documented invalidation scope and limitations in `brain/api/contracts.md` and `brain/features/student-import.md`
- Changed files:
  - `apps/dashboard/src/components/modals/student-import/import-activities.tsx` — removed parse error, rewrote Execute All handler with classroom validation and pre-submit errors, added classroom invalidation
  - `brain/api/contracts.md` — added Dashboard Invalidation section to executeStudentImport contract
  - `brain/features/student-import.md` — updated Dashboard Invalidation section
  - `brain/progress.md` — fix-3 completion notes

### Review Approval and Landing (2026-06-13)

- Approved and landed Student Import Input And Name Parsing into `main` at merge commit `2ebe1d2`.
- Approved and landed Student Import Verification And Matching Service into `main` at merge commit `0e19470`.
- Approved and landed Student Import Execution And Term Sheet Creation into `main` at merge commit `b6d37da`.
- Marked the three landed handoff queue items approved/landed and moved their active Brain handoffs to `brain/handoffs/completed/`.
- Left Student Import Review And Resolution UI in `reviewed-fix-request` because review blockers remain for batch defaults, per-candidate metadata, and final feature documentation.

## Student Import Review And Resolution UI Landing (2026-06-13)

### Completed

- Resolved the blocked landing for queue item `/Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-school-clerk-student-import-review-and-resolution-ui.json`.
- Reworked the current `executeStudentImport` review screen into the approved `Ready to import`, `Match Found`, and `Needs attention` tab flow without reverting the already-landed verification and execution endpoints.
- Added batch defaults for ready rows, exact matches, and suspected matches while preserving row-level overrides.
- Added candidate metadata cards with confidence, reason, class, session, term, current-term status, and current-classroom status.
- Fixed suspected-match blocked-state behavior so `Import new` and `Skip` are complete decisions, while `Keep match` and `Update match with name` still require a selected candidate.
- Kept `Skip` as a dashboard-only decision that omits the row from the execution payload.

### Changed Files

- `apps/dashboard/src/components/modals/student-import/import-activities.tsx`
- `brain/features/student-import.md`
- `brain/tasks/in-progress.md`
- `brain/tasks/done.md`

### Verification

- `bun --filter @school-clerk/dashboard typecheck` still fails on existing baseline errors outside the touched import UI, including finance transaction-client types, missing `toMoney` imports, nav `LinkItem` shape mismatches, and unrelated finance/classroom form issues.
- The rerun produced no errors for `apps/dashboard/src/components/modals/student-import/import-activities.tsx`.
