# School Website Template Registry

## Goal

Provide a production-safe, multi-tenant website platform where each school can browse a registry of website templates, preview them with realistic data, customize inline editable content and design settings, save multiple draft configurations, and publish one configuration as the live public school website.

## Users

- Tenant administrators configuring the school's public website
- Internal operators supporting setup, migration, and publishing
- Public visitors viewing the published school website

## Flow

1. Tenant opens the template registry experience.
2. Tenant filters templates by institution type and subscription plan.
3. Tenant previews a template across its supported pages.
4. Tenant edits allowed fields inline and optionally uses AI assistance per field.
5. Tenant configures theme options such as colors, fonts, section visibility, and style presets.
6. Tenant saves the result as a draft configuration.
7. Tenant previews the draft in a production-like mode.
8. Tenant publishes one configuration.
9. `apps/school-site` resolves the tenant and renders the published configuration as the live public website.

## Data Model

- `WebsiteTemplate`
  - Registry-level metadata such as `id`, `name`, `institutionTypes`, `supportedPlans`, `description`, `thumbnail`, `previewImages`, `supportedPages`, `features`, `tags`, `editableMap`, `configSchema`, `defaultSectionVisibility`, and `dataRequirements`
- `WebsiteTemplateConfiguration`
  - Tenant-owned saved configuration for a selected template
  - Core fields: `id`, `tenantId`, `templateId`, `name`, `status`, `content`, `sectionVisibility`, `themeConfig`, `seoConfig`, `analyticsConfig`, `createdBy`, `updatedBy`, `publishedAt`
- `WebsiteEditableField`
  - Schema-driven editable definition including `key`, `label`, `description`, `usage`, `contentType`, `sizeGuidance`, `tone`, `validationRules`, `placeholder`, `allowRichText`, and AI context hints
- `WebsitePublishedState`
  - Per-tenant pointer to the active published configuration so only one configuration is live at a time
- Draft CMS block collections
  - Tenant-owned repeatable content currently stored in `WebsiteTemplateConfiguration.content`, including `cms.announcements` and `cms.blogPosts`
  - These blocks also support `cms.events` and `cms.resources`
  - These blocks feed announcement headers, homepage announcement sections, homepage blog previews, blog listing pages, blog detail pages, event pages, resource pages, and public metadata fallbacks
- Public admission link content
  - `WebsiteTemplateContentData.admissionLinks` is resolved from enrollment links for production school-site rendering.
  - Only active, in-window, not-full links with `showOnWebsite=true` are exposed to public website sections.
  - Manual-only links remain accessible through `/enroll/[code]` but are omitted from website-rendered admission lists.
- Published config rows
  - Published rows are treated as immutable after `publishedAt` is set.
  - Publishing a new draft archives the previous live config row and moves the active pointer to the new published row.
  - Editing a live site requires duplicating the published config into a new draft.

## APIs

- Registry listing endpoint/query filtered by institution type and plan
- Template manifest loader for preview/editor mode
- Tenant draft configuration create, update, duplicate, archive, and publish operations
- AI generation action scoped to a single editable field with template, tenant, page, and section context
- Public website configuration resolver used by `apps/school-site`
- Public website content resolver merges config-backed CMS collections with production enrollment/admission link data for templates.
- Public robots and sitemap metadata routes derived from the resolved tenant, template manifest, and config-backed CMS collections
- TODO: final API transport should align with the platform's tRPC conventions

## UI/UX Notes

- The registry should feel premium and similar in clarity to shadcn's create flow: browse, preview, configure, and publish.
- Tenant dashboard draft editing uses a shadcn-create-style layout: production-like preview canvas on the left and a sticky configuration rail for template, page, section, style, color, typography, menu, SEO, and save controls.
- `/settings/website` is the primary builder entry point. It opens the active editable draft directly in a full-screen builder workspace that covers the normal dashboard sidebar/header. The builder includes a compact draft/publish/CMS toolbar, a "Go to Dashboard" escape CTA, a floating left-side icon-only template configuration rail that expands on hover/focus, and a full-width live renderer/editor canvas behind it. The older card-first registry overview should not be the default first screen.
- Tenant dashboard CMS block management lives under each website configuration and manages announcement, blog, event, and resource collections without requiring a separate database model yet.
- Templates must support multi-page preview rather than homepage-only preview.
- Editable fields should support direct inline editing with clear click guards and focus boundaries.
- Each editable area should expose an AI action affordance in the top-right.
- Editable field metadata can include `aiDescription`; when omitted, the existing field description remains the AI generation context.
- Preview mode should look as close to production as possible while preventing accidental navigation away from the editor.
- Section toggles should update preview immediately and preserve layout integrity.
- Draft editing must remain isolated from the currently published live website.
- Published configs are visible for preview/comparison but cannot be saved directly; users must duplicate them before editing.
- Required template sections must remain visible even if stale or manipulated saved config data tries to hide them.

## Permissions

- Tenant admins or equivalent website-management roles can create, edit, duplicate, archive, and publish template configurations.
- Plan restrictions must gate template availability, premium sections, and advanced configuration options.
- Website management server actions currently allow `ADMIN`/`Admin` roles only.
- Template availability is enforced server-side against the resolved school institution type and the configured website plan.
- Public users can only access the published configuration through `apps/school-site`.

## Edge Cases

