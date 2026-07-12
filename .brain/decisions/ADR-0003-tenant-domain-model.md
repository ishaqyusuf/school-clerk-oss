# ADR-0003: TenantDomain Model for Multi-Tenant Subdomain and Custom Domain Management

- Status: accepted
- Date: 2026-03-16

## Context
SchoolClerk is a subdomain-based multi-tenant SaaS. Each `SchoolProfile` had a `subDomain` field (unique slug) used directly in middleware routing. A `TenantDomains` model existed in the schema but was unused. There was no structured way to manage custom domains or record domain ownership at the account level.

Requirements:
- Single user (`SaasAccount`) can run multiple schools (`SchoolProfile`)
- Each school gets an auto-generated subdomain on creation
- Schools may optionally add a custom domain (e.g. `myschool.org`)
- Admin dashboard URL should be auto-derived (`dashboard.{subdomain}.school-clerk.com`)
- Domain registration on Vercel should happen automatically on school creation (production only)

## Decision
Replace the unused `TenantDomains` model with a clean `TenantDomain` model (singular) connected to both `SchoolProfile` and `SaasAccount`.

**Key design choices:**
- Store `subdomain: "daarulhadith"` (slug only) — never the full URL. Root domain is infra config.
- Store `customDomain: "myschool.org"` (full domain) only for user-provided custom domains.
- Dashboard URL (`dashboard.daarulhadith.school-clerk.com`) is auto-derived in middleware — never stored.
- Direct `SaasAccount → TenantDomain` link is denormalized for fast account-level domain queries.
- `SchoolProfile.subDomain` field is retained as the fast-lookup field for middleware routing.
- Vercel domain registration (`addDomainToVercel`) is called post-transaction, production-only, non-fatal.

## Consequences
### Positive
- Domain records are now auditable (timestamps, soft delete).
- Account-level domain queries work without joining through `SchoolProfile`.
- Custom domain support fully implemented — proxy + auth-cookie both resolve canonical slugs.
- Backfill script (`packages/db/src/seed-tenant-domains.ts`) is idempotent.

### Tradeoffs
- `SchoolProfile.subDomain` and `TenantDomain.subdomain` hold the same value — intentional denormalization for routing speed.
- Vercel domain registration failure is silent (logged but non-fatal) — may require manual recovery.

## Alternatives Considered
- **Store full URL** (`daarulhadith.school-clerk.com`) — rejected: couples data to infra config; breaks if root domain changes.
- **Store dashboard URL** — rejected: it's always derivable, no storage benefit.
- **Only link to SchoolProfile** — rejected: loses fast account-level domain queries needed for billing/plan limits.

## Implementation Notes

### Canonical Slug Resolution (implemented 2026-03-16)

Shared helper `stripDashboardPrefix()` in `apps/dashboard/src/utils/tenant-host.ts`.

Both `proxy.ts` and `auth-cookie.ts` use the same two-step resolution:
1. `extractTenantSubdomain()` → strip `dashboard.` prefix via `stripDashboardPrefix()`
2. If still empty → `prisma.tenantDomain.findUnique({ where: { customDomain: bareHost } })` fallback

All 4 host cases resolve to the canonical slug:
- `daarulhadith.school-clerk.com` → `"daarulhadith"` (direct)
- `dashboard.daarulhadith.school-clerk.com` → `"daarulhadith"` (prefix strip)
- `myschool.org` → `"myschool"` (DB lookup)
- `dashboard.myschool.org` → `"myschool"` (DB lookup after prefix strip)

## Follow-up Actions
- DNS setup documentation for custom domain owners (wildcard CNAME `*.school-clerk.com`)
