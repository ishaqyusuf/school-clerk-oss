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

## Completed Task
- ID: TASK-2026-04-01-teachers-page-loading
- Title: Fix teachers page loading failure and document current staff invite/teacher permission gaps
- Completed: 2026-04-01
- Outcome: Fixed the teachers page query wiring so the search filter no longer crashes the page, scoped teacher list loading to the active tenant/session/term, added basic teacher search by name/title/email, and documented that staff invite emails plus teacher classroom/subject permission management are not implemented yet.
- Related changes: `apps/dashboard/src/app/dashboard/[domain]/(sidebar)/staff/teachers/search-params.ts`, `apps/dashboard/src/components/tables/staffs/index.tsx`, `apps/dashboard/src/components/tables/staffs/table.tsx`, `apps/dashboard/src/components/tables/staffs/columns.tsx`, `apps/dashboard/src/components/tables/staffs/empty-states.tsx`, `apps/dashboard/src/actions/get-staff-list.ts`, `apps/dashboard/src/utils/where.staff.ts`, `brain/api/permissions.md`, `CLAUDE.md`
- Owner: Copilot

## Completed Task
- ID: TASK-2026-04-01-staff-invite-and-permissions
- Title: Implement staff invite onboarding and teacher classroom/subject assignment workflow
- Completed: 2026-04-01
- Outcome: Added teacher create/edit flows that capture role, classroom permissions, subject permissions, and optional onboarding email delivery; synced assignments into existing staff permission tables; and wired invites into Better Auth password setup links.
- Related changes: `apps/dashboard/src/actions/save-staff.ts`, `apps/dashboard/src/actions/schema.ts`, `apps/dashboard/src/components/forms/staff-form.tsx`, `apps/dashboard/src/components/controls/form-multiple-selector.tsx`, `apps/dashboard/src/components/staffs/form-context.tsx`, `apps/dashboard/src/components/sheets/staff-create-sheet.tsx`, `apps/dashboard/src/components/sheets/staff-overview-sheet.tsx`, `apps/dashboard/src/components/sheets/global-sheets.tsx`, `apps/dashboard/src/hooks/use-staff-params.ts`, `apps/dashboard/src/app/dashboard/[domain]/(auth)/reset-password/client.tsx`, `apps/api/src/trpc/routers/staff.routes.ts`, `packages/auth/src/index.ts`, `brain/api/permissions.md`, `CLAUDE.md`
- Owner: Copilot
