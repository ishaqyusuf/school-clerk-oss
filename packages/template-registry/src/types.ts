import type { ReactNode } from "react";

export type WebsiteTemplateId = string;

export type WebsiteTemplateMode = "preview" | "editor" | "production" | "dummy";

export type WebsitePlan = "BASIC" | "PLUS" | "PRO" | "ENTERPRISE";

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

export type WebsiteTemplatePageKey =
  | "home"
  | "about"
  | "admissions"
  | "blog-list"
  | "blog-post"
  | "event-list"
  | "event-post"
  | "resource-list"
  | "resource-post"
  | "contact";

export type WebsiteMediaAsset = {
  id: string;
  schoolProfileId?: string;
  name: string;
  kind: string;
  sourceUrl: string;
  altText?: string | null;
  storageProvider?: string | null;
  storageKey?: string | null;
  mimeType?: string | null;
};

export type EditableFieldDefinition = {
  key: string;
  label: string;
  description: string;
  aiDescription?: string;
  contentType:
    | "short-text"
    | "long-text"
    | "rich-text"
    | "list"
    | "cta"
    | "seo-description"
    | "image-url"
    | "media-asset"
    | "object-list";
  blockPreset?:
    | "testimonials"
    | "gallery"
    | "staff-cards"
    | "feature-cards"
    | "stat-cards"
    | "announcement-cards";
  sizeGuidance: string;
  tone?: string;
  placeholder?: string;
  itemFields?: Array<{
    key: string;
    label: string;
    placeholder?: string;
    input: "text" | "textarea" | "image-url" | "media-asset";
  }>;
};

export type TemplateSectionDefinition = {
  key: string;
  label: string;
  defaultVisible: boolean;
  required?: boolean;
  editables: EditableFieldDefinition[];
};

export type TemplatePageDefinition = {
  key: WebsiteTemplatePageKey;
  label: string;
  route: string;
  sections: TemplateSectionDefinition[];
};

export type WebsiteRegistrySectionDefinition = {
  key: string;
  label: string;
  featureKey?: string;
  supportedPages: WebsiteTemplatePageKey[];
  defaultVisible: boolean;
  editables: EditableFieldDefinition[];
  modes?: WebsiteTemplateMode[];
};

export type WebsiteRegistryFeatureDefinition = {
  key: string;
  label: string;
  description: string;
  sections: WebsiteRegistrySectionDefinition[];
  dataRequirements: string[];
};

export type WebsiteThemeSchema = {
  colorSlots: Array<"primary" | "secondary" | "accent" | "surface">;
  headingFontOptions: string[];
  bodyFontOptions: string[];
  radiusOptions: Array<"none" | "sm" | "md" | "lg" | "full">;
  densityOptions: Array<"compact" | "comfortable" | "airy">;
  stylePresets: string[];
};

export type WebsiteSiteStylePreset =
  | "nova"
  | "vega"
  | "maia"
  | "mira"
  | "lyra"
  | "classic-academic"
  | "bright-campus"
  | "sunlit-family"
  | "executive-campus";

export type WebsiteSiteBaseColor =
  | "slate"
  | "zinc"
  | "neutral"
  | "stone"
  | "taupe";

export type WebsiteSiteIconLibrary = "lucide" | "tabler" | "phosphor";

export type WebsiteSiteRadius = "none" | "sm" | "md" | "lg" | "xl" | "full";

export type WebsiteSiteMenuStyle = "default" | "translucent" | "solid";

export type WebsiteSiteMenuAccent = "subtle" | "bold" | "none";

export type WebsiteSiteThemeConfig = {
  template: WebsiteTemplateId;
  style: WebsiteSiteStylePreset;
  baseColor: WebsiteSiteBaseColor;
  theme: string;
  chartColor: string;
  heading: string;
  font: string;
  iconLibrary: WebsiteSiteIconLibrary;
  radius: WebsiteSiteRadius;
  menuStyle: WebsiteSiteMenuStyle;
  menuAccent: WebsiteSiteMenuAccent;
};

export type WebsitePageSectionConfig = {
  id: string;
  sectionKey: string;
  variant?: string;
  visible: boolean;
};

export type WebsitePageConfig = {
  sections: WebsitePageSectionConfig[];
};

export type TenantSiteConfig = WebsiteSiteThemeConfig & {
  enabledFeatures: Record<string, boolean>;
  pages: Partial<Record<WebsiteTemplatePageKey, WebsitePageConfig>>;
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
  defaultThemeConfig: WebsiteTemplateConfiguration["themeConfig"];
  dataRequirements: string[];
};

export type WebsiteTenantProfile = {
  schoolProfileId: string;
  schoolName: string;
  institutionType: WebsiteInstitutionType;
  subdomain?: string | null;
  customDomain?: string | null;
};

export type WebsiteTemplateConfiguration = {
  id: string;
  tenantId: string;
  templateId: WebsiteTemplateId;
  templateVersion?: number;
  name: string;
  status: "draft" | "published" | "archived";
  content: Record<string, unknown>;
  sectionVisibility: Record<string, boolean>;
  sectionOrder?: Record<string, string[]>;
  themeConfig: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    surfaceColor: string;
    headingFont: string;
    bodyFont: string;
    radius: "none" | "sm" | "md" | "lg" | "full";
    density: "compact" | "comfortable" | "airy";
    stylePreset: string;
    baseColor?: WebsiteSiteBaseColor;
    theme?: string;
    chartColor?: string;
    iconLibrary?: WebsiteSiteIconLibrary;
    menuStyle?: WebsiteSiteMenuStyle;
    menuAccent?: WebsiteSiteMenuAccent;
  };
  seoConfig?: Record<string, unknown>;
  analyticsConfig?: Record<string, unknown>;
};

export type WebsiteCollectionItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  imageUrl?: string;
  publishedAt?: string;
  category?: string;
  ctaLabel?: string;
};

export type WebsiteTemplateContentData = {
  announcements: WebsiteCollectionItem[];
  blogPosts: WebsiteCollectionItem[];
  events: WebsiteCollectionItem[];
  resources: WebsiteCollectionItem[];
};

export type WebsiteTemplateRenderContext = {
  mode: WebsiteTemplateMode;
  tenant: WebsiteTenantProfile;
  config: WebsiteTemplateConfiguration;
  pageKey: WebsiteTemplatePageKey;
  pathname?: string;
  routeSlug?: string | null;
  contentData?: WebsiteTemplateContentData;
};

export type WebsiteTemplatePageRenderer = (
  context: WebsiteTemplateRenderContext,
) => ReactNode;

export type WebsiteTemplateDefinition = {
  manifest: WebsiteTemplateManifest;
  renderers: Record<WebsiteTemplatePageKey, WebsiteTemplatePageRenderer>;
};
