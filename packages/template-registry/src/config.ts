import type { WebsiteTemplateConfiguration, WebsiteTemplateDefinition } from "./types";
import { upgradeTemplateConfiguration } from "./upgrades";

type RawTemplateRecord = {
  id: string;
  schoolProfileId: string;
  templateId: string;
  name: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  contentJson: unknown;
  sectionJson: unknown;
  themeJson: unknown;
  seoJson: unknown;
  analyticsJson: unknown;
  templateVersion?: number | null;
};

function normalizeSectionJson(
  value: unknown,
  template: WebsiteTemplateDefinition
): {
  sectionVisibility: Record<string, boolean>;
  sectionOrder: Record<string, string[]>;
} {
  const defaultOrder = Object.fromEntries(
    template.manifest.pages.map((page) => [
      page.key,
      page.sections.map((section) => section.key),
    ])
  );

  if (typeof value === "object" && value && "visibility" in value) {
    const record = value as {
      visibility?: Record<string, boolean>;
      order?: Record<string, string[]>;
    };

    return {
      sectionVisibility: record.visibility ?? {},
      sectionOrder: {
        ...defaultOrder,
        ...(record.order ?? {}),
      },
    };
  }

  return {
    sectionVisibility:
      typeof value === "object" && value ? (value as Record<string, boolean>) : {},
    sectionOrder: defaultOrder,
  };
}

export function normalizeWebsiteTemplateConfigRecord(
  template: WebsiteTemplateDefinition,
  schoolProfileId: string,
  record: RawTemplateRecord,
  fallbackTheme?: WebsiteTemplateConfiguration["themeConfig"]
): WebsiteTemplateConfiguration {
  const normalizedSection = normalizeSectionJson(record.sectionJson, template);
  const resolvedFallbackTheme = fallbackTheme ?? template.manifest.defaultThemeConfig;

  return upgradeTemplateConfiguration(template, {
    id: record.id,
    tenantId: schoolProfileId,
    templateId: record.templateId,
    templateVersion: record.templateVersion ?? 1,
    name: record.name,
    status: record.status.toLowerCase() as "draft" | "published" | "archived",
    content:
      typeof record.contentJson === "object" && record.contentJson
        ? (record.contentJson as Record<string, unknown>)
        : {},
    sectionVisibility: normalizedSection.sectionVisibility,
    sectionOrder: normalizedSection.sectionOrder,
    themeConfig: {
      ...resolvedFallbackTheme,
      ...(typeof record.themeJson === "object" && record.themeJson
        ? (record.themeJson as Record<string, unknown>)
        : {}),
    } as WebsiteTemplateConfiguration["themeConfig"],
    seoConfig:
      typeof record.seoJson === "object" && record.seoJson
        ? (record.seoJson as Record<string, unknown>)
        : {},
    analyticsConfig:
      typeof record.analyticsJson === "object" && record.analyticsJson
        ? (record.analyticsJson as Record<string, unknown>)
        : {},
  });
}
