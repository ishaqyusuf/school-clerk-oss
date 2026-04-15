# School Website Template Platform Implementation

## Purpose
Translate `WEB-001` into an implementation-ready architecture for `packages/template-registry` and `apps/school-site` that fits the current SchoolClerk monorepo.

## Current Repo Fit
- The monorepo already uses app/package boundaries for isolated runtimes and shared logic.
- Tenant identity already exists through `SchoolProfile` and `TenantDomain` in [packages/db/src/schema/school.prisma](/Users/M1PRO/Documents/code/school-clerk/packages/db/src/schema/school.prisma).
- Dashboard tenant resolution already uses subdomain/custom-domain lookup in [apps/dashboard/src/proxy.ts](/Users/M1PRO/Documents/code/school-clerk/apps/dashboard/src/proxy.ts).
- API context already carries tenant-oriented profile information in [apps/api/src/trpc/init.ts](/Users/M1PRO/Documents/code/school-clerk/apps/api/src/trpc/init.ts).
- The public website platform should reuse the same tenant/domain model instead of introducing a second tenant identity system.

## Recommended Architecture
- `packages/template-registry` owns template manifests, renderer contracts, editable-field schemas, preview/editor hooks, section/config resolvers, and shared website blocks.
- `apps/school-site` owns public routing, tenant/domain resolution, published configuration loading, metadata generation, and server-side website rendering.
- `apps/dashboard` should later own the authenticated template-registry management UI, but the reusable editor/preview engine belongs in `packages/template-registry`.
- `packages/ui` remains the home of shared shadcn-derived primitives. The template-registry package should compose from it rather than fork a second primitive layer.

## Proposed Folder Tree
```text
packages/template-registry/
  package.json
  tsconfig.json
  src/
    index.ts
    constants/
      website-plans.ts
      website-types.ts
    types/
      manifest.ts
      config.ts
      content.ts
      editor.ts
      routes.ts
      tenant-data.ts
    schemas/
      manifest.ts
      template-config.ts
      editable-field.ts
      section-visibility.ts
      ai-generation.ts
    registry/
      create-template-registry.ts
      template-registry.ts
      template-access.ts
      template-loader.ts
    engine/
      render-template.tsx
      render-page.tsx
      resolve-template-mode.ts
      resolve-template-config.ts
      resolve-template-data.ts
      resolve-editable-value.ts
      resolve-section-visibility.ts
      resolve-style-tokens.ts
    hooks/
      use-template-mode.ts
      use-template-config.ts
      use-editable-content.ts
      use-section-visibility.ts
      use-template-routing.ts
      use-production-resources.ts
    guards/
      use-click-guard.ts
      use-preview-navigation-guard.ts
      use-publish-access-guard.ts
      use-template-plan-guard.ts
    components/
      blocks/
        hero/
        testimonials/
        stats/
        gallery/
        news/
        blog/
        admissions/
        contact/
      editor/
        editable-region.tsx
        editable-toolbar.tsx
        ai-generate-button.tsx
        section-outline.tsx
      preview/
        preview-frame.tsx
        preview-page-switcher.tsx
        preview-badge.tsx
      shared/
        template-page-shell.tsx
        section-slot.tsx
    data/
      preview/
        k12.ts
        primary.ts
        secondary.ts
    utils/
      asset-resolver.ts
      ai-field-context.ts
      page-key.ts
      path-builder.ts
      metadata-builder.ts
    templates/
      k-12/
        plus/
          template-1/
            index.ts
            manifest.ts
            assets/
            pages/
              home.tsx
              about.tsx
              admissions.tsx
              blog-list.tsx
              blog-detail.tsx
              contact.tsx
            sections/
              hero.tsx
              programs.tsx
              testimonials.tsx
              faq.tsx
            components/
              navbar.tsx
              footer.tsx
              section-card.tsx

apps/school-site/
  package.json
  tsconfig.json
  next.config.ts
  src/
    app/
      [site]/...
      (public)/
        [[...slug]]/page.tsx
        layout.tsx
        not-found.tsx
      sitemap.ts
      robots.ts
    lib/
      tenant/
        resolve-public-tenant.ts
        resolve-host.ts
      website/
        get-published-template-config.ts
        get-public-website-data.ts
        render-public-page.tsx
        build-public-metadata.ts
      cache/
        website-cache.ts
    components/
      public-site-boundary.tsx
    env.ts
```

