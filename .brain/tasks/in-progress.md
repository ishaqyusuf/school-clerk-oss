# In Progress

## Student screen mockup review — 2026-10-06

Saved for later by owner instruction on 2026-10-06. Three responsive alternatives
remain available for owner review: Focused roster
(agent recommendation), School register, and Operations desk. Implementation
is deferred by owner instruction until after review. See
[design review](../plans/2026-10-06-student-screen-design-review.md).

### [CORE-002 Tenant Module Controls](2026-09-07-core-002-tenant-module-controls.md)
- Status: In Progress

### [CORE-001 Institution Configuration](2026-09-07-core-001-institution-configuration.md)
- Status: In Progress

### [extract review readiness and count model](2026-09-07-extract-review-readiness-and-count-model.md)
- Status: In Progress

### [replace review tabs with sectioned table shell](2026-09-07-replace-review-tabs-with-sectioned-table-shell.md)
- Status: In Progress

### [build row cells match picker and row menus](2026-09-07-build-row-cells-match-picker-and-row-menus.md)
- Status: In Progress

### [wire sectioned review footer to import execution](2026-09-07-wire-sectioned-review-footer-to-import-execution.md)
- Status: In Progress

### [verify responsive accessible documented import redesign](2026-09-07-verify-responsive-accessible-documented-import-redesign.md)
- Status: In Progress

### [simplify student import setup screen](2026-09-07-simplify-student-import-setup-screen.md)
- Status: In Progress

### [Full Pending Work Execution](2026-09-07-pending-work-execution.md)
- Status: In Progress

### [Restore Workspace Typecheck Baseline](2026-09-07-workspace-typecheck-baseline.md)
- Status: In Progress

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

- ID: WEB-002
- Title: Design tenant website configuration persistence model
- Started: 2026-04-08
- Current status: Prisma website models and DB helper functions now exist in-repo for tenant resolution, published config lookup, draft creation/update/duplication/archive, and publish-state updates. Publish now treats published rows as immutable, archives superseded live rows instead of reverting them to editable drafts, and stores a publish snapshot in the audit trail. Database migration rollout has not been executed yet.
- Blockers: Database migration rollout has not been executed yet. A dedicated immutable website revision table remains a future persistence design decision beyond the current published-row immutability and audit snapshot behavior.
- Owner: Codex

## Task Item

- ID: WEB-003
- Title: Implement template registry and multi-page preview flow
- Started: 2026-04-08
- Current status: Initial scaffolding added for `packages/template-registry` and `apps/school-site`, including typed manifest/registry utilities, a four-template registry (`Scholaris`, `Northfield`, `Crestview`, and `Kaleidoscope`), catch-all route integration, and a public resolver that now attempts real tenant + published-config lookup before falling back to mock data outside production. Dashboard now includes a website settings page plus a shadcn-create-style draft editor with a live preview canvas, sticky config rail, template selector, manifest-driven content fields, section visibility toggles, style/base/theme/chart/font/icon/radius/menu controls, expanded SEO controls, page-by-page preview, inline on-canvas editing for text fields, inline image swapping for hero/gallery media, inline add/remove controls for repeatable testimonial/gallery/feature/stat/staff/announcement cards, section frames with reorder/hide/duplicate controls for ordered homepage sections, config-backed CMS block management for announcements/blog/event/resource collections, draft/live diff summaries, tokenized private preview URLs with expiry, richer audit-trail display, and AI-context-aware field actions routed through a server action with deterministic fallback behavior. `/settings/website` now opens the active builder directly as a full-screen workspace that covers the dashboard sidebar/header, includes a "Go to Dashboard" CTA, and places the compact template configuration rail on the left of the live renderer instead of defaulting to the old registry-card overview. The shared template layer now supports repeatable block presets for testimonial/gallery/feature/stat/staff/announcement cards, dynamic blog/event/resource list/detail page keys, structured-data generation for public pages, manifest-level default theme configs, config upgrade/version helpers, shared config normalization, JSON-array object-list persistence, namespaced duplicated section content keys for reusable homepage block sections, config-backed announcement/blog/event/resource content data, tenant content data resolver boundaries for public rendering, manifest-driven route matching, safe not-found behavior for unknown domains/routes/detail slugs, public robots/sitemap metadata routes, server-side admin/template availability gates, published-config immutability, CMS/editor payload normalization, media URL/upload validation, and concrete SVG template thumbnails. The website settings comparison surface now uses live renderer-backed iframe previews through `apps/school-site` via a safe `?template=` mode rather than metadata-only cards. Session 2026-06-19 added the tenant site registry foundation: shadcn-style tenant site config resolver, style token resolver, `WebsiteRegistryProvider`, `useRegistry()`, `useTenantConfig()`, adaptive common website primitives, production/dummy/editor mode helpers, provider-backed template rendering, a first `NewsletterHomeSection` feature-section pattern, the colourful K-12 `Kaleidoscope` template with home/about/announcement/blog pages, and a global school-site `/login` redirect to the shared dashboard login so auth remains outside template ownership. The section/feature-based direction is documented in `brain/plans/2026-06-19-feature-tenant-site-registry-foundation.md`.
- Blockers: Section duplication is now independent for reusable homepage block sections but not yet generalized for all section archetypes, newsletter/feature tRPC integration is not implemented yet, a dedicated database-backed CMS model still needs a persistence design beyond current config-backed blocks, website subscription plan persistence is still deployment-config based rather than tenant-plan based, the new media schema still needs a formal Prisma migration rollout that the user will handle separately, and full `@school-clerk/dashboard` typecheck is still blocked by pre-existing unrelated workspace errors in API finance/student-fee queries, nav typing, and table motion typings.
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

