# Bug: Dashboard Localhost Redirect Loop

## Date

2026-03-16

## Problem

Tenant dashboard requests on local portless hosts such as `daarulhadith.school-clerk-dashboard.localhost:1355` could fall into an auth redirect loop instead of reaching the tenant login/dashboard pages.

## Root Cause

Several dashboard and auth code paths trusted `APP_ROOT_DOMAIN` directly. In local development the environment could still be set to bare `localhost` or `localhost:2200`, which does not match the documented portless dashboard host pattern. Tenant extraction, cookie lookup, auth base URL generation, and local redirect URLs then disagreed about the effective root domain.

## Fix

Added a shared `resolveDashboardAppRootDomain` helper in `@school-clerk/utils` that normalizes bare localhost development values to `school-clerk-dashboard.localhost:1355`. Updated dashboard middleware, auth cookie handling, auth initialization, signup redirect generation, and API host parsing to use the normalized root domain.
Follow-up host parsing now also accepts plain localhost tenant hosts such as `tenant.localhost` and `tenant.localhost:2200` in addition to the portless `tenant.school-clerk-dashboard.localhost:1355` format, while preserving production subdomain and custom-domain resolution through the same canonical slug helpers.

## Prevention

Keep local multi-tenant host handling aligned with the documented portless dashboard hostname format. When new auth or host-sensitive code is added, reuse the shared root-domain helper instead of reading `APP_ROOT_DOMAIN` directly.
Keep proxy and cookie tenant resolution on the same shared helper so localhost compatibility fixes automatically apply to both request rewriting and tenant cookie lookup.

## Related Files

- `packages/utils/src/index.ts`
- `packages/auth/src/index.ts`
- `apps/dashboard/src/proxy.ts`
- `apps/dashboard/src/auth/server.ts`
- `apps/dashboard/src/actions/cookies/auth-cookie.ts`
- `apps/dashboard/src/actions/create-saas-profile.ts`
- `apps/api/src/trpc/init.ts`
