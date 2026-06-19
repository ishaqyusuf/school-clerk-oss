# In Progress

## Purpose

Tracks tasks currently being worked on.

## How To Use

- Move tasks here when implementation starts.
- Update status notes frequently.
- Move completed tasks to done.

## Template

## Task Item

- ID:
- Title:
- Started:
- Current status:
- Blockers:
- Owner:

## Task Item

- ID: WEB-002
- Title: Design tenant website configuration persistence model
- Started: 2026-04-08
- Current status: Prisma website models and DB helper functions now exist in-repo for tenant resolution, published config lookup, draft creation/update/duplication/archive, and publish-state updates. Database migration rollout has not been executed yet.
- Blockers: Final decision still needed on whether previous published configs revert to `DRAFT` or retain a distinct historical published state after replacement.
- Owner: Codex

## Task Item

- ID: WEB-003
- Title: Implement template registry and multi-page preview flow
- Started: 2026-04-08
- Current status: Initial scaffolding added for `packages/template-registry` and `apps/school-site`, including typed manifest/registry utilities, a four-template registry (`Scholaris`, `Northfield`, `Crestview`, and `Kaleidoscope`), catch-all route integration, and a public resolver that now attempts real tenant + published-config lookup before falling back to mock data. Dashboard now includes a website settings page plus a shadcn-create-style draft editor with a live preview canvas, sticky config rail, template selector, manifest-driven content fields, section visibility toggles, style/base/theme/chart/font/icon/radius/menu controls, expanded SEO controls, page-by-page preview, inline on-canvas editing for text fields, inline image swapping for hero/gallery media, inline add/remove controls for repeatable testimonial/gallery/feature/stat/staff/announcement cards, section frames with reorder/hide/duplicate controls for ordered homepage sections, config-backed CMS block management for announcements/blog posts, draft/live diff summaries, tokenized private preview URLs with expiry, richer audit-trail display, and AI-context-aware field actions routed through a server action with deterministic fallback behavior. `/settings/website` now opens the active builder directly as a full-screen workspace that covers the dashboard sidebar/header, includes a "Go to Dashboard" CTA, and places the compact template configuration rail on the left of the live renderer instead of defaulting to the old registry-card overview. The shared template layer now supports repeatable block presets for testimonial/gallery/feature/stat/staff/announcement cards, dynamic blog/event/resource list/detail page keys, structured-data generation for public pages, manifest-level default theme configs, config upgrade/version helpers, shared config normalization, JSON-array object-list persistence, namespaced duplicated section content keys for reusable homepage block sections, config-backed announcement/blog content data, and tenant content data resolver boundaries for public rendering. The website settings comparison surface now uses live renderer-backed iframe previews through `apps/school-site` via a safe `?template=` mode rather than metadata-only cards. Session 2026-06-19 added the tenant site registry foundation: shadcn-style tenant site config resolver, style token resolver, `WebsiteRegistryProvider`, `useRegistry()`, `useTenantConfig()`, adaptive common website primitives, production/dummy/editor mode helpers, provider-backed template rendering, a first `NewsletterHomeSection` feature-section pattern, the colourful K-12 `Kaleidoscope` template with home/about/announcement/blog pages, and a global school-site `/login` redirect to the shared dashboard login so auth remains outside template ownership. The section/feature-based direction is documented in `brain/plans/2026-06-19-feature-tenant-site-registry-foundation.md`.
- Blockers: Section duplication is now independent for reusable homepage block sections but not yet generalized for all section archetypes, newsletter/feature tRPC integration is not implemented yet, immutable website config revisions still need a persistence design, a dedicated database-backed CMS model still needs a persistence design beyond current config-backed blocks, the new media schema still needs a formal Prisma migration rollout that the user will handle separately, and full `@school-clerk/dashboard` typecheck is still blocked by pre-existing unrelated workspace errors in API finance/student-fee queries, nav typing, and table motion typings.
- Owner: Codex

