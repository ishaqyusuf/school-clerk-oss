# Migrations

## Purpose

Change log for database schema migrations and rollout notes.

## How To Use

- Add one entry per migration.
- Include backward-compatibility and rollback notes.
- Link PR or commit reference.

## Operational Runbook

- After every Prisma schema/database update, propagate schema readiness only to the local and production database profiles.
- Run `bun run db:push --local` and `bun run db:push --prod`.
- Do not run `db:migrate`, create migration files, or push the schema to the remote-development profile unless the user explicitly requests it. Report any unavailable or failed required push rather than silently skipping it.
- Do not force data-loss prompts or destructive changes without explicit approval.
- The root `db:push` router must call `scripts/db-command.ts push --<profile>` directly so production pushes keep the production guard and do not fall through to the package-local default push profile.

- Dev database selection follows the GND-style three-layer model: `remote-dev` for shared development databases, `local` for the Docker Postgres database, and `production` for production-only scripts and deploys.
- `scripts/dev.ts` is the local development router and delegates DB-mode resolution to `scripts/with-dev-infra.ts`. The router defaults `bun run dev` to local Docker Postgres, supports `bun run dev --remote-dev` for hosted dev, and accepts `--filter`, `--f`, `-f`, or `-filter` with Turbo selector syntax plus bare exact package-name shorthand such as `api marketing! @school-clerk/jobs`. DB env loading is root-only; package-local `.env` files are not part of the database profile contract.
- The canonical database env set is `DATABASE_URL`, `LOCAL_DATABASE_URL`, `REMOTE_DEV_DATABASE_URL`, `PROD_DATABASE_URL`, and `SCHOOL_CLERK_DB_MODE`. Older `POSTGRES_URL`, `LOCAL_POSTGRES_URL`, `REMOTE_DEV_POSTGRES_URL`, `DEV_DATABASE_URL`, and `PROD_POSTGRES_URL` names may be read as fallback aliases by compatibility code, but new scripts and Vercel/Turbo env allowlists should use the canonical names.
- Local database runs in Docker and is currently mapped to `localhost:55432`.
- Use `bun run dev` or `bun run dev --local` for the default local Docker workflow, `bun run dev --remote-dev` for remote development, and `bun run dev --prod` for the production-env dashboard/API smoke profile.
- Use `bun run dev:services` to start only the local services implied by the selected env; it skips Postgres when the DB mode or URL points at remote dev. Use `bun run dev:services:local`, `bun run db:start`, or `bun run db:docker:up` to force local Postgres startup.
- Prisma maintenance commands are profile-routed. `bun run db:push --local|--remote|--prod` uses the explicit `scripts/db-push.ts` router; generate/pull/studio use `scripts/db-command.ts`. No profile flag defaults to local Docker Postgres. Normal schema rollout invokes only `--local` and `--prod`.
- Use the explicit two-profile push sequence above after Prisma schema/database updates.
- Do not manually create migration files or run migration commands unless the user explicitly requests them.
- Keep migration commands aligned with root `package.json` and `packages/db` scripts.
- `db:push --local` runs `prisma db push` against the resolved local development database. `db:push --prod` loads production env, refuses local database URLs, and requires production `DATABASE_URL`.
- The DB command routers run Prisma directly from `packages/db` with an explicit profile-resolved `DATABASE_URL` and `SCHOOL_CLERK_DB_MODE`; do not reintroduce a separate environment-mode variable for DB maintenance. This prevents Bun-preloaded `.env.local` values from leaking into `--remote` or `--prod` pushes, and targets SchoolClerk's actual Prisma schema directory at `packages/db/src/schema` with migrations under `packages/db/src/schema/migrations`.
- Local package dev scripts also pass through root env/profile resolution, which forces `DATABASE_URL` to the local Docker profile from `LOCAL_DATABASE_URL` when present. This prevents root `.env.local` remote database URLs from leaking into filtered local `turbo dev` package processes.
- The `packages/jobs` dev script now uses the same dev-infra resolver as the DB package, while `jobs:deploy` uses production env loading.
- Prisma 7 is the default ORM runtime. `packages/db/prisma.config.ts` loads root envs, applies the Halaalvest-style database profile, and reads `DATABASE_URL` for runtime and migration commands. It still allows `prisma generate` and `prisma validate` to use a local placeholder PostgreSQL URL when `DATABASE_URL` is absent so DB-less marketing Vercel builds can generate the client. The generated client lives under `packages/db/src/generated/client`.
- `@school-clerk/db` follows the Halaalvest lazy-client pattern: `createPrismaClient()` returns a configured client or `null` when `DATABASE_URL` is absent, while the legacy `prisma` export is a lazy compatibility proxy that throws only when actual DB access is attempted without a database URL.
- `packages/db/src/generated/` is ignored source output and must stay listed in `turbo.json` build outputs as `src/generated/**`; otherwise remote Turbo cache hits can replay `@school-clerk/db:build` logs without restoring the generated Prisma client for downstream Next.js bundles. Run `bun run db:generate` before local typechecks that import `@school-clerk/db`; dashboard and school-site build scripts generate the client before `next build` for app-direct Vercel builds.
- Use `bun run db:studio` for Prisma Studio against the selected development database.
- If the Docker DB is not running yet, start it with `bun run db:start` or `docker compose up -d postgres` from the repo root.
- Use `bun run db:update:local:dry-run` to inspect production-to-local import changes before writing to the local Docker database.
- Use `bun run db:update:local` to sync production data into the local database. The command reads production source URLs from explicit source env vars first, then `packages/db/.env.production`, then repo root `.env.production`; it reads the local target from local env files and falls back to `postgresql://postgres:postgres@127.0.0.1:55432/school_clerk`.
- The production-to-local sync refuses to write unless the target database host is local, writes cursor state under `.local-db-sync/`, temporarily disables triggers on all local target tables while importing table-by-table data, casts raw upsert parameters to the target PostgreSQL column types, preserves native PostgreSQL arrays while JSON-stringifying JSON values, re-enables triggers before disconnecting, and normalizes imported tenant domains for local dashboard routing by default.
- Local domain normalization keeps `SchoolProfile.subDomain`, `TenantDomain.subdomain`, and legacy `school.sub_domain` as slug-only values compatible with `<tenant>.school-clerk-dashboard.localhost`; imported production custom domains are cleared unless `--keep-custom-domains` is passed.

