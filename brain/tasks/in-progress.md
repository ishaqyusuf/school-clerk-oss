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
- Current status: Initial scaffolding added for `packages/template-registry` and `apps/school-site`, including typed manifest/registry utilities, a three-template registry (`Scholaris`, `Northfield`, and `Crestview`), catch-all route integration, and a public resolver that now attempts real tenant + published-config lookup before falling back to mock data. Dashboard now includes a website settings page plus a draft editor page with manifest-driven content fields, section visibility toggles, basic theme inputs, expanded SEO controls, page-by-page preview, inline on-canvas editing for text fields, inline image swapping for hero/gallery media, inline add/remove controls for repeatable testimonial/gallery/feature/stat/staff/announcement cards, section frames with reorder/hide/duplicate controls for ordered homepage sections, draft/live diff summaries, tokenized private preview URLs with expiry, richer audit-trail display, and field AI actions routed through a server action with deterministic fallback behavior. The shared template layer now supports repeatable block presets for testimonial/gallery/feature/stat/staff/announcement cards, dynamic blog/event/resource list/detail page keys, structured-data generation for public pages, manifest-level default theme configs, config upgrade/version helpers, shared config normalization, JSON-array object-list persistence, namespaced duplicated section content keys for reusable homepage block sections, and tenant content data resolver boundaries for public rendering. The website settings comparison surface now uses live renderer-backed iframe previews through `apps/school-site` via a safe `?template=` mode rather than metadata-only cards.
- Blockers: Public runtime content resolvers still use tenant-aware placeholder adapters rather than live CMS/domain data sources because no stable source model exists yet in the active DB package, section duplication is now independent for reusable homepage block sections but not yet generalized for all section archetypes, the new media schema still needs a formal Prisma migration rollout that the user will handle separately, and full `@school-clerk/dashboard` typecheck is still blocked by a pre-existing parse error in `src/components/configure-term.tsx`.
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

### Admin Empty Classroom Report Spreadsheet Print
- Priority: Medium
- Description: Track plan in `brain/plans/2026-06-12-feature-admin-empty-classroom-report-spreadsheet-print.md`.
- Related Feature: assessment results and manual report records
- Status: In Progress
- Plan Status: In Progress
- Plan File: brain/plans/2026-06-12-feature-admin-empty-classroom-report-spreadsheet-print.md
- Intake File: brain/intake/2026-06-12-classroom-report-sheet-access-and-empty-print.md
- Handoff File: brain/handoffs/ready/2026-06-12-admin-empty-classroom-report-spreadsheet-print-handoff.md
- Started Date: 2026-06-12

## Task Item
- ID: STUD-IMP-001
- Title: Student Import Input And Name Parsing
- Started: 2026-06-12
- Current status: Approved and queued for implementation. Handoff created at `brain/handoffs/ready/2026-06-12-student-import-input-and-name-parsing-handoff.md`; queue item at `/Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-school-clerk-student-import-input-and-name-parsing.json`.
- Blockers: None.
- Owner: antigravity

## Task Item
- ID: STUD-IMP-002
- Title: Student Import Verification And Matching Service
- Started: 2026-06-12
- Current status: Review requested fixes on 2026-06-12. See brain/reviews/2026-06-12-student-import-verification-and-matching-service-review.md and active fix handoff brain/handoffs/fixes/2026-06-12-student-import-verification-and-matching-service-fix-1.md.
- Blockers: Fix requested for API/dashboard type errors, active-session classroom validation, match metadata identifiers, and missing student import feature Brain doc.
- Owner: open-code

## Task Item
- ID: STUD-IMP-003
- Title: Student Import Review And Resolution UI
- Started: 2026-06-12
- Current status: Approved and queued for implementation. Handoff created at `brain/handoffs/ready/2026-06-12-student-import-review-and-resolution-ui-handoff.md`; queue item at `/Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-school-clerk-student-import-review-and-resolution-ui.json`.
- Blockers: None.
- Owner: antigravity

## Task Item
- ID: STUD-IMP-004
- Title: Student Import Execution And Term Sheet Creation
- Started: 2026-06-12
- Current status: Approved and queued for implementation. Handoff created at `brain/handoffs/ready/2026-06-12-student-import-execution-and-term-sheet-creation-handoff.md`; queue item at `/Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-school-clerk-student-import-execution-and-term-sheet-creation.json`.
- Blockers: None.
- Owner: open-code