## Package Boundaries
- `packages/template-registry`
  - framework-aware React rendering code is allowed
  - cannot own Next.js route handlers or middleware
  - should be reusable by both dashboard preview/editor and public website runtime
- `apps/school-site`
  - owns Next.js-specific request, metadata, caching, and route concerns
  - should stay thin and delegate template concerns into `packages/template-registry`
- `apps/api`
  - should eventually expose website-management procedures for draft CRUD, publish, duplicate, and AI field generation
- `packages/db`
  - owns persistence for tenant website configs and publish state

## Core Type System
```ts
export type WebsiteTemplateId = string;
export type WebsiteTemplatePageKey =
  | "home"
  | "about"
  | "admissions"
  | "academics"
  | "blog-list"
  | "blog-detail"
  | "resources"
  | "events"
  | "event-detail"
  | "gallery"
  | "staff"
  | "contact";

export type WebsiteTemplateMode = "preview" | "editor" | "production";

export type WebsiteInstitutionType =
  | "PRESCHOOL"
  | "PRIMARY"
  | "SECONDARY"
  | "K12"
  | "COLLEGE"
  | "POLYTECHNIC"
  | "UNIVERSITY"
  | "TRAINING_CENTER"
  | "RELIGIOUS_SCHOOL";

export type WebsitePlan = "BASIC" | "PLUS" | "PRO" | "ENTERPRISE";
```

```ts
export type EditableFieldDefinition = {
  key: string;
  label: string;
  description: string;
  contentType:
    | "short-text"
    | "long-text"
    | "rich-text"
    | "list"
    | "cta"
    | "stat"
    | "testimonial"
    | "seo-description";
  sizeGuidance: string;
  tone?: string;
  placeholder?: string;
  allowRichText?: boolean;
  validation?: {
    required?: boolean;
    maxLength?: number;
    maxItems?: number;
  };
  aiContext?: {
    audience?: string;
    pagePurpose?: string;
    sectionPurpose?: string;
  };
};

export type TemplateSectionDefinition = {
  key: string;
  label: string;
  defaultVisible: boolean;
  required?: boolean;
  dependsOn?: string[];
  editables: EditableFieldDefinition[];
};

export type TemplatePageDefinition = {
  key: WebsiteTemplatePageKey;
  label: string;
  route: string;
  sections: TemplateSectionDefinition[];
};

export type WebsiteTemplateManifest = {
  id: WebsiteTemplateId;
  name: string;
  institutionTypes: WebsiteInstitutionType[];
  supportedPlans: WebsitePlan[];
  description: string;
  thumbnail: string;
  previewImages: string[];
  tags: string[];
  features: string[];
  pages: TemplatePageDefinition[];
  themeSchema: WebsiteThemeSchema;
  dataRequirements: string[];
};
```

```ts
export type WebsiteThemeSchema = {
  colorSlots: Array<"primary" | "secondary" | "accent" | "surface">;
  headingFontOptions: string[];
  bodyFontOptions: string[];
  radiusOptions: Array<"none" | "sm" | "md" | "lg" | "full">;
  densityOptions: Array<"compact" | "comfortable" | "airy">;
  stylePresets: string[];
};

export type WebsiteTemplateConfiguration = {
  id: string;
  tenantId: string;
  templateId: WebsiteTemplateId;
  name: string;
  status: "draft" | "published" | "archived";
  content: Record<string, unknown>;
  sectionVisibility: Record<string, boolean>;
  themeConfig: Record<string, unknown>;
  seoConfig: Record<string, unknown>;
  analyticsConfig: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
};
```

