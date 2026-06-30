import type {
  TenantSiteConfig,
  WebsitePageConfig,
  WebsiteSiteBaseColor,
  WebsiteSiteIconLibrary,
  WebsiteSiteMenuAccent,
  WebsiteSiteMenuStyle,
  WebsiteSiteRadius,
  WebsiteSiteStylePreset,
  WebsiteTemplateConfiguration,
  WebsiteTemplateDefinition,
  WebsiteTemplatePageKey,
} from "./types";

const SITE_STYLE_PRESETS = new Set<WebsiteSiteStylePreset>([
  "nova",
  "vega",
  "maia",
  "mira",
  "lyra",
  "classic-academic",
  "bright-campus",
  "sunlit-family",
  "executive-campus",
]);

const BASE_COLORS = new Set<WebsiteSiteBaseColor>([
  "slate",
  "zinc",
  "neutral",
  "stone",
  "taupe",
]);

const ICON_LIBRARIES = new Set<WebsiteSiteIconLibrary>([
  "lucide",
  "tabler",
  "phosphor",
]);

const RADII = new Set<WebsiteSiteRadius>([
  "none",
  "sm",
  "md",
  "lg",
  "xl",
  "full",
]);

const MENU_STYLES = new Set<WebsiteSiteMenuStyle>([
  "default",
  "translucent",
  "solid",
]);

const MENU_ACCENTS = new Set<WebsiteSiteMenuAccent>([
  "subtle",
  "bold",
  "none",
]);

function pickSetValue<T extends string>(
  value: unknown,
  values: Set<T>,
  fallback: T
): T {
  return typeof value === "string" && values.has(value as T)
    ? (value as T)
    : fallback;
}

function getThemeValue(
  config: WebsiteTemplateConfiguration,
  key: keyof WebsiteTemplateConfiguration["themeConfig"],
  fallback: string
) {
  const value = config.themeConfig[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function resolvePageConfigs(
  template: WebsiteTemplateDefinition,
  config: WebsiteTemplateConfiguration
): Partial<Record<WebsiteTemplatePageKey, WebsitePageConfig>> {
  return Object.fromEntries(
    template.manifest.pages.map((page) => {
      const sectionOrder =
        config.sectionOrder?.[page.key] ?? page.sections.map((section) => section.key);

      return [
        page.key,
        {
          sections: sectionOrder.map((sectionKey) => {
            const baseSectionKey = sectionKey.split("__dup")[0] ?? sectionKey;
            const section = page.sections.find(
              (candidate) => candidate.key === baseSectionKey
            );

            return {
              id: sectionKey,
              sectionKey: baseSectionKey,
              visible:
                section?.required
                  ? true
                  : config.sectionVisibility[sectionKey] ??
                    config.sectionVisibility[baseSectionKey] ??
                    section?.defaultVisible ??
                    true,
            };
          }),
        },
      ];
    })
  ) as Partial<Record<WebsiteTemplatePageKey, WebsitePageConfig>>;
}

export function resolveTenantSiteConfig(
  template: WebsiteTemplateDefinition,
  config: WebsiteTemplateConfiguration
): TenantSiteConfig {
  return {
    template: config.templateId,
    style: pickSetValue(
      config.themeConfig.stylePreset,
      SITE_STYLE_PRESETS,
      "classic-academic"
    ),
    baseColor: pickSetValue(config.themeConfig.baseColor, BASE_COLORS, "slate"),
    theme: getThemeValue(config, "theme", config.themeConfig.primaryColor),
    chartColor: getThemeValue(config, "chartColor", config.themeConfig.accentColor),
    heading: config.themeConfig.headingFont,
    font: config.themeConfig.bodyFont,
    iconLibrary: pickSetValue(
      config.themeConfig.iconLibrary,
      ICON_LIBRARIES,
      "lucide"
    ),
    radius: pickSetValue(config.themeConfig.radius, RADII, "lg"),
    menuStyle: pickSetValue(
      config.themeConfig.menuStyle,
      MENU_STYLES,
      "default"
    ),
    menuAccent: pickSetValue(
      config.themeConfig.menuAccent,
      MENU_ACCENTS,
      "subtle"
    ),
    enabledFeatures: Object.fromEntries(
      template.manifest.features.map((feature) => [feature, true])
    ),
    pages: resolvePageConfigs(template, config),
  };
}
