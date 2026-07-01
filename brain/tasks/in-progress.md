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

- ID: ADM-001
- Title: Admission link visibility and class-specific requirements
- Started: 2026-06-30
- Current status: Phase 1 implementation added `showOnWebsite`, tenant-correct public enrollment URLs, selected-class age rules/notes, class-targeted document requirements, dashboard setup controls, public parent-side filtering, and server-side public submission/admin approval validation. Local Prisma generation, migration, root typecheck, and public website resolver smoke validation now pass.
- Blockers: Full browser/manual admission-link setup and parent submission validation remains pending.
- Owner: Codex

## Task Item

- ID: ADM-002
- Title: Public website admission section integration
- Started: 2026-06-30
- Current status: Phase 2 implementation added production school-site admission-link resolution, active/date/capacity filtering for `showOnWebsite=true` links, template content-data support, and shared admission CTA/list sections on `Scholaris`/`Northfield`/`Crestview` and `Kaleidoscope` home/admissions surfaces. Local Prisma generation, migration, root typecheck, school-site build, and seeded public resolver smoke validation now pass.
- Blockers: Full browser/manual website-section validation remains pending.
- Owner: Codex

## Task Item

- ID: ADM-003
- Title: Parent submission hardening and submission-success email
- Started: 2026-06-30
- Current status: Phase 3 implementation added typed admission document requirements/submitted document metadata, passport-photo classification, admin review badges/links for typed uploads, primary parent email requirement, stronger parent phone/date-of-birth checks, selected-class upload tampering rejection, token-backed Vercel Blob uploads with unguessable keys, and a Resend-backed submission confirmation email using `packages/email`. Local Prisma generation/migration, root typecheck, package typecheck, email-template render smoke validation, real Resend API delivery smoke validation, live Vercel Blob upload/delete smoke validation, and DB-backed parent submission server-action smoke validation now pass.
- Blockers: Full browser/manual parent submission validation remains pending.
- Owner: Codex

## Task Item

- ID: ADM-004
- Title: Admission review payment setup and approval email
- Started: 2026-06-30
- Current status: Phase 4 implementation replaced one-click approval with a payment handoff form, stores approval payment metadata on the application, validates required payment details before approval, keeps student/guardian/session/term/finance creation in the approval transaction, sends a successful-admission email with payment amount/instructions/link, and records `admissionApprovalEmailSentAt` after delivery. Local Prisma generation/migration, root typecheck, package typecheck, seeded admin approval transaction smoke validation, and real Resend API delivery smoke validation now pass.
- Blockers: Full browser/manual approval validation remains pending.
- Owner: Codex

## Task Item

- ID: ADM-005
- Title: Admission letter PDF generation and template selection
- Started: 2026-06-30
- Current status: Phase 5 implementation added a code-backed admission-letter PDF registry with `admission-classic-v1` and `admission-modern-v1`, a public school-site PDF route guarded by enrollment link code plus approved application ID, approval-time template selection persisted on the application, dashboard open/download controls, passport-photo rendering, and approval email links to the selected admission-letter PDF. Local Prisma generation/migration, root/package typechecks, PDF render smoke validation, admission-letter route smoke validation, and school-site build now pass.
- Blockers: Full browser/manual admission-letter link validation and remote passport image validation remain pending.
- Owner: Codex

## Task Item

- ID: DOC-001
- Title: Shared school document template registry
- Started: 2026-06-30
- Current status: Implemented a shared `@school-clerk/pdf/document-templates` registry with stable IDs, versions, payload schemas, preview metadata, code-backed admission/result templates, and a JSON-backed admission letter entry. Result and admission-letter PDF routes now resolve through the shared template path where applicable.
- Blockers: PDF render smoke validation passes; full browser/manual PDF validation remains pending.
- Owner: Codex

## Task Item

- ID: DOC-002
- Title: Tenant-managed result template selection
- Started: 2026-06-30
- Current status: Added `SchoolDocumentTemplatePreference`, dashboard `/settings/document-templates`, result-template navigation, and result PDF preference resolution with query override support. Ready custom result JSON templates can also be selected as the school default.
- Blockers: Local Prisma generation/migration and typechecks pass; result PDF browser/manual validation remains pending.
- Owner: Codex

## Task Item

- ID: DOC-003
- Title: JSON document template renderer
- Started: 2026-06-30
- Current status: Implemented a constrained JSON document schema with binding/interpolation/visibility/style support, dashboard preview renderer, React PDF renderer, and the built-in `admission-json-simple-v1` admission-letter template.
- Blockers: PDF render smoke validation passes; visual/browser validation remains pending.
- Owner: Codex

## Task Item

- ID: DOC-004
- Title: Custom admission and result template request workflow
- Started: 2026-06-30
- Current status: Added `CustomDocumentTemplateRequest`, upload-backed dashboard request creation, quote payment handoff fields, quote/payment/build/ready status tracking, validated `builtTemplateJson`, ready custom result-template selection/rendering, ready custom admission-letter selector/rendering support, and operator-readable Blob configuration errors for upload failures. School users can submit/view requests and quote payment details, while quote/build/ready mutations require an env-configured platform template operator role. A public Vercel Blob store `school-clerk-admissions` is linked to `schoolclerk-dashboard`, and the working token is configured for `schoolify` production/development.
- Blockers: Local Prisma generation/migration now passes for the 2026-06-30 migrations and the 2026-07-01 quote-payment migration; root/package typechecks, dashboard build, school-site build, PDF smokes, real Resend smoke, live Blob upload/delete smoke, and DB-backed parent submission server-action smoke pass. Full browser/manual validation remains pending, `schoolify` preview Blob env is not configured for all preview branches, native checkout-provider payment collection remains a future product decision, and the repo still needs a dedicated Prisma 7 migration because the current schema/package wiring is Prisma 6-based.
- Owner: Codex

## Task Item

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

### Flat Minimal Dashboard UI Audit And Refactor

- Priority: Medium
- Description: Track plan in `brain/plans/2026-06-19-feature-flat-minimal-dashboard-ui-audit-and-refactor.md`.
- Related Feature: dashboard design system
- Status: In Progress
- Plan Status: In Progress
- Plan File: brain/plans/2026-06-19-feature-flat-minimal-dashboard-ui-audit-and-refactor.md
- Created Date: 2026-06-19
- Started Date: 2026-06-19