## Task Item

- ID: AI-001
- Title: Productize dashboard AI chat
- Started: 2026-04-15
- Current status: Added assistant persistence schema, tenant AI config model, server-side conversation/run/tool/feedback helpers, role-aware capability gating, explicit mutation confirmation flow, expanded operational tools, a single persistent chat-only FAB surface, focused AI-chat typecheck coverage via `tsconfig.assistant.json`, and a Caltext-style `packages/ai` foundation for shared capabilities, schemas, prompts, and provider selection.
- Blockers: Prisma migration rollout has not been executed yet, and full dashboard `tsc --noEmit` is still blocked by the unrelated parse error in `src/components/configure-term.tsx`.
- Owner: Codex

## Task Item

- ID: FIN-IA-001
- Title: Rebuild Account & Finance UI information architecture and navigation
- Started: 2026-06-05
- Current status: Partially implemented. Account & Finance sidebar grouping, Receive Student Payment/Service Bills/Owing sidebar exposure, canonical route wrappers, Payables tabs with page-matching labels, canonical account detail route, major old-route redirects with query preservation, deprecated hardcoded finance URL cleanup, canonical finance metadata/search aliases, data-backed finance Overview command-center pass, explicit student collection header actions, improved canonical route copy, workflow-specific finance table header/empty-state copy/actions, mobile-stacked finance and ledger table headers, Service Billables create path, account-oriented visible route/nav/table/form/metadata copy, All Payables/Service Bills/Payroll filter contract fixes, charge-row payment actions, payable-aware Finance Payment sheet behavior/copy with payer-context URL state and filtered charge invalidation, and account-oriented transfer wording exist in the current worktree. The updated implementation guide and remaining-work audit are documented in `brain/tasks/account-finance-ui-rebuild-handoff.md`.
- Blockers: Runtime sidebar ownership still needs confirmation before final signoff. Remaining work includes runtime redirect/navigation verification, Overview design verification, deeper workflow-specific actions, deeper empty-state actions, richer overview read models where needed, and runtime permission verification. Static breadcrumb audit found no central finance breadcrumb renderer to update.
- Owner: Unassigned

## Task Item

- ID: ASMT-001
- Title: Make assessments and sub-assessments reliable across recording, reports, print, and PDF output
- Started: 2026-06-07
- Current status: Product rules and target print behavior are documented in `brain/features/assessment-results-and-sub-assessments.md`. Required work includes fixing term-scoped report queries, preserving assessment order, separating scoreable assessment data from printable columns, skipping no-weight assessments in student result print/PDF, adding grouped-assessment print modes (`expanded` and `total`), showing parent-child labels consistently, and adding validation/warnings for grouped and zero-weight assessment cases.
- Blockers: None. Implementation has not been fully completed or verified yet.
- Owner: Codex

### Shared Report Roster Sorting And Gender Controls

- Priority: High
- Description: Track plan in `brain/plans/2026-06-12-ux-ui-shared-report-roster-sorting-and-gender-controls.md`.
- Related Feature: assessment results and classroom report sheets
- Status: In Progress
- Plan Status: In Progress
- Plan File: brain/plans/2026-06-12-ux-ui-shared-report-roster-sorting-and-gender-controls.md
- Intake File: brain/intake/2026-06-12-report-pages-and-sidebar-polish.md
- Handoff File: brain/handoffs/ready/2026-06-13-shared-report-roster-sorting-and-gender-controls-handoff.md
- Started Date: 2026-06-13

### Batch Classroom Student Import Support

- Priority: Medium
- Description: Track plan in `brain/plans/2026-06-19-feature-batch-classroom-student-import-support.md`.
- Related Feature: student import
- Status: In Progress
- Plan Status: In Progress
- Plan File: brain/plans/2026-06-19-feature-batch-classroom-student-import-support.md
- Created Date: 2026-06-19
- Started Date: 2026-06-19