### Shared Report Roster Sorting And Gender Controls

- Priority: High
- Description: Track plan in `brain/plans/2026-06-12-ux-ui-shared-report-roster-sorting-and-gender-controls.md`.
- Related Feature: assessment results and classroom report sheets
- Status: In Progress
- Plan Status: Implemented and browser-verified; pending handoff approval
- Plan File: brain/plans/2026-06-12-ux-ui-shared-report-roster-sorting-and-gender-controls.md
- Intake File: brain/intake/2026-06-12-report-pages-and-sidebar-polish.md
- Handoff File: brain/handoffs/ready/2026-06-13-shared-report-roster-sorting-and-gender-controls-handoff.md
- Started Date: 2026-06-13

### Flat Minimal Dashboard UI Audit And Refactor

- Priority: Medium
- Description: Track plan in `brain/plans/2026-06-19-feature-flat-minimal-dashboard-ui-audit-and-refactor.md`.
- Related Feature: dashboard design system
- Status: In Progress
- Plan Status: In Progress
- Plan File: brain/plans/2026-06-19-feature-flat-minimal-dashboard-ui-audit-and-refactor.md
- Created Date: 2026-06-19
- Started Date: 2026-06-19
# Cross-product QA email and cleanup

- Product implementation is integrated. Guarded schema pushes, secure route
  propagation, canary delivery, and first reviewed purge remain rollout work.

### Role-Based Sidebar IA And Latest GND Navigation Refresh

- Priority: Medium
- Description: Track plan in `.brain/plans/2026-08-01-feature-role-based-sidebar-ia-and-latest-gnd-navigation-refresh.md`.
- Related Feature: role-based dashboard navigation and GND-style sidebar interactions
- Status: In Progress
- Plan Status: In Progress
- Plan File: .brain/plans/2026-08-01-feature-role-based-sidebar-ia-and-latest-gnd-navigation-refresh.md
- Created Date: 2026-08-01
- Current status: Implementation, focused tests, route-manifest checks, formatting, and TypeScript verification are complete. Authenticated browser/UI, keyboard, screen-reader, and visual QA are intentionally paused so the user can begin that phase separately.
- Blockers: Browser/UI verification is pending by explicit request; no browser automation was run during implementation.

## Logly portfolio integration — 2026-09-07

Source implementation and production `schoolclerk-web` provisioning complete. Package tests and TypeScript validation passed. Consumer deployment and interactive website/native acceptance remain deferred to the owner follow-up. See [feature and rollout contract](../features/logly-analytics.md). No schema change.

## Country heat-map forwarding — 2026-09-07

The shared analytics proxy forwards Vercel's `x-vercel-ip-country` as `x-logly-country` only when `VERCEL=1` and the value is an uppercase two-letter code. Logly enforces its exact ISO whitelist; invalid/missing values remain unknown. Browser-supplied `x-logly-country` and raw IP headers are not forwarded. The same edge metadata applies to independently scoped native routes where present. No body field, IP/GPS storage, user identity or consumer database change. Counts reflect the delivery network; old events remain unknown. Focused package tests and TypeScript checks pass; consumer deployment and owner-deferred live acceptance remain outstanding.

