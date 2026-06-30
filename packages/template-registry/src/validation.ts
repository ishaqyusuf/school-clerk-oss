import type {
  EditableFieldDefinition,
  TemplateSectionDefinition,
  WebsiteTemplateConfiguration,
  WebsiteTemplateDefinition,
  WebsiteTemplatePageKey,
} from "./types";

const CMS_CONTENT_KEYS = new Set([
  "cms.announcements",
  "cms.blogPosts",
  "cms.events",
  "cms.resources",
]);

const SITE_STYLE_PRESETS = new Set([
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
const BASE_COLORS = new Set(["slate", "zinc", "neutral", "stone", "taupe"]);
const ICON_LIBRARIES = new Set(["lucide", "tabler", "phosphor"]);
const MENU_STYLES = new Set(["default", "translucent", "solid"]);
const MENU_ACCENTS = new Set(["subtle", "bold", "none"]);

type ValidationInput = {
  content: Record<string, unknown>;
  sectionVisibility: Record<string, boolean>;
  sectionOrder: Record<string, string[]>;
  themeConfig: Record<string, unknown>;
  seoConfig: Record<string, unknown>;
};

type EditableEntry = {
  field: EditableFieldDefinition;
  scopedKey: string;
};

function baseSectionKey(sectionEntryKey: string) {
  return sectionEntryKey.split("__dup")[0] ?? sectionEntryKey;
}

function scopedFieldKey(
  fieldKey: string,
  sectionEntryKey: string,
  sectionKey: string,
) {
  return fieldKey.startsWith(`${sectionKey}.`)
    ? fieldKey.replace(sectionKey, sectionEntryKey)
    : fieldKey;
}

function sectionByKey(
  sections: TemplateSectionDefinition[],
  sectionEntryKey: string,
) {
  const baseKey = baseSectionKey(sectionEntryKey);
  return sections.find((section) => section.key === baseKey) ?? null;
}

function parseObjectList(value: unknown) {
  if (Array.isArray(value)) return value;

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function normalizeObjectListValue(
  field: EditableFieldDefinition,
  value: unknown,
) {
  const allowedItemKeys = new Set((field.itemFields ?? []).map((item) => item.key));

  return parseObjectList(value).flatMap((item) => {
    if (typeof item !== "object" || !item) return [];

    return [
      Object.fromEntries(
        Object.entries(item as Record<string, unknown>)
          .filter(([key]) => allowedItemKeys.size === 0 || allowedItemKeys.has(key))
          .map(([key, itemValue]) => [key, String(itemValue ?? "").slice(0, 2000)]),
      ),
    ];
  });
}

function isSafePublicUrl(value: string) {
  if (!value.trim()) return true;
  if (value.startsWith("media:")) return true;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeContentValue(field: EditableFieldDefinition, value: unknown) {
  if (field.contentType === "object-list") {
    return normalizeObjectListValue(field, value);
  }

  const text = String(value ?? "").slice(0, 8000);

  if (
    (field.contentType === "image-url" || field.contentType === "media-asset") &&
    !isSafePublicUrl(text)
  ) {
    throw new Error(`Invalid media URL for "${field.label}".`);
  }

  return text;
}

function normalizeSectionOrder(
  template: WebsiteTemplateDefinition,
  input: Record<string, string[]>,
) {
  return Object.fromEntries(
    template.manifest.pages.map((page) => {
      const knownSections = new Set(page.sections.map((section) => section.key));
      const defaultOrder = page.sections.map((section) => section.key);
      const rawOrder = Array.isArray(input[page.key]) ? input[page.key] : defaultOrder;
      const seen = new Set<string>();
      const order = rawOrder.flatMap((sectionEntryKey) => {
        const value = String(sectionEntryKey);
        const baseKey = baseSectionKey(value);

        if (!knownSections.has(baseKey) || seen.has(value)) return [];
        seen.add(value);
        return [value];
      });

      for (const section of page.sections) {
        if (section.required && !order.some((entry) => baseSectionKey(entry) === section.key)) {
          order.unshift(section.key);
        }
      }

      return [page.key, order.length ? order : defaultOrder];
    }),
  ) as Record<string, string[]>;
}

function getEditableEntries(
  template: WebsiteTemplateDefinition,
  sectionOrder: Record<string, string[]>,
): EditableEntry[] {
  const entries: EditableEntry[] = [];

  for (const page of template.manifest.pages) {
    const pageOrder = sectionOrder[page.key] ?? page.sections.map((section) => section.key);

    for (const sectionEntryKey of pageOrder) {
      const section = sectionByKey(page.sections, sectionEntryKey);
      if (!section) continue;

      for (const field of section.editables) {
        entries.push({
          field,
          scopedKey: scopedFieldKey(field.key, sectionEntryKey, section.key),
        });
      }
    }
  }

  return entries;
}

function normalizeSectionVisibility(
  template: WebsiteTemplateDefinition,
  sectionOrder: Record<string, string[]>,
  input: Record<string, boolean>,
) {
  const visibility: Record<string, boolean> = {};

  for (const page of template.manifest.pages) {
    for (const sectionEntryKey of sectionOrder[page.key] ?? []) {
      const section = sectionByKey(page.sections, sectionEntryKey);
      if (!section) continue;

      visibility[sectionEntryKey] = section.required
        ? true
        : (input[sectionEntryKey] ?? input[section.key] ?? section.defaultVisible);
    }
  }

  return visibility;
}

function pickStringSet(
  value: unknown,
  values: readonly string[],
  fallback: string,
) {
  return typeof value === "string" && values.includes(value) ? value : fallback;
}

function pickSet(value: unknown, values: Set<string>, fallback: string) {
  return typeof value === "string" && values.has(value) ? value : fallback;
}

function normalizeColor(value: unknown, fallback: string) {
  const color = typeof value === "string" ? value.trim() : "";
  return /^#[0-9a-f]{3,8}$/i.test(color) ? color : fallback;
}

function normalizeThemeConfig(
  template: WebsiteTemplateDefinition,
  input: Record<string, unknown>,
) {
  const fallback = template.manifest.defaultThemeConfig;
  const schema = template.manifest.themeSchema;

  return {
    primaryColor: normalizeColor(input.primaryColor, fallback.primaryColor),
    secondaryColor: normalizeColor(input.secondaryColor, fallback.secondaryColor),
    accentColor: normalizeColor(input.accentColor, fallback.accentColor),
    surfaceColor: normalizeColor(input.surfaceColor, fallback.surfaceColor),
    headingFont: pickStringSet(
      input.headingFont,
      schema.headingFontOptions,
      fallback.headingFont,
    ),
    bodyFont: pickStringSet(input.bodyFont, schema.bodyFontOptions, fallback.bodyFont),
    radius: pickStringSet(input.radius, schema.radiusOptions, fallback.radius),
    density: pickStringSet(input.density, schema.densityOptions, fallback.density),
    stylePreset: pickStringSet(
      input.stylePreset,
      schema.stylePresets,
      fallback.stylePreset,
    ),
    baseColor: pickSet(input.baseColor, BASE_COLORS, fallback.baseColor ?? "slate"),
    theme: normalizeColor(input.theme, fallback.theme ?? fallback.primaryColor),
    chartColor: normalizeColor(
      input.chartColor,
      fallback.chartColor ?? fallback.accentColor,
    ),
    iconLibrary: pickSet(input.iconLibrary, ICON_LIBRARIES, fallback.iconLibrary ?? "lucide"),
    menuStyle: pickSet(input.menuStyle, MENU_STYLES, fallback.menuStyle ?? "default"),
    menuAccent: pickSet(input.menuAccent, MENU_ACCENTS, fallback.menuAccent ?? "subtle"),
  } as WebsiteTemplateConfiguration["themeConfig"];
}

function isAllowedSeoKey(
  template: WebsiteTemplateDefinition,
  key: string,
) {
  if (key === "siteDescription" || key === "siteOgImage") return true;

  return template.manifest.pages.some((page) =>
    [
      `pages.${page.key}.title`,
      `pages.${page.key}.description`,
      `pages.${page.key}.ogImage`,
      `pages.${page.key}.canonicalUrl`,
    ].includes(key),
  );
}

function normalizeSeoConfig(
  template: WebsiteTemplateDefinition,
  input: Record<string, unknown>,
) {
  const seo: Record<string, string> = {};

  for (const [key, rawValue] of Object.entries(input)) {
    if (!isAllowedSeoKey(template, key)) continue;

    const value = String(rawValue ?? "").trim().slice(0, 2000);
    const isUrlField = key.endsWith(".ogImage") || key.endsWith(".canonicalUrl") || key === "siteOgImage";

    if (isUrlField && value && !isSafePublicUrl(value)) {
      throw new Error(`Invalid SEO URL for "${key}".`);
    }

    seo[key] = value;
  }

  return seo;
}

export function normalizeWebsiteTemplateConfigInput(
  template: WebsiteTemplateDefinition,
  input: ValidationInput,
) {
  const sectionOrder = normalizeSectionOrder(template, input.sectionOrder);
  const sectionVisibility = normalizeSectionVisibility(
    template,
    sectionOrder,
    input.sectionVisibility,
  );
  const editableEntries = getEditableEntries(template, sectionOrder);
  const editableByKey = new Map(editableEntries.map((entry) => [entry.scopedKey, entry.field]));
  const content: Record<string, unknown> = {};

  for (const [key, rawValue] of Object.entries(input.content)) {
    if (CMS_CONTENT_KEYS.has(key)) {
      content[key] = normalizeObjectListValue(
        {
          key,
          label: key,
          description: key,
          contentType: "object-list",
          sizeGuidance: "CMS block collection",
        },
        rawValue,
      );
      continue;
    }

    const field = editableByKey.get(key);
    if (!field) continue;

    content[key] = normalizeContentValue(field, rawValue);
  }

  return {
    content,
    sectionVisibility,
    sectionOrder,
    themeConfig: normalizeThemeConfig(template, input.themeConfig),
    seoConfig: normalizeSeoConfig(template, input.seoConfig),
  };
}

export function getTemplatePageRoute(
  template: WebsiteTemplateDefinition,
  pageKey: WebsiteTemplatePageKey,
) {
  return template.manifest.pages.find((page) => page.key === pageKey)?.route ?? "/";
}