## Migration Entry

- Date: 2026-07-20
- ID: SCHEMA-2026-07-20-attendance-sessions
- Summary: Expanded classroom attendance with general/subject scope, explicit date/period/statuses, department-subject attribution, correction revision history, and atomic idempotency/dedupe guards.
- Affected entities: `ClassRoomAttendance`, `StudentAttendance`, `AttendanceSessionRevision`, `AttendanceSessionGuard`, `DepartmentSubject`, `ActivityType`, and attendance enums.
- Backfill required: No. New session/date/scope/status fields are nullable where legacy compatibility requires it; reads derive legacy status from `isPresent`, date from `createdAt`, and scope as general.
- Applied: `bun run db:push --local` and `bun run db:push --prod` both succeeded on 2026-07-20. No migration files or destructive acceptance flags were used.
- Rollback plan: Remove new attendance UI/API contracts first, retain compatibility reads while exporting any revision history, then remove guard/revision tables, new relations/fields/indexes, and attendance activity/enum values.
- Owner: Codex

## Migration Entry

- Date: 2026-07-19
- ID: SCHEMA-2026-07-19-academic-term-lifecycle-rollover
- Summary: Added explicit academic term lifecycle metadata, the canonical school active-term pointer, durable idempotent setup runs, direct attendance term attribution, teacher term-profile lookup indexing, and academic lifecycle activity types.
- Affected entities: `SchoolProfile`, `SessionTerm`, `AcademicTermSetupRun`, `ClassRoomAttendance`, `StaffTermProfile`, `ActivityType`, `AcademicTermLifecycleStatus`, `AcademicTermSetupRunStatus`
- Backfill required: No. Legacy `SessionTerm.lifecycleStatus` remains nullable and dashboard reads retain date fallback until explicit activation.
- Applied: `bun run db:push --local` and `bun run db:push --prod` both succeeded on 2026-07-19.
- Rollback plan: Remove lifecycle enforcement/UI first, restore date-only active selection, then drop the setup-run table, active pointer, lifecycle/attendance fields, indexes, and enums.
- Owner: Codex

