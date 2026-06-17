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
- Use `bun run db:studio` for Prisma Studio against the local database unless you intentionally override the env.
- If the Docker DB is not running yet, start it with `docker compose up -d postgres` from the repo root.
- Use `bun run db:update:local:dry-run` to inspect production-to-local import changes before writing to the local Docker database.
- Use `bun run db:update:local` to sync production data into the local database. The command reads production source URLs from explicit source env vars first, then `packages/db/.env.production`, then repo root `.env.production`; it reads the local target from local env files and falls back to `postgresql://postgres:postgres@127.0.0.1:55432/school_clerk`.
- The production-to-local sync refuses to write unless the target database host is local, writes cursor state under `.local-db-sync/`, temporarily disables triggers on all local target tables while importing table-by-table data, casts raw upsert parameters to the target PostgreSQL column types, preserves native PostgreSQL arrays while JSON-stringifying JSON values, re-enables triggers before disconnecting, and normalizes imported tenant domains for local dashboard routing by default.
- Local domain normalization keeps `SchoolProfile.subDomain`, `TenantDomain.subdomain`, and legacy `school.sub_domain` as slug-only values compatible with `<tenant>.school-clerk-dashboard.localhost:1355`; imported production custom domains are cleared unless `--keep-custom-domains` is passed.

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
