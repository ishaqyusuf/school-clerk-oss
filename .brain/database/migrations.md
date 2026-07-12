# Migrations

## Purpose

Change log for database schema migrations and rollout notes.

## How To Use

- Add one entry per migration.
- Include backward-compatibility and rollback notes.
- Link PR or commit reference.

## Operational Runbook

- Use `bun run db:push --local` for local schema readiness checks.
- Use `bun run db:push --prod` only for explicitly requested production validation/push after confirming the target database and risk. Do not force data-loss prompts or destructive changes without approval.
- The root `db:push` router must call `scripts/db-command.ts push --<profile>` directly so production pushes keep the production guard and do not fall through to the package-local default push profile.

- Dev database selection follows the GND-style three-layer model: `remote-dev` for shared development databases, `local` for the Docker Postgres database, and `production` for production-only scripts and deploys.
- `scripts/dev.ts` is the local development router and delegates DB-mode resolution to `scripts/with-dev-infra.ts`. The router defaults `bun run dev` to local Docker Postgres, supports `bun run dev --remote-dev` for hosted dev, and accepts `--filter`, `--f`, `-f`, or `-filter` with Turbo selector syntax plus bare exact package-name shorthand such as `api marketing! @school-clerk/jobs`. DB env loading is root-only; package-local `.env` files are not part of the database profile contract.
- The canonical database env set is `DATABASE_URL`, `LOCAL_DATABASE_URL`, `REMOTE_DEV_DATABASE_URL`, `PROD_DATABASE_URL`, and `SCHOOL_CLERK_DB_MODE`. Older `POSTGRES_URL`, `LOCAL_POSTGRES_URL`, `REMOTE_DEV_POSTGRES_URL`, `DEV_DATABASE_URL`, and `PROD_POSTGRES_URL` names may be read as fallback aliases by compatibility code, but new scripts and Vercel/Turbo env allowlists should use the canonical names.
- Local database runs in Docker and is currently mapped to `localhost:55432`.
- Use `bun run dev` or `bun run dev --local` for the default local Docker workflow, `bun run dev --remote-dev` for remote development, and `bun run dev --prod` for the production-env dashboard/API smoke profile.
- Use `bun run dev:services` to start only the local services implied by the selected env; it skips Postgres when the DB mode or URL points at remote dev. Use `bun run dev:services:local`, `bun run db:start`, or `bun run db:docker:up` to force local Postgres startup.
- Prisma maintenance commands are profile-routed. `bun run db:push --local|--remote|--prod` uses the explicit `scripts/db-push.ts` router; migrate/generate/pull/studio still use `scripts/db-command.ts`. No profile flag defaults to local Docker Postgres. Legacy aliases such as `db:push:local`, `db:push:dev`, `db:push:prod`, `db:migrate:local`, `db:migrate:dev`, and `db:migrate:prod` delegate to those routers.
- If repository root scripts `db:migrate` and `db:push` exist, run `bun db:migrate` and `bun db:push` after Prisma schema/database updates.
- Do not manually create migration files; use the repository scripts and Prisma workflow.
- Keep migration commands aligned with root `package.json` and `packages/db` scripts.
- `db:migrate --local` and `db:migrate --remote` run `prisma migrate dev`; `db:migrate --prod` runs `prisma migrate deploy`.
- `db:push --local` and `db:push --remote` run `prisma db push` against the resolved development database. `db:push --prod` loads production env, refuses local database URLs, and requires production `DATABASE_URL`.
- The DB command routers run Prisma from `packages/db` so `packages/db/prisma.config.ts` can load root envs, apply the database profile, and expose the resolved `DATABASE_URL`.
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