## Template Registration Pattern
- Every template exports a typed manifest plus a page renderer map.
- Registry assembly should be explicit and statically analyzable first; avoid magical filesystem scanning in the first version.
- Recommended starter pattern:

```ts
export const templateRegistry = createTemplateRegistry([
  k12PlusTemplate1,
]);
```

```ts
export const k12PlusTemplate1 = defineWebsiteTemplate({
  manifest,
  renderers: {
    home: HomePage,
    about: AboutPage,
    admissions: AdmissionsPage,
    "blog-list": BlogListPage,
    "blog-detail": BlogDetailPage,
    contact: ContactPage,
  },
});
```

This keeps template onboarding simple, typed, and testable.

## Database Proposal
- Keep website persistence tenant-scoped using the existing `SchoolProfile` and `TenantDomain` model.
- Add website-specific tables rather than expanding `SchoolProfile` with large JSON blobs.

### Recommended Models
```prisma
model WebsiteTemplateConfig {
  id               String   @id @default(uuid())
  schoolProfileId  String
  templateId       String
  name             String
  status           WebsiteTemplateConfigStatus @default(DRAFT)
  contentJson      Json
  sectionJson      Json
  themeJson        Json
  seoJson          Json?
  analyticsJson    Json?
  templateVersion  Int      @default(1)
  createdByUserId  String?
  updatedByUserId  String?
  publishedAt      DateTime?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  schoolProfile SchoolProfile @relation(fields: [schoolProfileId], references: [id], onDelete: Cascade)

  @@index([schoolProfileId, status])
  @@index([schoolProfileId, templateId])
}

model WebsitePublishedConfig {
  id               String   @id @default(uuid())
  schoolProfileId  String   @unique
  websiteConfigId  String   @unique
  publishedAt      DateTime @default(now())

  schoolProfile SchoolProfile       @relation(fields: [schoolProfileId], references: [id], onDelete: Cascade)
  websiteConfig WebsiteTemplateConfig @relation(fields: [websiteConfigId], references: [id], onDelete: Cascade)
}

enum WebsiteTemplateConfigStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}
```

### Why this shape
- Supports multiple drafts per tenant
- Makes the active published config a cheap lookup
- Keeps draft and live separation explicit
- Leaves room for future configuration history/version snapshots

## Repository Contract Proposal
- Add a website-specific repository/service boundary instead of letting routes mutate raw JSON directly.

### Recommended repository surface
```ts
type CreateWebsiteTemplateConfigInput = {
  schoolProfileId: string;
  templateId: string;
  name: string;
  createdByUserId?: string;
};

type UpdateWebsiteTemplateConfigInput = {
  id: string;
  schoolProfileId: string;
  contentJson?: Record<string, unknown>;
  sectionJson?: Record<string, boolean>;
  themeJson?: Record<string, unknown>;
  seoJson?: Record<string, unknown>;
  analyticsJson?: Record<string, unknown>;
  updatedByUserId?: string;
};

interface WebsiteTemplateConfigRepository {
  createDraft(input: CreateWebsiteTemplateConfigInput): Promise<WebsiteTemplateConfiguration>;
  updateDraft(input: UpdateWebsiteTemplateConfigInput): Promise<WebsiteTemplateConfiguration>;
  duplicateDraft(input: { id: string; schoolProfileId: string; createdByUserId?: string }): Promise<WebsiteTemplateConfiguration>;
  archiveDraft(input: { id: string; schoolProfileId: string; updatedByUserId?: string }): Promise<void>;
  getDraftById(input: { id: string; schoolProfileId: string }): Promise<WebsiteTemplateConfiguration | null>;
  listTenantConfigs(input: { schoolProfileId: string }): Promise<WebsiteTemplateConfiguration[]>;
  getPublishedConfig(input: { schoolProfileId: string }): Promise<WebsiteTemplateConfiguration | null>;
  publishConfig(input: { id: string; schoolProfileId: string; publishedByUserId?: string }): Promise<WebsiteTemplateConfiguration>;
}
```

