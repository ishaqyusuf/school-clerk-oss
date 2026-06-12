# Plan: GND-Style Sidebar Refresh

## Type
UX/UI

## Status
Proposed

## Created Date
2026-06-12

## Last Updated
2026-06-12

## Intake
- Intake File: brain/intake/2026-06-12-report-pages-and-sidebar-polish.md
- Intake Item: Sidebar is outdated and should be updated using the GND project as the full reference.

## Goal Or Problem
SchoolClerk's dashboard sidebar should feel as polished and current as the GND sidebar while preserving SchoolClerk's tenant-aware navigation registry, role visibility, and product routes.

## Current Context
- SchoolClerk sidebar rendering is owned by `packages/site-nav` and consumed by `apps/dashboard/src/components/nav-layout-client.tsx`.
- Navigation definitions come from `apps/dashboard/src/features/navigation/dashboard-nav-registry.ts`, are adapted by `apps/dashboard/src/features/navigation/sidebar-modules.ts`, and are exposed through `apps/dashboard/src/components/sidebar/links.ts`.
- ADR-0004 requires preserving the shared navigation registry and workspace-owned sidebar architecture.
- GND reference files inspected:
  - `/Users/M1PRO/Documents/code/_turbo/gnd/packages/site-nav/src/components/sidebar.tsx`
  - `/Users/M1PRO/Documents/code/_turbo/gnd/packages/site-nav/src/components/navs-list.tsx`
  - `/Users/M1PRO/Documents/code/_turbo/gnd/packages/site-nav/src/components/sidebar-shell.tsx`
  - `/Users/M1PRO/Documents/code/_turbo/gnd/apps/www/src/components/header.tsx`
- The GND sidebar uses a wider collapsed rail, polished sidebar tokens, faster hover expansion, active module accordion behavior, refined shadow/border treatment, and coordinated header offset behavior.

## Proposed Approach
Adapt the GND sidebar visual and interaction system into SchoolClerk's `packages/site-nav` rather than replacing SchoolClerk's navigation data model. Keep tenant links, role filtering, active-link detection, and ADR-0004 registry ownership intact. Align the dashboard header/shell offset with the refreshed sidebar and verify both desktop and mobile navigation.

## Implementation Steps
- Compare SchoolClerk `packages/site-nav` components against the GND reference and identify visual/behavior gaps to port.
- Update `packages/site-nav/src/components/sidebar.tsx` with GND-style dimensions, hover timing, border/shadow treatment, sidebar accent rail, and scroll behavior.
- Update `packages/site-nav/src/components/navs-list.tsx`, `nav-item.tsx`, and `nav-child-item.tsx` as needed to match GND active module expansion, collapsed/expanded behavior, section labels, active states, and spacing.
- Update `packages/site-nav/src/components/sidebar-shell.tsx` and dashboard header layout so content/header offsets match the new collapsed sidebar width.
- Review `apps/dashboard/src/components/nav-layout-client.tsx` for old shell padding, footer/user placement, and mobile spacing interactions.
- Keep `dashboard-nav-registry.ts` as the source of navigation truth; only adjust labels/grouping if required by the refreshed IA and existing route availability.
- Ensure mobile sidebar behavior remains usable and does not inherit desktop hover assumptions.
- Verify the sidebar does not suppress itself unexpectedly for roles with fewer links unless that is intended by `packages/site-nav/src/lib/links.ts`.
- Document any durable navigation architecture deviation with an ADR; otherwise update progress only.

## Affected Files Or Areas
- `packages/site-nav/src/components/sidebar.tsx`
- `packages/site-nav/src/components/navs-list.tsx`
- `packages/site-nav/src/components/nav-item.tsx`
- `packages/site-nav/src/components/nav-child-item.tsx`
- `packages/site-nav/src/components/sidebar-shell.tsx`
- `packages/site-nav/src/components/mobile-sidebar.tsx`
- `packages/site-nav/src/components/user.tsx`
- `packages/site-nav/src/lib/links.ts`
- `apps/dashboard/src/components/nav-layout-client.tsx`
- `apps/dashboard/src/components/header.tsx`
- `apps/dashboard/src/features/navigation/dashboard-nav-registry.ts`
- `apps/dashboard/src/styles/globals.css`
- `brain/decisions/ADR-0004-navigation-registry-and-workspace-owned-sidebar-architecture.md`
- `brain/progress.md`

## Acceptance Criteria
- Desktop sidebar visually matches the GND sidebar direction: polished rail, refined spacing, active states, smoother expansion, and modern shell treatment.
- Collapsed and expanded sidebar widths are coordinated with dashboard content/header offsets.
- Active module and active link detection still work with tenant-aware product paths.
- Role-based visibility still works for Admin, Teacher, Accountant, and other configured roles.
- Mobile sidebar remains usable and visually aligned with the refreshed desktop navigation.
- Existing navigation registry architecture remains intact; no hardcoded page-level sidebar links are introduced.
- No unrelated route URLs are changed.

## Test Plan
- Run `bun --filter @school-clerk/dashboard typecheck`.
- Manually verify sidebar behavior on desktop: collapsed, hover-expanded, active module, active link, nested links, and user footer.
- Manually verify mobile sidebar open/close and link selection.
- Manually verify representative roles: Admin, Teacher, Accountant.
- Manually compare against GND reference behavior and record any intentional deviations.

## Brain Update Requirements
- Update `brain/progress.md` or the active progress file after implementation.
- Update `brain/decisions/ADR-0004-navigation-registry-and-workspace-owned-sidebar-architecture.md` only if the implementation changes navigation ownership or registry architecture.
- Update `brain/system/architecture.md` only if the navigation runtime boundary changes.

## Lower-Agent Readiness
- Implementation scope is clear: Yes
- File boundaries are clear: Yes
- Acceptance criteria are observable: Yes
- Required checks are listed: Yes
- Brain update requirements are listed: Yes
- Ready for handoff: Yes

## Completion Report Requirements
Lower agent must report:
- Changed files
- Checks run
- Brain docs updated
- Unresolved issues
- Any skipped acceptance criteria

## Risks / Edge Cases
- SchoolClerk and GND use sibling but not identical packages, so direct copying can break imports or design tokens.
- Header/content offsets can become misaligned if the collapsed width changes without updating shell/header classes.
- Navigation suppression for low-link roles may make the sidebar disappear during role testing.
- Full dashboard typecheck may still be blocked by pre-existing unrelated baseline errors documented in Brain.

## Open Questions
- None.

## Linked Task
- Task Title: GND-Style Sidebar Refresh
- Task File: brain/tasks/roadmap.md
