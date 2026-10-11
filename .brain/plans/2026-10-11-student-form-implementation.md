# Student form 01 implementation contract — 2026-10-11

## Scope and reference

Owner requests direction 01, coding standards/shadcn, collapsible suggestions, default-checked search toggle with no requests when unchecked, testing, and production release. Implement using Midday and Midday Migration Planner in implementation mode. Compared Midday `components/sheets/customer-create-sheet.tsx`, `components/forms/customer-form.tsx`, and customer API router/DB query ownership against School Clerk's student form, form context, suggestion component, student router, and existing enrollment/class-change hooks and transactions.

## Filesystem and data flow

Keep the existing route, global student-create sheet, form context, and URL hooks. Replace `find-and-enroll.tsx`; watch all name fields in `forms/student-form.tsx`. Add focused `students/student-suggestion-rows.tsx`, `students/student-suggestion-dialogs.tsx`, `hooks/use-student-suggestions.ts`, and `hooks/use-enroll-suggested-student.ts`. Add API input schema and profile-scoped adapter; expose a thin `students.suggestions` procedure backed by `packages/db/src/student-suggestions.ts`. No new dependency, table layer, store, server action, schema or job.

## State, UI, and API contract

- [x] All names refine search; strong matches precede partials before pagination.
- [x] Include enrolled current-term class; distinguish pending and ambiguous placements.
- [x] Shared shadcn panel, checkbox, collapse, results, counts, pagination, loading/error/retry/empty states.
- [x] Checkbox defaults checked; cancel/disable requests while unchecked; re-enable current input.
- [x] Collapse only controls presentation; local Dialog state preserves create URL and draft.
- [x] Class correction uses existing authorized option/read/write boundaries, unchanged destination disabled, pending submission guarded.
- [x] Enrollment uses draft class, active academic scope and existing Finance-aware transaction, cache invalidation, double-submit and unmounted/workspace response guards.
- [x] Search input bounds, authenticated module policy, tenant/lifecycle ownership and stale workspace/login rejection.

## Conformance audit

Thin existing form composition and API router; network orchestration in hooks; DB read in the DB package; shared shadcn components unchanged. TanStack query keys include name and workspace identities; canonical domain mutations and established invalidation remain. Applicable Midday loading, failure, validation, pending, toast and cache patterns are implemented. Omitted directory table/header/filter/bulk selection, global sheet replacement, server prefetch/hydration and persistent store: this is an inline field-driven query inside an existing create sheet, not a directory/page migration. Search cannot be prefetched before names exist. Temporary dialogs intentionally avoid the existing overview-sheet close handler that clears create URL state.

## Checks and remaining acceptance

- [x] Bun tests: 10 pass, 31 assertions (ranking/refinement, >5 bounded pagination, tenant/deleted exclusion, review/enrollment states, input bounds, stale school/user/session/term/login rejection and live term ownership).
- [x] New/replaced source Biome checks and diff whitespace check.
- [x] DB typecheck.
- [x] Real component/hook Chrome fixture with fictional identity/API transport, both shared/dashboard stylesheets. Search enable/disable requests, refinement, pagination, collapse, class correction, draft retention, record modal, error retry, read-only role, dark mode, 390px/320px viewport/dialog bounds; no page errors. Screenshots visually inspected. Fixture lives under `.scratch/student-form-qa/`.
- [x] Clean committed-dependency candidate optimized dashboard build: final Next/Turbopack build exits 0 with a transient `SCHOOL_SITE_ROOT_DOMAIN=school-clerk.com`, verified against the active production aliases; no environment file changed. The first attempt compiled but signup prerender lacked that public origin.
- [x] Clean candidate DB typecheck; final workspace dashboard typecheck has the same 119 diagnostic locations/codes as the earlier run, zero added/removed and none in changed files. Root typecheck remains blocked by existing shared-package failures.
- [ ] Clean candidate full dashboard typecheck/baseline comparison: full checking exhausted both default and 8 GiB Node heaps before diagnostics; no pass is claimed.
- [ ] Full local HTTPS app QA: required cmux socket is refusing connections, Mac unlock/session requested. No alternate development server was started.
- [ ] Production release and post-deploy smoke. Vercel identity is confirmed. `release:status --env production` reports missing baselines; `release:check --env production` exits 2: signed provider evidence key unavailable. Existing latest GitHub release-assurance runs also failed. Gate remains unchanged; no production deployment/promotion claimed.

A clean detached release checkout under `/private/tmp/school-clerk-student-form-release` contains only this task's application files over d6f43f0. Main workspace's unrelated assistant/schema/lock changes are excluded. No schema push is required for this task.

## Release flow migration — 11 October 2026

Owner requested replacing the old gate with EwaTrade's current release flow.
The same shared entrypoint and engine are configured (ADR-0076). The old signing
blocker is superseded, not waived. Shared engine tests: 32 pass/129 assertions;
School Clerk release/student tests: 13 pass/42 assertions; release config Biome
and diff checks pass. Marketing optimized build passes. Trigger CLI login owns
the confirmed School Clerk project. Existing component desktop/mobile QA and
dashboard optimized build evidence above remain valid. Production deploy/smoke
are pending at the time of this candidate commit.

Read-only production schema diff found newer assistant objects already present.
This candidate has no schema changes and must not push its older schema; verified
adoption records preserve those unrelated objects. Actual hosted Dashboard and
Marketing baseline is d6f43f0. Jobs have no adoption baseline and deploy normally.
