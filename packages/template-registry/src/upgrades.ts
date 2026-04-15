import type {
  TemplatePageDefinition,
  WebsiteTemplateConfiguration,
  WebsiteTemplateDefinition,
} from "./types";

export const CURRENT_TEMPLATE_CONFIG_VERSION = 2;

function parseObjectListString(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return value;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : value;
  } catch {
    return value;
  }
}

function getDefaultSectionOrder(pages: TemplatePageDefinition[]) {
  return Object.fromEntries(
    pages.map((page) => [page.key, page.sections.map((section) => section.key)])
  );
}

export function upgradeTemplateConfiguration(
  template: WebsiteTemplateDefinition,
  config: WebsiteTemplateConfiguration
): WebsiteTemplateConfiguration {
  const nextContent = Object.fromEntries(
    Object.entries(config.content).map(([key, value]) => [key, parseObjectListString(value)])
  );

  const defaultSectionOrder = getDefaultSectionOrder(template.manifest.pages);

  return {
    ...config,
    templateVersion: CURRENT_TEMPLATE_CONFIG_VERSION,
    content: nextContent,
    sectionOrder: {
      ...defaultSectionOrder,
      ...(config.sectionOrder ?? {}),
    },
  };
}