## Migration Entry

- Date: 2026-07-19
- ID: schema-push-20260719_student_name_format
- Summary: Added `StudentNameFormat` and `SchoolProfile.studentNameFormat`, defaulting to `FIRST_SURNAME_OTHER`, for tenant-wide student display-name ordering.
- Affected entities: `SchoolProfile`, `StudentNameFormat`
- Backfill required: No. PostgreSQL applies the default to existing schools, and runtime normalization also falls back safely for missing or unknown values.
- Rollout: `bun run db:generate`, `bun run db:push --local`, and `bun run db:push --prod` succeeded. No migration file or remote-development push was created.
- Rollback plan: Remove settings/runtime formatter use, restore the fixed first-name-first display convention, regenerate Prisma Client, then drop the column and enum.
- Owner: Codex

## Migration Entry

- Date: 2026-07-19
- ID: schema-push-20260719_uncapped_informational_assessments
- Summary: Made `ClassroomSubjectAssessment.obtainable` nullable so standalone zero-weight informational assessments can accept non-negative numeric values without an upper bound.
- Affected entities: `ClassroomSubjectAssessment`
- Backfill required: No for production. The nullable schema is backward-compatible and no production assessment or score record was modified. Locally, only the four approved Qur'an page-reference assessments were changed to `NULL`, preserving their IDs, scores, and `0%` weights.
- Rollout: `bun run db:generate`, `bun run db:push --local`, and `bun run db:push --prod` succeeded. No migration file or remote-development push was created.
- Rollback plan: Restore numeric maxima for any uncapped local records, require positive maxima in every assessment path, regenerate Prisma Client, then push the non-null schema only after confirming no `NULL` rows remain.
- Owner: Codex

## Migration Entry

- Date: 2026-07-18
- ID: ASSESSMENT-2026-07-18-score-value-history
- Summary: Added append-only assessment score value history with previous/new values, change type, write source, actor provenance, source reference, and immutable identity snapshots.
- Affected entities: `StudentAssessmentRecordHistory`, `StudentAssessmentRecord`, `SchoolProfile`
- Backfill required: No. Existing canonical scores remain unchanged; history begins with writes performed after deployment.
- Rollout: `bun run db:generate`, `bun run db:push --local`, and `bun run db:push --prod` succeeded. Both required databases report that they are in sync with the Prisma schema.
- Rollback plan: Stop all history helper calls before removing the history relation, table, and enums. Canonical values in `StudentAssessmentRecord` are independent of history rows.
- Owner: Codex

## Template

## Migration Entry

- Date:
- ID:
- Summary:
- Affected entities:
- Backfill required: Yes/No
- Rollback plan:
- Owner:

## Migration Entry

- Date: 2026-07-18
- ID: schema-push-20260718_assessment_workbook_round_trip
- Summary: Added durable signed assessment-workbook export/import audit rows, tenant-scoped import idempotency, created-assessment references, and download/import activity event types.
- Affected entities: `AssessmentWorkbookExport`, `AssessmentWorkbookImport`, `ActivityType`
- Backfill required: No. Existing assessments and scores are unchanged; records are created only for new workbook operations.
- Rollback plan: Disable the workbook tRPC/UI surfaces, revoke operational use of existing exports, regenerate Prisma Client, then drop the two workbook audit tables and activity enum values.
- Owner: Codex
- Note: `bun run db:generate` succeeded. `bun run db:migrate` reached local Postgres but stopped on pre-existing schema drift and requested a destructive reset, which was not run. The additive schema was synchronized to local Docker Postgres with Prisma `db push`. After explicit user authorization, `bun run db:push --prod` completed against the configured production Supabase database. The required `--remote` attempt reached its configured Supabase pooler but did not return a schema result and was stopped; no separate remote-development sync is claimed.

