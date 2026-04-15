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

## APIs
- Registry listing endpoint/query filtered by institution type and plan
- Template manifest loader for preview/editor mode
- Tenant draft configuration create, update, duplicate, archive, and publish operations
- AI generation action scoped to a single editable field with template, tenant, page, and section context
- Public website configuration resolver used by `apps/school-site`
- TODO: final API transport should align with the platform's tRPC conventions

## UI/UX Notes
- The registry should feel premium and similar in clarity to shadcn's create flow: browse, preview, configure, and publish.
- Templates must support multi-page preview rather than homepage-only preview.
- Editable fields should support direct inline editing with clear click guards and focus boundaries.
- Each editable area should expose an AI action affordance in the top-right.
- Preview mode should look as close to production as possible while preventing accidental navigation away from the editor.
- Section toggles should update preview immediately and preserve layout integrity.
- Draft editing must remain isolated from the currently published live website.

## Permissions
- Tenant admins or equivalent website-management roles can create, edit, duplicate, archive, and publish template configurations.
- Plan restrictions must gate template availability, premium sections, and advanced configuration options.
- Public users can only access the published configuration through `apps/school-site`.

## Edge Cases
- Tenant has multiple drafts but no published configuration yet
- Published configuration references optional sections that are now disabled by plan downgrade
- Template evolves after a tenant has saved older configuration data
- Hidden sections affect page composition or dependent blocks
- Editable fields require different validation rules by content type or page context
- Production data sources such as blog, news, or resources are unavailable during preview and need safe fallback data
- Domain or subdomain resolution fails and public website rendering must degrade safely

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
- Whether replacing a published website config should set the old config back to `DRAFT` or preserve a distinct historical publish marker

## Implementation Direction
- Public website runtime lives in `apps/school-site`.
- Registry, manifests, preview/editor helpers, hooks, guards, and render utilities live in `packages/template-registry`.
- Templates are grouped by institution type and plan, for example `templates/k-12/plus/template-1`.
- Templates are multi-page and schema-driven.
- Templates must work in both preview/editor mode and production mode by switching between sample preview data and tenant production data through shared resolvers.
- Detailed implementation architecture is documented in [brain/engineering/school-website-template-platform-implementation.md](/Users/M1PRO/Documents/code/school-clerk/brain/engineering/school-website-template-platform-implementation.md).

## Design System Rule
- Shadcn components are the base UI foundation across registry, editor, preview, and live rendering.
- Templates are not separate design systems; they are presentation layers built on top of shared shadcn-based primitives and reusable website blocks.
- Template uniqueness should come from composition, variants, wrappers, spacing, typography, and theme tokens rather than duplicated raw primitives.
- Inline editor wrappers must layer on top of the same base components used in production rendering so editor mode and live mode stay aligned.
