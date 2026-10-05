# Multi-Institution Module Configuration

## Purpose

### Production Daarul Hadith restoration — 2026-10-05

The owner approved restoring academic, student, staff and Finance access after the initial production rollout left legacy configuration missing. Created version 1 / revision 0 configuration for school e1a750b6-c8f1-48ec-a4a4-cca0464a6055, scoped to its active account and exact daarulhadith slug. Enabled and entitled sets contain STUDENT_MANAGEMENT, STAFF_MANAGEMENT, ACADEMIC_PROGRAMS, COURSES_SUBJECTS, ATTENDANCE, ASSESSMENT_AND_EXAMS, RESULTS_AND_REPORTS, BILLING_FINANCE and ASSIGNMENTS. All nine resolve effective with no dependency issues. No existing configuration was overwritten; no role, identity or academic/finance records changed.

Live authenticated production API verification using an existing school Admin session returned HTTP 200 / configured for schoolSettings.getModules and HTTP 200 / seven classroom records for academics.getClassrooms. Browser/sidebar state needs refresh to invalidate the previously missing configuration. This adoption is specific to Daarul Hadith, not a default grant for other schools.
Defines how modules are enabled or disabled per tenant based on institution type and business plan.

## How To Use
- Update when modules are added/renamed.
- Keep module matrix aligned with API permissions and UI navigation.
- Reference this file when onboarding new institution categories.

## Feature Name
Multi-Institution Module Configuration

## Goal
Support small schools, universities, training institutes, and religious schools on one platform by enabling relevant modules per tenant.

## Implementation Status — 2026-09-07

- CORE-001 classification implementation is written; all automated, browser, mobile, and visual verification remains deferred by user instruction.
- The canonical shared utils contract includes the eight original types plus existing combined `K12`. Settings exposes unknown legacy values as unclassified; no bulk rewrite or Prisma column conversion occurs. See [ADR-0022](../decisions/ADR-0022-canonical-institution-type-compatibility.md).
- The school-profile settings route composes prefetch/hydration, a dedicated query-reset/error/Suspense boundary, and a flat form. Controls stack on mobile, have 44px touch targets, constrain dropdown width/height, and expose validation/save/read-only states. These are source-level responsive measures, not browser-verified claims.
- Reads require school-account membership; writes require school admin and account-scoped predicates. Explicit platform procedures target a `schoolId` behind configured platform-admin middleware.
- Existing K12 signup remains the only released onboarding choice and now writes `K12`. Website management, preview, and public rendering share read normalization while retaining the legacy unknown-to-K12 presentation fallback.
- Changing institution type does not activate modules, purchase add-ons, rewrite academic data, or expand signup release availability. Persistent module flags/enforcement/defaults remain CORE-002; academic hierarchy normalization remains CORE-003.
- Canonical execution checklist: [CORE-001](../tasks/2026-09-07-core-001-institution-configuration.md).

### CORE-002 Progress

