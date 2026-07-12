# Wayfinder Map: Migrate To Halaalvest-Style Dashboard Proxy Structure

## Destination

A local implementation-ready migration plan for moving SchoolClerk's current dashboard proxy and tenant URL structure toward the Halaalvest dashboard proxy structure, while preserving SchoolClerk tenant auth, workspace cookie recovery, production dashboard domains, custom-domain lookup, and local Portless workflows.

## Notes

- Local-only effort: do not create GitHub issues or PRs.
- Reference project: `/Users/M1PRO/Documents/code/halaal-coperative`.
- Primary SchoolClerk files to inspect in tickets:
  - `apps/dashboard/src/proxy.ts`
  - `apps/marketing/proxy.ts`
  - `apps/dashboard/src/utils/tenant-url-config.ts`
  - `apps/dashboard/src/features/signup/tenant-urls.ts`
  - `packages/tenant-url/src/index.ts`
  - `apps/dashboard/src/app/[domain]/layout.tsx`
  - `apps/dashboard/src/actions/cookies/auth-cookie.ts`
- Primary Halaalvest files to compare in tickets:
  - `apps/dashboard/src/proxy.ts`
  - `apps/marketing/proxy.ts`
  - `apps/dashboard/src/utils/tenant-url-config.ts`
  - `apps/marketing/src/lib/tenant-workspace-urls.ts`
  - `packages/tenant-url/src/index.ts`
- Use Brain rules from `.brain/engineering/ai-rules.md` and `.brain/engineering/coding-standards.md`.
- Planning only by default. Do not implement the migration while resolving this map unless a ticket explicitly says to prototype.

## Decisions so far

<!-- Closed ticket links go here. -->

## Not yet specified

- Whether the final implementation should keep SchoolClerk's `[domain]` route segment, remove it like Halaalvest, or support both during a transition depends on the route-ownership ticket.
- Whether production should remain `dashboard.{tenant}.school-clerk.com` or move toward `{tenant}.school-clerk.com` depends on the URL topology ticket.
- Whether a compatibility redirect is needed for old local and production dashboard hosts depends on the rollout ticket.
- Whether the shared `@school-clerk/tenant-url` package should be simplified to match Halaalvest or kept as a superset depends on the tenant URL config ticket.

## Out of scope

- Rebuilding dashboard auth, Better Auth configuration, or tenant session persistence beyond what the proxy migration requires.
- Changing database schema or tenant domain storage.
- Public school-site template routing, except where login/dashboard links must keep pointing at the correct dashboard host.
- Deployment or Vercel domain provisioning changes beyond documenting the required behavior.

