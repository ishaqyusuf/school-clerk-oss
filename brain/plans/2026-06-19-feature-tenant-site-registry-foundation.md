# Tenant Site Registry Foundation

## Purpose

Implement the next architecture step for the school website template system: a tenant-config-driven registry runtime with adaptive common primitives, section/feature composition, editor-friendly field boundaries, and production/dummy mode support.

## Context

- Existing `packages/template-registry` already has manifests, three K-12 templates, preview/editor helpers, media references, mock content, and public rendering support.
- The next direction is to make the registry section/feature based instead of template-page-only.
- Tenant site configuration should mirror the shadcn create/preset mental model: template, base color, style, theme, chart color, heading font, body font, icon library, radius, menu style, and feature/section choices.

## Target Architecture

- `packages/template-registry` remains the shared registry package.
- `apps/school-site` owns public routes and production request resolution.
- Registry root provider supplies tenant, config, mode, router hooks, content adapters, style tokens, and edit helpers to templates, sections, and common primitives.
- Templates become curated recipes that compose shared features/sections and common site primitives.
- Common primitives under `packages/template-registry/src/common` auto-adapt to tenant style config.

## Feature Checklist

- Tenant site config type supports template switching, style presets, base color, theme color, chart color, heading/body fonts, icon library, radius, menu style, menu accent, enabled features, and enabled sections.
- Registry provider exposes `useRegistry()` and `useTenantConfig()` for common primitives, templates, and feature sections.
- Registry mode supports `production`, `preview`, `editor`, and `dummy`.
- Common UI primitives include adaptive `Button`, `Input`, `Text`, and `Section`.
- Common shell primitives include `SiteShell`, `SiteHeader`, `SiteFooter`, and `SectionContainer`.
- Editable text remains explicit through field keys so tenant edits are saved into versioned template config content instead of making every text node editable.
- Dummy mode renders templates with safe sample tenant/config/content, while production mode can receive real tenant config from `apps/school-site`.
- Feature sections can disable side-effect actions in template/editor mode while still rendering production-like UI.

## Implementation Phases

1. Add shared tenant site config/schema types and resolver helpers.
2. Add registry runtime/provider/hooks.
3. Add adaptive common UI and shell primitives.
4. Bridge editor preview and public render paths through the provider.
5. Add a first feature-section example, such as newsletter, after the foundation is stable.
6. Expand dashboard editor controls to expose style/base/theme/radius/icon settings.
7. Add immutable revision/publish history model when ready to alter persistence.

## Current Session Scope

- Implement phases 1-4 as a foundation without changing database schema.
- Keep existing templates and public rendering behavior compatible.
- Document remaining work for feature sections, tRPC integration, and immutable revisions.

## Progress

- 2026-06-19: Plan created. Work started on tenant config model, registry provider/hooks, adaptive common primitives, and editor/runtime provider bridge.
- 2026-06-19: Added tenant site config resolver and style token resolver in `packages/template-registry`.
- 2026-06-19: Added `WebsiteRegistryProvider`, `useRegistry()`, `useTenantConfig()`, template mode helpers, and site-client hook foundation.
- 2026-06-19: Added adaptive common public-site primitives: `Button`, `Input`, `Text`, `Section`, `SectionContainer`, and `SiteShell`.
- 2026-06-19: Bridged `renderTemplatePage` through the registry provider so existing public and editor render paths can expose registry context to descendants.
- 2026-06-19: Added first feature-section pattern with `NewsletterHomeSection` and `newsletterFeature`; submit actions are disabled in template modes and can be wired to production handlers later.
- 2026-06-19: Added `Kaleidoscope` (`k12-plus-template-4`), a colourful K-12 template with home, about, homepage blog preview, blog list, and blog detail rendering. The template keeps login/auth outside template ownership by linking to the shared school-site `/login` redirect and honours section visibility for configurable areas.
- 2026-06-19: Added the non-template `apps/school-site` `/login` route, which resolves the public tenant and redirects to that tenant's dashboard login.
- 2026-06-19: Reworked the tenant dashboard website config editor into a shadcn-create-style configurator: live preview canvas, sticky side config rail, template selector, page selector, section visibility controls, style/base/theme/chart/font/icon/radius/menu controls, click-to-edit preview syncing, SEO fields, and AI generation actions that use field AI descriptions.
- 2026-06-19: Added config-backed CMS block management for announcements and blog posts under each website draft. Public and editor content resolvers now derive announcement/blog content from saved draft/published config before falling back to mock data.
- 2026-06-19: Expanded `Kaleidoscope` with announcement header, homepage announcements, CMS-backed homepage blog, featured blog story block, blog listing, and blog detail rendering.

## Deferred

- Newsletter tRPC mutation implementation and site-scoped tRPC client integration.
- Site-specific tRPC client with automatic school id headers.
- Database changes for immutable config revisions.
- Dedicated database-backed CMS/content model beyond the current website-config-backed block collections.