- Date: 2026-07-18
- ID: schema-push-20260718_academic_data_direction
- Summary: Added `AcademicDataDirectionMode` and `SchoolProfile.academicDataDirectionMode`, defaulting to `AUTO`, for tenant-scoped academic surface direction.
- Affected entities: `SchoolProfile`, `AcademicDataDirectionMode`
- Backfill required: No. PostgreSQL applies the `AUTO` default to existing schools and the detector safely resolves missing evidence to LTR.
- Rollback plan: Remove direction-mode API/UI use, regenerate Prisma Client, then drop the `academicDataDirectionMode` column and enum.
- Owner: Codex
- Note: `bun run db:generate` succeeded. `bun run db:migrate` reached local Postgres but stopped on pre-existing drift and requested a destructive reset, which was not run. `bun run db:push --local` and `bun run db:push --prod` synchronized successfully. `bun run db:push --remote` connected to the configured transaction pooler but did not return and was stopped after two minutes.

## Migration Entry

- Date: 2026-07-14
- ID: schema-push-20260714_student_import_jobs
- Summary: Added durable student import job and row models for background batch import execution with persisted progress and row-level results.
- Affected entities: `StudentImportJob`, `StudentImportJobRow`
- Backfill required: No. Existing direct student imports remain valid; new rows are created only for future async batch imports.
- Rollback plan: Route dashboard batch import back to direct `students.executeStudentImport`, remove Trigger task usage, regenerate Prisma Client, then drop `StudentImportJob`, `StudentImportJobRow`, and their enums.
- Owner: Codex
- Note: `bun run db:migrate` reached local Postgres but stopped on pre-existing local drift and requested a destructive reset, which was not run. `bun run db:push` completed successfully against the local Docker database. `bun run db:generate` succeeded, and `bun --cwd packages/jobs prisma.ts` refreshed the jobs package flattened schema.

## Migration Entry

- Date: 2026-07-13
- ID: schema-push-20260713_finance_payroll_purchases_payees
- Summary: Added reusable finance payees, payroll structures, and purchase/service/expense records linked to standardized finance streams, charges, and payments.
- Affected entities: `FinancePayee`, `FinancePayrollStructure`, `FinancePurchase`, `FinanceCharge`, `FinancePayment`, `FinanceStream`, `StaffProfile`, `SchoolProfile`
- Backfill required: No destructive backfill. Existing staff/service charges remain valid without payee or payroll-structure links; new purchase and payroll workflows populate the new records going forward.
- Rollback plan: Remove API/UI use of payees, payroll structures, purchases, staff finance history, and project account summaries; regenerate Prisma Client; then drop the new relations/tables/enums.
- Owner: Codex
- Note: `bun run db:generate` succeeded. `bun run db:migrate` still stopped on known local drift and requested a destructive reset, which was not run. `bun run db:push` completed successfully against the local Docker database and synchronized the schema.

## Migration Entry

- Date: 2026-07-13
- ID: schema-push-20260713_finance_collected_term_attribution
- Summary: Added collected-in school session and term attribution fields to standardized finance payments and ledger entries, plus durable term-ledger close and carry-forward models.
- Affected entities: `FinancePayment`, `FinanceLedgerEntry`, `FinanceTermLedgerClose`, `FinanceTermCarryForward`, `SchoolSession`, `SessionTerm`, `FinanceStream`
- Backfill required: Existing historical rows have null collected-in fields and are read through charge-term fallback until a later backfill/snapshot process sets explicit collection terms.
- Rollback plan: Remove API/read-model use of collected-in fields and term close/carry-forward routes, regenerate Prisma Client, then drop the collected-in foreign keys/indexes and close/carry-forward tables.
- Owner: Codex
- Note: `bun run db:generate` succeeded. `bun run db:migrate` reached local Postgres but stopped on pre-existing drift in `StaffAcademicAccessGrant` foreign keys and requested a destructive reset, which was not run. `bun run db:push` completed successfully against the local Docker database.

