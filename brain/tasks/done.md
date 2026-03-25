# Done

## Purpose
Record of completed tasks and delivery outcomes.

## How To Use
- Move finished items from in-progress.
- Capture completion date and outcome.
- Reference PR/commit when available.

## Template
## Completed Task
- ID:
- Title:
- Completed:
- Outcome:
- Related changes:
- Owner:

## Completed Task
- ID: TASK-2026-03-16-auth-navigation-hardening
- Title: Harden tenant auth flow and align dashboard redirects with permitted navigation
- Completed: 2026-03-16
- Outcome: Fixed shared UI stylesheet package export/linking issues, allowed tenant localhost origins in Better Auth using request-aware trusted origins, prevented login cookie reset from crashing when school/session/term data is missing, and aligned dashboard default routing with the `gnd` proxy pattern so authenticated `/` and `/login` requests resolve to the first permitted sidebar link for the signed-in role.
- Related changes: `packages/ui/package.json`, `packages/ui/globals.css`, `apps/web/src/app/layout.tsx`, `packages/auth/src/index.ts`, `apps/dashboard/src/actions/cookies/auth-cookie.ts`, `apps/dashboard/src/sidebar/utils.ts`, `apps/dashboard/src/app/dashboard/[domain]/(auth)/login/client.tsx`, `apps/dashboard/src/app/dashboard/[domain]/(sidebar)/page.tsx`, `apps/dashboard/src/proxy.ts`
- Owner: Codex

## Completed Task
- ID: TASK-2026-03-25-dashboard-proxy-host-compat
- Title: Broaden dashboard proxy host compatibility across localhost, portless dev hosts, and production
- Completed: 2026-03-25
- Outcome: Centralized dashboard tenant host parsing so the active proxy and tenant cookie lookup now resolve the same canonical tenant slug for plain localhost subdomains, the documented portless dashboard localhost hostnames, production tenant subdomains, and verified custom domains.
- Related changes: `apps/dashboard/src/utils/tenant-host.ts`, `apps/dashboard/src/proxy.ts`, `apps/dashboard/src/actions/cookies/auth-cookie.ts`, `brain/bugs/2026-03-16-dashboard-localhost-redirect-loop.md`, `brain/api/permissions.md`
- Owner: Codex
