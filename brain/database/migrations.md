# Migrations

## Purpose
Change log for database schema migrations and rollout notes.

## How To Use
- Add one entry per migration.
- Include backward-compatibility and rollback notes.
- Link PR or commit reference.

## Operational Runbook
- Local database runs in Docker and is currently mapped to `localhost:55432`.
- Local environment variables for DB work should come from the repo root `.env.local`.
- Use `bun run db:migrate` for local Prisma development migrations. This resolves to local env loading and `prisma migrate dev`.
- Use `bun run db:push` only for the server/production database. This resolves through `packages/db/.env.production`.
- Prisma 7 is the default ORM runtime. The schema datasource URL is supplied through `packages/db/prisma.config.ts`, and the generated client lives under `packages/db/src/generated/client`.
- `packages/db/src/generated/` is ignored source output. Run `bun run db:generate` before local typechecks that import `@school-clerk/db`; dashboard and school-site build scripts generate the client before `next build` for app-direct Vercel builds.
- Use `bun run db:studio` for Prisma Studio against the local database unless you intentionally override the env.
- If the Docker DB is not running yet, start it with `docker compose up -d postgres` from the repo root.
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