## Migration Entry

- Date: 2026-07-12
- ID: 20260712133000_assessment_print_modes
- Summary: Added `ClassroomSubjectAssessmentPrintMode` and `ClassroomSubjectAssessment.printMode` so grouped assessment parents can choose expanded child columns or a single total column on printed/PDF student results.
- Affected entities: `ClassroomSubjectAssessment`, `ClassroomSubjectAssessmentPrintMode`
- Backfill required: No manual backfill; existing rows default to `EXPANDED`, preserving current printed result behavior.
- Rollback plan: Remove dashboard/API use of grouped total print mode, regenerate clients, then drop `ClassroomSubjectAssessment.printMode` and `ClassroomSubjectAssessmentPrintMode`.
- Owner: Codex

## Migration Entry

- Date: 2026-07-12
- ID: 20260712120000_staff_academic_access_grants
- Summary: Added hierarchy-aware staff academic access grants for whole-class, department/arm, subject-across-class, and subject-in-department teacher assignment scopes.
- Affected entities: `StaffAcademicAccessGrant`, `StaffAcademicAccessScope`, `StaffTermProfile`, `ClassRoom`, `ClassRoomDepartment`, `Subject`, `DepartmentSubject`
- Backfill required: No immediate data backfill; the effective-access resolver reads existing `StaffClassroomDepartmentTermProfiles` and `StaffSubject` rows as legacy compatibility input. New saves write both dynamic grant rows and legacy rows where applicable.
- Rollback plan: Remove staff form/API use of broad grant scopes, switch teacher authorization back to legacy assignment rows, then drop `StaffAcademicAccessGrant`, its indexes/foreign keys, and `StaffAcademicAccessScope`.
- Owner: Codex

## Migration Entry

- Date: 2026-07-09
- ID: 20260709120000_assessment_public_links
- Summary: Added tenant-scoped public assessment-recording links with approval lifecycle, hashed signed tokens, expiry metadata, captured subject/student filters, and assessment public-link activity events.
- Affected entities: `AssessmentPublicLink`, `AssessmentPublicLinkStatus`, `ActivityType`, `SchoolProfile`, `SessionTerm`, `ClassRoomDepartment`
- Backfill required: No; existing assessment recording continues to use authenticated routes and no links exist until created or requested.
- Rollback plan: Remove dashboard/API use of public assessment links and notification types, revoke any issued links operationally, then drop the table, enum, indexes, and activity enum values where supported.
- Owner: Codex
- Note: The composite `AssessmentPublicLink` tenant/term/classroom index is explicitly named `AssessmentPublicLink_schoolProfileId_sessionTermId_classRoo_idx` to avoid generated-name truncation drift between Prisma and PostgreSQL.

## Migration Entry

- Date: 2026-07-04
- ID: 20260704120000_staff_classroom_subject_access_mode
- Summary: Added classroom-wide subject access mode for staff classroom assignments using `StaffClassroomSubjectAccessMode` and `StaffClassroomDepartmentTermProfiles.subjectAccessMode`.
- Affected entities: `StaffClassroomDepartmentTermProfiles`, `StaffClassroomSubjectAccessMode`
- Backfill required: No; existing rows default to `SELECTED`, preserving explicit subject assignment behavior.
- Rollback plan: Remove UI/API use of `subjectAccessMode`, revert teacher authorization expansion to explicit `StaffSubject` rows only, then drop the column and enum.
- Owner: Codex

## Migration Entry