- Tenant has multiple drafts but no published configuration yet
- Published configuration references optional sections that are now disabled by plan downgrade
- Template evolves after a tenant has saved older configuration data
- Hidden sections affect page composition or dependent blocks
- Editable fields require different validation rules by content type or page context
- Production data sources such as blog, news, or resources are unavailable during preview and need safe fallback data
- Draft CMS updates can be overwritten by a stale editor session until immutable revisions or field-level conflict handling exists
- Domain or subdomain resolution fails and public website rendering must degrade safely
- In production, unresolved domains or tenants without a published website should return not found rather than render mock content.
- Detail routes such as blog, event, and resource slugs should return not found when the slug is missing from the matching collection.

## Metrics

- Template selection-to-publish completion rate
- Average time from opening registry to first published website
- Draft save frequency and publish frequency per tenant
- AI field-generation usage and acceptance rate
- Public website performance and error rate by template

## Open Questions

- Whether website configuration belongs to the core tenant schema or a dedicated website domain package
- Whether template manifests should be fully filesystem-driven, database-assisted, or hybrid
- Whether template versioning should be explicit at publish time to protect tenants from breaking template updates
- Whether blog/resources/news public data should be server-rendered directly or cached behind a website-specific content resolver
- Whether a dedicated website revision table should replace the current published-row immutability plus audit snapshot approach
- Whether website subscription plan should be persisted per school instead of read from deployment configuration

## Implementation Direction

- Public website runtime lives in `apps/school-site`.
- Registry, manifests, preview/editor helpers, hooks, guards, and render utilities live in `packages/template-registry`.
- Templates are grouped by institution type and plan, for example `templates/k-12/plus/template-1`.
- Templates are multi-page and schema-driven.
- Templates must work in both preview/editor mode and production mode by switching between sample preview data and tenant production data through shared resolvers.
- `apps/school-site` resolves public content data from the published website configuration first. Mock content is allowed for preview/template/demo modes, while production database-backed rendering uses empty collection states when tenant CMS content is absent.
- Public admission sections are presentation-only template blocks fed by the school-site resolver; link validity, capacity, date windows, and direct form submission stay owned by the enrollment/admission runtime.
- School authentication and dashboards are global product surfaces, not template-owned pages. Public template CTAs should link to the shared school-site `/login` redirect, which sends users to the dashboard login for the resolved tenant.
- Public page routing is manifest-driven through `resolveTemplateRoute`, including dynamic `[slug]` routes for blog, event, and resource detail pages.
- Public metadata and structured data use the resolved manifest route and collection item instead of hardcoded path heuristics.
- Saved editor payloads are normalized against template fields, allowed section keys, required-section rules, theme schemas, SEO keys, and safe public media URLs before persistence.
- Detailed implementation architecture is documented in [brain/engineering/school-website-template-platform-implementation.md](/Users/M1PRO/Documents/code/school-clerk/brain/engineering/school-website-template-platform-implementation.md).

## Template Catalog Notes

- `k12-plus-template-4` (`Kaleidoscope`) is a colourful K-12 template in `packages/template-registry` with home, about, blog list, and blog detail renderers.
- `k12-plus-template-1` (`Scholaris`) is a school-facing K-12 template that must read as the tenant school's own public website, not as a template/product demo. Its starter copy should be safe for schools to publish as-is or edit, and its dynamic collections should prefer tenant CMS content before falling back to tenant-aware dummy school content.
- `Scholaris`, `Northfield`, `Crestview`, and `Kaleidoscope` can render open admission links on home/admissions surfaces through the shared admission section when the tenant has website-visible enrollment links.
- `Kaleidoscope` uses shared adaptive primitives for editable text/buttons, honours section visibility for configurable sections, includes announcement header/homepage announcement/blog/featured story blocks, includes safe fallback content for preview/dummy mode, and depends on production `announcements` and `blogPosts` content data when available.
- `Kaleidoscope` deliberately does not define login/auth pages; sign-in links stay routed through the global dashboard login boundary.
- All four current K-12 templates now declare concrete SVG thumbnail/preview image paths under `apps/school-site/public/templates`.

## Tenant Site Registry Direction

- The registry is moving toward a section/feature-based model.
- Tenant site configuration should include:
  - selected `template`
  - shadcn-style `style` preset
  - `baseColor`
  - brand/theme color
  - `chartColor`
  - heading font
  - body font
  - icon library
  - radius
  - menu style and menu accent
  - enabled features
  - enabled/ordered page sections
- `packages/template-registry/common` owns adaptive public-site primitives and shells shared by all templates.
- Common primitives such as `Button`, `Input`, `Text`, `Section`, and `SectionContainer` read tenant style config through registry context and adapt automatically.
- Templates should be curated recipes composed from shared sections/features rather than isolated design systems.
- Runtime routes should own behavior. Templates and sections own presentation.
- Feature sections may use registry hooks and site-scoped clients, but side-effect actions must be disabled or guarded in preview/editor/template modes.
- Detailed current implementation plan: [Tenant Site Registry Foundation](/Users/M1PRO/Documents/code/school-clerk/brain/plans/2026-06-19-feature-tenant-site-registry-foundation.md).

## Design System Rule

- Shadcn components are the base UI foundation across registry, editor, preview, and live rendering.
- Templates are not separate design systems; they are presentation layers built on top of shared shadcn-based primitives and reusable website blocks.
- Template uniqueness should come from composition, variants, wrappers, spacing, typography, and theme tokens rather than duplicated raw primitives.
- Inline editor wrappers must layer on top of the same base components used in production rendering so editor mode and live mode stay aligned.
