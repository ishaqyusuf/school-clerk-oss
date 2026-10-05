# Task: CORE-001 Institution Configuration

## Status
In Progress

## Priority
High

## Created Date
2026-09-07

## Last Updated
2026-09-07

## Global Ticket
- Ticket Position: 1/3 (CORE foundation)

## Source Context
CORE-001 from backlog and ADR-0002: canonical institution enum, tenant storage, read/write APIs and validation. Part of the full pending-work goal. Preserve existing K12 and legacy string storage while introducing one strict write contract; CORE-002 adds module persistence/enforcement and CORE-003 handles academic hierarchy.

## Implementation Progress
- Completion: 86%
- Current Checklist: 7/7 — Deferred verification, review and commit
- Blockers: Testing deliberately deferred to the final user-resumed phase.

## Implementation Checklist
- [x] Establish the Midday contract and legacy compatibility decision.
- [x] Implement shared canonical institution types, labels and strict input validation.
- [x] Add database-owned configuration reads/writes and tenant-authorized API procedures.
- [x] Add a responsive institution settings form with loading/error composition and cache invalidation.
- [x] Align signup/public website normalization while preserving unreleased onboarding restrictions.
- [x] Update Brain API/feature/database documentation and complete static conformance audit.
- [ ] Run final automated/mobile/browser/visual QA, review and commit in the deferred verification phase.

## Validation Evidence
- None; all tests/typechecks/builds/browser/mobile QA are deferred by user instruction.

## Source Conformance Audit
- Shared schema/labels/read normalization belong to utils; raw persistence and account-scoped update predicates belong to db; authenticated role/tenant orchestration belongs to API query services; router procedures validate and dispatch.
- Settings route follows Midday settings prefetch/hydration composition and the local Next error-boundary convention. The dedicated boundary resets TanStack errors before retrying. The form owns edits, validation, mutation, pending/failed/success/read-only states, invalidation, and server refresh. No UI database access or new dependencies were introduced.
- Existing school information/name/direction sections remain intact. No sheet/table/filter/bulk-operation architecture is added because a single persistent tenant setting does not need it.
- Mobile source measures: min-width zero, bounded dropdown, stacked footer, full-width narrow-screen save button, 44px controls, visible focus ring and live save announcements. Keyboard/viewport/screen-reader behavior must be checked later.
- Signup release gate executes before canonical storage conversion. Website runtime/preview/management wrappers share the normalizer while preserving historical fallback behavior. Navigation accepts combined K12; persistent module filtering is not implemented by this ticket.
- Database enum conversion is explicitly excluded from this compatibility stage; no schema push or bulk tenant write was run. Unknown existing values remain untouched. API helper exports for platform scope must continue to be called only behind platform middleware.

## Deferred Verification Checklist
- Canonical/alias/unknown/null normalization; reject invalid/lowercase/extra-field new write inputs.
- Anonymous, missing-school, missing-account, non-admin writes, cross-account reads/writes, deleted schools and unauthorized platform calls.
- Authorized admin/platform read/save and persistence across reload; unavailable/read-failed/save-failed states and retry.
- Unclassified legacy display, supported-type selection, unchanged-form disabled save, duplicate-submit prevention, and cache refresh.
- Preserve K12-only signup gating; public/preview/template compatibility for each canonical type and unknown legacy data.
- Responsive 320/375/768px layouts, dropdown bounds, keyboard focus/escape, touch targets, loading announcements and screen-reader errors.
- Focused tests and package typechecks for utils/db/API/dashboard/navigation/school-site, followed by portfolio integration/browser QA and final review. No checks were run during implementation.

## Midday Implementation Contract
1. Reference: target school-profile settings page, student-name settings form, school-settings router/query, signup types and website resolvers. Midday locale-settings.tsx, import-modal form ownership, API trpc/init.ts and API/DB/package-boundary guidance.
2. Principle: shared client-safe enum/schema in utils; reusable data access in db; API owns authorization; form owns validation/mutation; server page composes prefetch, Suspense and error handling.
3. Files: utils/institution-config.ts, db/institution-config.ts, API school-institution query and school-settings router, dashboard institution-settings form and existing school-profile page. Reuse website normalizers and signup flow.
4. Route: existing settings/school-profile; no new route. Add PageTitle and async boundary for new settings surface.
5. Header: plain institution identity section, concise descriptive copy, responsive select and save action.
6. Sheet: not applicable; persistent settings form does not require navigable detail/create sheets.
7. Form: Zod and useZodForm; pending/error/read-only states; invalidate configuration queries and refresh server consumers after save.
8. State: React Hook Form for edits, TanStack for server state; no new URL/store state.
9. Table: not applicable; this is one tenant setting, not a data collection.
10. Row actions: not applicable; one explicit save action.
11. Bulk actions: not applicable; never mass-classify existing institutions.
12. Data: preserve nullable String database column to avoid destructive legacy enum conversion. Strict enum at write boundary; normalize unambiguous legacy aliases; unknown values remain visibly unclassified. K12 is retained as an explicit combined category already supported by signup and websites. Role alone cannot authorize writes to another account's school; platform procedures use the configured platform-admin middleware.
13. QA: deferred; final phase covers enum validation, legacy values, cross-tenant/role rejection, missing/deleted schools, form/save errors, refetch and mobile 320/375/768 layouts.
14. Open questions: module entitlements/billing policy belongs to CORE-002 and must not be silently activated by changing institution type.