- Date: 2026-07-01
- ID: ORM-2026-07-01-prisma-7-default
- Summary: Switched `packages/db` to Prisma 7 by generating the client into `packages/db/src/generated/client`, using `@prisma/adapter-pg` for runtime PostgreSQL access, and moving datasource URL resolution into Prisma config with SSL parameter normalization.
- Affected entities: ORM/runtime configuration only; no database tables or columns changed.
- Backfill required: No.
- Rollback plan: Revert package versions, restore datasource URL handling in schema/client construction, regenerate the old client, and rerun typechecks/builds before deployment.
- Owner: Codex

## Migration Entry

- Date: 2026-07-01
- ID: 20260701110000_custom_template_quote_payment_handoff
- Summary: Added quote payment handoff fields for custom document template requests: instructions, optional external payment link, and due date.
- Affected entities: `CustomDocumentTemplateRequest`
- Backfill required: No; existing requests keep null handoff fields and can be updated by platform template operators.
- Rollback plan: Remove dashboard quote payment fields/validation, then drop the three quote payment columns.
- Owner: Codex

## Migration Entry

- Date: 2026-06-30
- ID: 20260630163000_custom_document_template_requests
- Summary: Added upload-backed custom document template request tracking with quote/build status, source-file metadata, and validated built-template JSON storage.
- Affected entities: `CustomDocumentTemplateRequest`, `SchoolProfile`
- Backfill required: No; new requests are created from the dashboard document-template settings page.
- Rollback plan: Remove custom template request UI/PDF selection usage, then drop the table and `CustomDocumentTemplateRequestStatus` enum.
- Owner: Codex

## Migration Entry

- Date: 2026-06-30
- ID: 20260630160000_school_document_template_preferences
- Summary: Added tenant-scoped document template preferences for school defaults such as result-sheet template selection.
- Affected entities: `SchoolDocumentTemplatePreference`, `SchoolProfile`
- Backfill required: No; schools fall back to built-in defaults until a preference is saved.
- Rollback plan: Remove tenant preference reads/writes from settings and PDF routes, then drop the table and indexes.
- Owner: Codex

## Migration Entry

- Date: 2026-06-30
- ID: 20260630153000_enrollment_admission_letter_template_selection
- Summary: Added admission-letter template selection metadata to approved enrollment applications.
- Affected entities: `EnrollmentApplication`
- Backfill required: No; existing approved applications can fall back to `admission-classic-v1`.
- Rollback plan: Remove admission-letter template selection from approval/dashboard/PDF links, then drop the new columns and index.
- Owner: Codex

## Migration Entry

- Date: 2026-06-30
- ID: 20260630143000_enrollment_approval_payment_metadata
- Summary: Added admission approval payment metadata and approval-email delivery tracking to enrollment applications.
- Affected entities: `EnrollmentApplication`
- Backfill required: No; existing applications default to no required admission payment and null email sent timestamp.
- Rollback plan: Remove approval payment/email usage in API and dashboard, then drop the new payment metadata columns and index.
- Owner: Codex

## Migration Entry

- Date: 2026-06-30
- ID: 20260630133000_enrollment_document_types
- Summary: Added stable document type fields for enrollment/admission requirements and submitted application documents.
- Affected entities: `EnrollmentLinkDocumentRequirement`, `EnrollmentApplicationDocument`
- Backfill required: No; existing rows default to `GENERAL`, while application code infers passport/photo, birth certificate, and previous report types from labels where possible.
- Rollback plan: Remove document type UI/API usage, then drop the new columns and indexes.
- Owner: Codex

## Migration Entry

- Date: 2026-06-30
- ID: 20260630120000_admission_link_visibility_requirements
- Summary: Added admission/enrollment link website visibility, selected-class age/notes fields, and class-targeted document requirements.
- Affected entities: `EnrollmentLink`, `EnrollmentLinkClassroom`, `EnrollmentLinkDocumentRequirement`, `ClassRoomDepartment`
- Backfill required: No; existing links default to manual-only website visibility and existing document requirements remain global because `classRoomDepartmentId` is null.
- Rollback plan: Remove website visibility UI/API usage, drop class-targeted requirement validation, then drop the new columns/indexes/foreign key.
- Owner: Codex