### Repository rules
- All repository methods must require `schoolProfileId` to preserve tenant-scoped access patterns already used across the platform.
- `publishConfig` must run in a single transaction:
  - verify config belongs to tenant
  - upsert `WebsitePublishedConfig`
  - set selected config to `PUBLISHED`
  - downgrade previous published config to `DRAFT` or retain historical publish metadata according to final product rule
- Draft updates should reject archived configs.
- Duplicate should copy content/theme/section/SEO state but create a new row with fresh audit timestamps.

## Publish-State Invariants
- A tenant may have zero published configs before first website launch.
- A tenant may have many draft configs.
- A tenant may have many archived configs.
- A tenant may have only one live config at any time.
- The live config must be discoverable in one indexed lookup by `schoolProfileId`.
- Publishing should be idempotent when the selected config is already the active published config.
- Public website reads should never need to scan all configs to find the live one.

## JSON Shape Guidance
- `contentJson`
  - store editable values by stable namespaced key such as `home.hero.title`
  - prefer flat keys over deeply nested arbitrary objects for easier migration and validation
- `sectionJson`
  - store booleans by stable section key such as `home.hero` or `about.staff`
- `themeJson`
  - store only resolved config values, not computed tokens
- `seoJson`
  - reserve page-level namespace, for example `pages.home.title`

## Migration Strategy Guidance
- Version every saved config with `templateVersion`.
- Keep template migration functions close to template manifests inside `packages/template-registry`.
- On read:
  - if stored version matches manifest version, render directly
  - if stored version is behind, migrate config before render or before save depending on final operational preference
- Avoid destructive in-place rewrites without retaining the previous persisted payload for rollback/debugging.

## Routing Strategy
- `apps/school-site` should use host-based tenant resolution similar to dashboard middleware, but for public access.
- Avoid embedding the tenant slug into public URLs for custom-domain traffic.
- Recommended route model:
  - middleware or server utility resolves host to canonical tenant
  - catch-all public route loads page key from pathname
  - template page resolver maps pathname to `WebsiteTemplatePageKey`
- Example:
  - `/` -> `home`
  - `/about` -> `about`
  - `/admissions` -> `admissions`
  - `/blog/my-first-post` -> `blog-detail`

## Preview vs Production Architecture
### Preview/editor mode
- Entry point lives in dashboard-managed UI later
- Loads selected template manifest from registry
- Loads draft config from database or in-memory unsaved state
- Resolves preview/demo data if production resources are unavailable
- Wraps editable regions with inline editor boundaries and click guards
- Blocks external navigation unless explicitly allowed

### Production mode
- Entry point lives in `apps/school-site`
- Resolves host to tenant
- Resolves tenant to published config
- Loads manifest and renderer from registry
- Fetches live data from tenant-owned sources
- Produces metadata, page content, and public render output with no editor affordances

## Public Render Flow
1. Request enters `apps/school-site`.
2. Host is normalized and matched against `TenantDomain`.
3. Canonical `SchoolProfile` is resolved.
4. Active `WebsitePublishedConfig` is loaded.
5. Matching template manifest and renderer are loaded from `packages/template-registry`.
6. Saved content, section visibility, and theme config are resolved.
7. Public tenant resources such as blog posts, announcements, or gallery items are fetched.
8. Page route is mapped to a template page key.
9. Renderer returns the final page tree using shared blocks and theme tokens.

## Editor Flow
1. User selects a template in registry UI.
2. Registry loads the manifest and preview data.
3. User creates or opens a `WebsiteTemplateConfiguration`.
4. Inline editor reads `EditableFieldDefinition` metadata for each editable region.
5. User edits content directly in place.
6. AI action builds field context from template, page, section, tenant profile, and size guidance.
7. Draft changes are saved into website config JSON.
8. Preview rerenders with updated content and current visibility/theme settings.