- Shared module catalog/policy, versioned strict schemas, entitlement intersection and transitive dependency denial are implemented. Catalog entries describe capabilities, not releases or paid subscriptions.
- An explicit tenant-module navigation adapter covers current registry keys and preserves settings recovery. The shell now reads server-prefetched school-scoped module state. Configured empty sets stay empty; invalid/failed reads restrict navigation and show a recovery notice. The optional Inventory flag remains a separate legacy input.
- Dedicated per-school module storage and optimistic-concurrency helpers are implemented. Prisma generation and local push succeeded; production push stopped at its required interactive confirmation. No tenant grants/configuration were created.
- Scoped settings read/update and platform initialization/entitlement APIs are written. Normal read/write inputs include `schoolId` and must match authenticated active-school scope, protecting query caches and stale drafts after tenant switching.
- Responsive settings UI is implemented with finite module groups, grant/dependency explanations, non-admin read-only behavior, 44px label/button targets, wrapping/stacked controls, pending/error states, explicit stale-revision reload and school-keyed invalidation. Browser/mobile/accessibility verification remains deferred.
- Enforcement removes the temporary unconfigured-navigation fallback: missing/invalid/failed config restricts modules and shows provisioning/recovery guidance. No school is automatically granted modules; settings/account recovery remain reachable.
- Primary domain routers, public assessment token services and student/payment import startup/row execution now check modules. School-site admission page/submission/uploads/letters/listings also require Admissions; enrollment parent-login setup additionally requires Parent Portal. The website suppresses denied admission listings without restoring fallback links. Full coverage still requires legacy FTD/global posts, dashboard actions, dashboard PDF/chat/tools, aggregate reads and mixed-domain service effects. The email-proof parent identity replacement is written; historical links/general auth still need audit. Institution defaults, explicit legacy adoption and verification remain unfinished.
- The focused public parent identity audit resulted in an emailed, single-use setup capability and conditional non-reassigning guardian writes. Application code/phone alone no longer authorizes password initialization or login linking. This replacement and historical links still require deferred verification/audit; see [ADR-0024](../decisions/ADR-0024-enrollment-parent-email-proof.md).
- Dashboard now has a live-session/account/role/module adapter. Result PDF uses school-owned records and the protected report API; selected legacy actions and cache wrappers guard before reads/writes/cache hits. Chat HTTP requires AI_ASSISTANT while Admin settings recovery remains reachable. All 13 tools declare domain policy and recheck current access. All five mutations atomically consume approvals/save receipts/activity with domain writes; recovery reads only currently permitted tool outputs. Conversation list/detail/model history and analytics now enforce a conservative recorded tool envelope under current access; legacy/unclassified history is preserved but withheld. Server-owned transcript persistence replaces client assistant/system writes. Remaining direct actions, general activity/notification disclosure, aggregate/mixed-service effects and final verification are still required.
- School activation currently stays within explicit platform grants; the user has been asked to confirm activation authority. No pricing or default entitlement bundle has been inferred.
- Track the complete remaining implementation at [CORE-002](../tasks/2026-09-07-core-002-tenant-module-controls.md), with the architecture decision in [ADR-0023](../decisions/ADR-0023-tenant-module-policy-resolution.md).

## Users
- Platform admins
- School admins
- Implementation/onboarding teams

## Flow
1. Create tenant and set `institutionType`.
2. Select module set for tenant.
3. Platform exposes enabled modules in web/mobile navigation.
4. API and services enforce disabled module access as forbidden.

## Data Model
- Tenant configuration object (planned):
  - `institutionType`
  - `enabledModules[]`
- Module identifiers (planned examples):
  - `STUDENT_MANAGEMENT`
  - `PARENT_PORTAL`
  - `STAFF_MANAGEMENT`
  - `ACADEMIC_PROGRAMS`
  - `COURSES_SUBJECTS`
  - `TIMETABLE`
  - `ATTENDANCE`
  - `ASSESSMENT_AND_EXAMS`
  - `RESULTS_AND_REPORTS`
  - `ADMISSION_ENROLLMENT`
  - `BILLING_FINANCE`
  - `COMMUNICATION`
  - `ASSIGNMENTS`
  - `LIBRARY`
  - `HOSTEL`
  - `TRANSPORT`
  - `INVENTORY_ASSETS`
  - `AI_ASSISTANT`

## APIs
- Get tenant module configuration.
- Update module configuration.
- Validate module access for route guards.

## UI/UX Notes
- Hide disabled modules from sidebars and dashboards.
- Show admin controls for module activation with clear dependency warnings.
- Use institution-specific defaults during onboarding.

## Permissions
- Platform admin can manage all tenant configurations.
- School admin can manage own tenant configuration (subject to plan constraints).
- Non-admin roles have read-only access to active modules.

## Edge Cases
- Existing data in a module that is later disabled.
- Role has permission but module is disabled.
- Institution default conflicts with paid add-on activation.

## Metrics
- Time to onboard a tenant configuration.
- Module adoption rate by institution type.
- Access-denied incidents due to configuration mismatches.

## Open Questions
- Canonical module dependency graph.
- Billing integration for add-on activation.
- Versioning strategy for tenant configuration schema.