## Migration Entry

- Date: 2026-06-19
- ID: 20260619150000_enrollment_links_parent_portal
- Summary: Added enrollment link, application, parent, and document-upload persistence plus a nullable `Guardians.userId` bridge for authenticated parent portal ward access.
- Affected entities: `EnrollmentLink`, `EnrollmentLinkClassroom`, `EnrollmentLinkDocumentRequirement`, `EnrollmentApplication`, `EnrollmentApplicationParent`, `EnrollmentApplicationDocument`, `Guardians`, `User`, `SchoolProfile`, `ClassRoomDepartment`
- Backfill required: No for enrollment records; existing guardians may be linked to parent users opportunistically during application approval or parent onboarding.
- Rollback plan: Remove parent portal reads and enrollment link routes, drop enrollment tables/enums, then drop `Guardians.userId`.
- Owner: Codex

## Migration Entry

- Date: 2026-06-17
- ID: 20260617120000_find_anything_classroom_search_indexes
- Summary: Added index-only support for Find Anything classroom search using active tenant/session classroom indexes and trigram indexes for classroom and stream names.
- Affected entities: `ClassRoom`, `ClassRoomDepartment`
- Backfill required: No
- Rollback plan: Drop the added classroom search indexes if the global classroom search source is reverted.
- Owner: Codex

## Migration Entry

- Date: 2026-06-03
- ID: 20260603152000_reset_legacy_finance
- Summary: Removed legacy, non-operational finance/accounting storage so the standardized school finance ledger can be rebuilt cleanly.
- Affected entities: `Fees`, `FeeHistory`, `StudentFee`, `StudentPayment`, `StudentPurchase`, `Wallet`, `WalletTransactions`, `StudentWalletTransactions`, `Funds`, `Billable`, `BillableHistory`, `Bills`, `BillInvoice`, `BillPayment`, `BillSettlement`, `BillSettlementRepayment`
- Backfill required: No; legacy finance records are intentionally discarded.
- Rollback plan: Restore the removed finance schema/migration from git before deploying any new finance ledger schema, then re-run Prisma migrations against a restored database backup if legacy records are required.
- Owner: Codex

## Migration Entry

- Date: 2026-04-06
- ID: STAFF-2026-04-06-invite-status-fields
- Summary: Added staff onboarding lifecycle fields to support pending invites, resend tracking, and onboarding completion timestamps.
- Affected entities: `StaffProfile`
- Backfill required: Yes
- Rollback plan: Drop or ignore the new invite tracking columns after removing the invite-first UI and onboarding completion flow.
- Owner: Codex

## Migration Entry

- Date: 2026-04-08
- ID: WEB-2026-04-08-website-template-config-models
- Summary: Added Prisma schema definitions for tenant website draft/published configuration storage and repository helpers for published-config lookup plus draft/publish operations.
- Affected entities: `WebsiteTemplateConfig`, `WebsitePublishedConfig`, `SchoolProfile`
- Backfill required: No for greenfield rollout; existing tenants can remain without a published website config until onboarding.
- Rollback plan: Remove website runtime reads, delete the new models, and revert `SchoolProfile` relation fields before applying migration rollback.
- Owner: Codex

## Migration Entry

- Date: 2026-04-08
- ID: WEB-2026-04-08-website-media-blob-fields
- Summary: Extended tenant website media assets with storage metadata for Vercel Blob uploads and introduced runtime asset-reference resolution for template content.
- Affected entities: `WebsiteMediaAsset`
- Backfill required: No; existing imported URL assets continue to work without storage metadata.
- Rollback plan: Revert blob upload flows, remove storage metadata columns, and keep legacy URL-based media selection for website templates.
- Owner: Codex