## Section Toggle Architecture
- Visibility is stored as a flat map keyed by stable section IDs, for example `home.hero` or `about.staff-spotlight`.
- Required sections should be marked in manifest and ignored by hide toggles.
- Section dependency resolution belongs in a shared resolver:
  - explicit visibility flag
  - required override
  - dependency satisfaction
  - fallback to manifest default

## AI Field Generation Design
- AI should operate on a single editable field at a time.
- Prompt context builder should include:
  - institution type
  - tenant/school name
  - template name
  - page key
  - section key
  - field key
  - field description
  - content type
  - size guidance
  - tone
  - nearby field values when helpful
- Keep generation transport outside the template package itself; the package should only build structured context payloads.

## Shared UI Layering
- `packages/ui` owns generic shadcn-derived primitives.
- `packages/template-registry/src/components/blocks` owns website-specific building blocks built from those primitives.
- `packages/template-registry/src/templates/.../components` owns template-specific arrangement and visual personality.
- This preserves the rule that templates are presentation layers, not separate component systems.

## Starter Scaffolding
### Manifest file
```ts
import { defineWebsiteTemplateManifest } from "../../registry/define-template";

export const manifest = defineWebsiteTemplateManifest({
  id: "k12-plus-template-1",
  name: "Scholaris",
  institutionTypes: ["K12", "PRIMARY", "SECONDARY"],
  supportedPlans: ["PLUS", "PRO", "ENTERPRISE"],
  description: "Academic-forward template with admissions and news support.",
  thumbnail: "/templates/k12-plus-template-1/thumbnail.png",
  previewImages: [],
  tags: ["modern", "academic", "trust-building"],
  features: ["multi-page", "news", "admissions", "gallery"],
  pages: [],
  themeSchema: {
    colorSlots: ["primary", "secondary", "accent", "surface"],
    headingFontOptions: ["Cal Sans", "Merriweather"],
    bodyFontOptions: ["Inter", "Source Sans 3"],
    radiusOptions: ["sm", "md", "lg"],
    densityOptions: ["comfortable", "airy"],
    stylePresets: ["classic-academic", "bright-campus"],
  },
  dataRequirements: ["school-profile", "news", "blog", "contact-info"],
});
```

### Editable region wrapper
```tsx
export function EditableRegion(props: EditableRegionProps) {
  if (props.mode === "production") {
    return <>{props.children}</>;
  }

  return (
    <div data-editable-key={props.field.key} className="relative">
      <EditableToolbar field={props.field} />
      {props.children}
    </div>
  );
}
```

### Public page entry
```tsx
export async function renderPublicPage(input: RenderPublicPageInput) {
  const tenant = await resolvePublicTenant(input.host);
  const published = await getPublishedTemplateConfig(tenant.schoolProfileId);
  const pageKey = resolvePageKey(input.pathname, published.templateId);

  return renderTemplatePage({
    mode: "production",
    tenant,
    pageKey,
    config: published,
  });
}
```

## Recommended Delivery Order
1. Add database models and repository helpers for website configs and published state.
2. Scaffold `packages/template-registry` with core types, schemas, registry builder, and one example template manifest.
3. Scaffold `apps/school-site` with host resolution, catch-all routing, and minimal public renderer integration.
4. Add preview/editor engine in dashboard-facing surfaces using the shared package.
5. Add inline editable regions and AI field actions.
6. Add public resource resolvers for blog, news, events, and resources.

## Main Risks
- Template manifests can become inconsistent unless enforced through zod or equivalent runtime validation.
- Live and preview rendering can drift if they do not share the same render pipeline.
- JSON-heavy config storage can become hard to migrate without template versioning.
- Public rendering can become slow if each page fetches too many tenant resources separately.

## Mitigations
- Validate manifests and editable fields at load time.
- Keep a single render engine that only switches by `mode`.
- Store `templateVersion` with each config and add migration utilities early.
- Centralize public data loading behind cached resolvers.

## Follow-up
- This document is the implementation target for `WEB-001`.
- `WEB-002` should next turn this into concrete Prisma schema, repository API, and publish-state invariants.
- `WEB-003` should then scaffold the first registry and preview runtime from this structure.
