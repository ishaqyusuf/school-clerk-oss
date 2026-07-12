# Brain Handoff: GND-Style Sidebar Refresh

## Status
Ready

## Source Plan
brain/plans/2026-06-12-ux-ui-gnd-style-sidebar-refresh.md

## Task
- Task Title: GND-Style Sidebar Refresh
- Task File: brain/tasks/in-progress.md

## Recommended Agent
- Agent: antigravity
- Reason: Design-sensitive dashboard shell work that needs visual QA against the GND sidebar reference.

## Goal
Refresh the SchoolClerk dashboard sidebar using the GND sidebar as the visual and interaction reference while preserving SchoolClerk's tenant-aware navigation registry, role visibility, and product routes.

## Context To Read First
- brain/plans/2026-06-12-ux-ui-gnd-style-sidebar-refresh.md
- brain/decisions/ADR-0004-navigation-registry-and-workspace-owned-sidebar-architecture.md
- brain/system/architecture.md
- packages/site-nav/src/components/sidebar.tsx
- packages/site-nav/src/components/navs-list.tsx
- packages/site-nav/src/components/sidebar-shell.tsx
- apps/dashboard/src/components/nav-layout-client.tsx
- apps/dashboard/src/features/navigation/dashboard-nav-registry.ts
- /Users/M1PRO/Documents/code/_turbo/gnd/packages/site-nav/src/components/sidebar.tsx
- /Users/M1PRO/Documents/code/_turbo/gnd/packages/site-nav/src/components/navs-list.tsx
- /Users/M1PRO/Documents/code/_turbo/gnd/packages/site-nav/src/components/sidebar-shell.tsx

## Implementation Instructions
1. Compare SchoolClerk `packages/site-nav` components against the GND reference files listed above.
2. Port the relevant GND-style dimensions, hover timing, border/shadow treatment, accent rail, active states, spacing, and scroll behavior into SchoolClerk's sidebar components.
3. Update nav item, child item, and nav list behavior only as needed to match active module expansion and collapsed/expanded behavior.
4. Coordinate collapsed/expanded sidebar widths with `sidebar-shell`, dashboard header, and content offsets.
5. Keep `dashboard-nav-registry.ts` as the navigation source of truth; do not introduce hardcoded page-level sidebar links.
6. Preserve tenant-aware paths, role filtering, active-link detection, nested links, and user footer behavior.
7. Verify mobile sidebar behavior separately so it remains usable and aligned with the refreshed desktop UI.
8. Document any durable navigation architecture deviation with an ADR; otherwise update progress only.

## Acceptance Criteria
- Desktop sidebar visually matches the GND sidebar direction: polished rail, refined spacing, active states, smoother expansion, and modern shell treatment.
- Collapsed and expanded sidebar widths are coordinated with dashboard content/header offsets.
- Active module and active link detection still work with tenant-aware product paths.
- Role-based visibility still works for Admin, Teacher, Accountant, and other configured roles.
- Mobile sidebar remains usable and visually aligned with the refreshed desktop navigation.
- Existing navigation registry architecture remains intact; no hardcoded page-level sidebar links are introduced.
- No unrelated route URLs are changed.

## Files Or Areas Likely Involved
- packages/site-nav/src/components/sidebar.tsx
- packages/site-nav/src/components/navs-list.tsx
- packages/site-nav/src/components/nav-item.tsx
- packages/site-nav/src/components/nav-child-item.tsx
- packages/site-nav/src/components/sidebar-shell.tsx
- packages/site-nav/src/components/mobile-sidebar.tsx
- packages/site-nav/src/components/user.tsx
- packages/site-nav/src/lib/links.ts
- apps/dashboard/src/components/nav-layout-client.tsx
- apps/dashboard/src/components/header.tsx
- apps/dashboard/src/features/navigation/dashboard-nav-registry.ts
- apps/dashboard/src/styles/globals.css

## Do Not Change
- Do not replace SchoolClerk navigation data with copied GND route data.
- Do not hardcode page-level sidebar links.
- Do not change unrelated route URLs.
- Do not move the task to done.
- Do not broaden the scope beyond this handoff.

## Required Checks
- `bun --filter @school-clerk/dashboard typecheck`
- Manual check: desktop collapsed, hover-expanded, active module, active link, nested links, and user footer.
- Manual check: mobile sidebar open/close and link selection.
- Manual check: representative Admin, Teacher, and Accountant role visibility.
- Manual comparison against GND reference behavior with intentional deviations recorded.

## Queue Item
/Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-13-school-clerk-gnd-style-sidebar-refresh.json

## Brain Update Contract
After implementation, update only the relevant files:

- `brain/progress.md`: summarize completed implementation work.
- `brain/decisions/ADR-0004-navigation-registry-and-workspace-owned-sidebar-architecture.md`: update only if navigation ownership or registry architecture changes.
- `brain/system/architecture.md`: update only if the navigation runtime boundary changes.
- `brain/features/<feature>.md`: update if user-visible navigation behavior is formalized.
- `brain/api/endpoints.md`: update if API routes changed.
- `brain/api/contracts.md`: update if request/response shapes changed.
- `brain/api/permissions.md`: update if auth or permissions changed.
- `brain/database/schema.md`: update if schema changed.
- `brain/database/migrations.md`: update if migrations changed.
- `brain/decisions/`: add a new ADR only if a new architecture decision was made.
- `brain/tasks/in-progress.md`: keep the task in progress.

Do not move the task to `done`. `brain-review-handoff` owns final approval.

## Completion Notes
Fill this in after implementation:

- Changed files:
- Checks run:
- Brain docs updated:
- Unresolved issues:
