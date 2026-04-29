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
