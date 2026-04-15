import type {
  WebsiteTemplateDefinition,
  WebsiteTemplateId,
  WebsiteTemplatePageKey,
  WebsiteTemplateRenderContext,
} from "./types";
import { websiteTemplateManifestSchema } from "./schema";

export function defineWebsiteTemplate(
  template: WebsiteTemplateDefinition
): WebsiteTemplateDefinition {
  websiteTemplateManifestSchema.parse(template.manifest);

  for (const page of template.manifest.pages) {
    if (!template.renderers[page.key]) {
      throw new Error(
        `Template "${template.manifest.id}" is missing a renderer for page "${page.key}".`
      );
    }
  }

  return template;
}

export function createTemplateRegistry(
  templates: WebsiteTemplateDefinition[]
): Map<WebsiteTemplateId, WebsiteTemplateDefinition> {
  const registry = new Map<WebsiteTemplateId, WebsiteTemplateDefinition>();

  for (const template of templates) {
    if (registry.has(template.manifest.id)) {
      throw new Error(`Duplicate template id "${template.manifest.id}".`);
    }
    registry.set(template.manifest.id, template);
  }

  return registry;
}

export function getTemplateById(
  registry: Map<WebsiteTemplateId, WebsiteTemplateDefinition>,
  templateId: WebsiteTemplateId
): WebsiteTemplateDefinition {
  const template = registry.get(templateId);
  if (!template) {
    throw new Error(`Unknown template "${templateId}".`);
  }
  return template;
}

export function resolvePageKey(
  pathname: string
): WebsiteTemplatePageKey {
  if (pathname === "/" || pathname.length === 0) return "home";
  if (pathname.startsWith("/about")) return "about";
  if (pathname.startsWith("/admissions")) return "admissions";
  if (pathname === "/blog") return "blog-list";
  if (pathname.startsWith("/blog/")) return "blog-post";
  if (pathname === "/events") return "event-list";
  if (pathname.startsWith("/events/")) return "event-post";
  if (pathname === "/resources") return "resource-list";
  if (pathname.startsWith("/resources/")) return "resource-post";
  if (pathname.startsWith("/contact")) return "contact";
  return "home";
}

export function resolveRouteSlug(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  return segments.length > 1 ? segments[segments.length - 1] ?? null : null;
}

export function renderTemplatePage(
  registry: Map<WebsiteTemplateId, WebsiteTemplateDefinition>,
  context: WebsiteTemplateRenderContext
) {
  const template = getTemplateById(registry, context.config.templateId);
  return template.renderers[context.pageKey](context);
}
