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
- Title: Productize dashboard AI chat assistant
- Started: 2026-04-15
- Current status: Added assistant persistence schema, tenant assistant config model, server-side conversation/run/tool/feedback helpers, role-aware capability gating, explicit mutation confirmation flow, expanded operational tools, history/settings/analytics widget views, and focused assistant-only typecheck coverage via `tsconfig.assistant.json`.
- Blockers: Prisma migration rollout has not been executed yet, and full dashboard `tsc --noEmit` is still blocked by the unrelated parse error in `src/components/configure-term.tsx`.
- Owner: Codex
