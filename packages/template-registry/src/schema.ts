import { z } from "zod";

export const editableFieldDefinitionSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  contentType: z.enum([
    "short-text",
    "long-text",
    "rich-text",
    "list",
    "cta",
    "seo-description",
    "image-url",
    "media-asset",
    "object-list",
  ]),
  blockPreset: z
    .enum([
      "testimonials",
      "gallery",
      "staff-cards",
      "feature-cards",
      "stat-cards",
      "announcement-cards",
    ])
    .optional(),
  sizeGuidance: z.string().min(1),
  tone: z.string().optional(),
  placeholder: z.string().optional(),
  itemFields: z
    .array(
      z.object({
        key: z.string().min(1),
        label: z.string().min(1),
        placeholder: z.string().optional(),
        input: z.enum(["text", "textarea", "image-url", "media-asset"]),
      })
    )
    .optional(),
});

export const templateSectionDefinitionSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  defaultVisible: z.boolean(),
  required: z.boolean().optional(),
  editables: z.array(editableFieldDefinitionSchema),
});

export const templatePageDefinitionSchema = z.object({
  key: z.enum([
    "home",
    "about",
    "admissions",
    "blog-list",
    "blog-post",
    "event-list",
    "event-post",
    "resource-list",
    "resource-post",
    "contact",
  ]),
  label: z.string().min(1),
  route: z.string().min(1),
  sections: z.array(templateSectionDefinitionSchema),
});

export const websiteTemplateManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  institutionTypes: z.array(
    z.enum([
      "PRESCHOOL",
      "PRIMARY",
      "SECONDARY",
      "K12",
      "COLLEGE",
      "POLYTECHNIC",
      "UNIVERSITY",
      "TRAINING_CENTER",
      "RELIGIOUS_SCHOOL",
    ])
  ),
  supportedPlans: z.array(z.enum(["BASIC", "PLUS", "PRO", "ENTERPRISE"])),
  description: z.string().min(1),
  thumbnail: z.string(),
  previewImages: z.array(z.string()),
  tags: z.array(z.string()),
  features: z.array(z.string()),
  pages: z.array(templatePageDefinitionSchema),
  themeSchema: z.object({
    colorSlots: z.array(
      z.enum(["primary", "secondary", "accent", "surface"])
    ),
    headingFontOptions: z.array(z.string()),
    bodyFontOptions: z.array(z.string()),
    radiusOptions: z.array(z.enum(["none", "sm", "md", "lg", "full"])),
    densityOptions: z.array(z.enum(["compact", "comfortable", "airy"])),
    stylePresets: z.array(z.string()),
  }),
  defaultThemeConfig: z.object({
    primaryColor: z.string().min(1),
    secondaryColor: z.string().min(1),
    accentColor: z.string().min(1),
    surfaceColor: z.string().min(1),
    headingFont: z.string().min(1),
    bodyFont: z.string().min(1),
    radius: z.enum(["none", "sm", "md", "lg", "full"]),
    density: z.enum(["compact", "comfortable", "airy"]),
    stylePreset: z.string().min(1),
  }),
  dataRequirements: z.array(z.string()),
});