## Daarul Hadith teacher registration and assessment QA — 2026-09-27

Local schema and service workflow are implemented. Focused registration,
assessment route, workbook, and print checks passed. Local passwordless account
selection was explicitly approved and verified with existing teacher/admin
accounts. Authenticated browser QA passed teacher submission, pending roster,
admin approval and rejection, suggestion display, score preservation, rejected
roster exclusion, and report sheet loading. Two synthetic students and their
one score were removed. Follow-up: verify teacher score entry with reliable
browser targeting; exercise attendance save using a single-student-safe path.
Candidate suggestions currently include broad surname matches, including a
different-gender synthetic student observed in QA; rank exact name matches
first and make weaker matches clearer before wider rollout.
Production schema rollout remains outside this local-only QA round.

## Combined main and Logly Vercel release — 2026-10-05

### Production dashboard recovery and persistent sessions

Automatic Git deployment later assigned production dashboard domains (deployment 2PdCcHmb2GFWrG4xLeBBBegxYFTa). Daarul Hadith still has null module configuration, explaining missing links. Owner module-adoption choice pending; no grants inferred. Rollback to the older working release was rejected by Vercel Hobby rollback depth. Classroom SSR logs additionally exposed a browser tRPC server-action call; fixed with HTTP profile reads and page-level hydration. Rolling remembered sessions and clean expiry redirects implemented; local classroom/navigation browser check and 23 navigation tests pass. Awaiting repaired Vercel build, module adoption and live acceptance. See ADR-0067 and authentication feature.

Recovery build 9448527 is Ready / Current, deployed to the production dashboard domains. Local stored-session renewal to 365 days and unsigned production login redirect verified. Module adoption and authenticated classroom acceptance remain unfinished; owner choice pending.

Owner approved restoration; production Daarul Hadith configuration was created with nine core academic/student/staff modules including Finance, all effective without issues. Live Admin API reads returned configured / HTTP 200 and seven classrooms / HTTP 200. Configuration and classroom API recovery are complete; production browser acceptance remains user-side because the automation browser has no production login cookie.

All pending changes committed/pushed to main. Both Logly branches reconciled and recorded as ancestors. Production schema synchronized. Marketing is Ready/live on school-clerk.com; live analytics POST returned 202. Dashboard is Ready/staged at deployment 7Da41Xm9HxeXeM7CGuqcLkckYZ4D (983ae81). Awaiting owner choice to adopt local Daarul Hadith module settings in production (Finance disabled) or retain staged dashboard; canonical promotion and dashboard live acceptance remain unfinished. Cloud-safe builds, upload exclusions and Vercel adapter-output fix committed. Analytics tests pass; broad suite/typecheck failures remain documented in features/logly-analytics.md. Separate school-site Vercel target is absent.

## Dashboard performance — completed 2026-10-06

Approved implementation, release and timed production verification are complete. See tasks/done.md and ADR-0068. Further regional/startup optimisation is tracked separately in tasks/backlog.md. This does not change other pending task states.

## Regional tenant routing and pool lifecycle — 2026-10-06

Owner requested implementation of the remaining latency phases. Existing routing/auth/workspace policy moves behind a bounded authenticated iad1 API call; global proxy keeps the live entry gate for server actions. Implementation released as4a8001e. 63 tests, build/lint/DB typecheck and local/live access/data checks pass, with existing broad failures recorded. Handler/database region iad1 is verified. Isolated authenticated warm Chrome comparison remains open because a separate active EwaTrade QA chat interrupts native timing; pause authorization for that chat was requested. Startup/transport overhead remains and no speed gain is established. No school/financial writes, schema/provider switch or paid upgrade. ADR-0069.

## Regional routing task completion update —2026-10-06

The previously pending regional tenant routing and pool lifecycle implementation/release/warm comparison is complete. Dashboard warm Chrome Load0.906/2.210/0.962s: median0.962s vs2.07s, observed53.5% reduction. Classes3.540/0.919/1.030s: median1.030s vs2.44s, observed57.8% reduction. See tasks/done.md and ADR-0069. Startup and the separate73.2s application elapsed /student-report outlier remain follow-ups in backlog; other task records and their states are unchanged.
