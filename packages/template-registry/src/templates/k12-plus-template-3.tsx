import type {
  WebsiteTemplateDefinition,
  WebsiteTemplatePageKey,
  WebsiteTemplateRenderContext,
} from "../types";
import { defineWebsiteTemplate } from "../registry";
import { k12PlusTemplate1 } from "./k12-plus-template-1";

function withCrestviewSkin(
  context: WebsiteTemplateRenderContext
): WebsiteTemplateRenderContext {
  return {
    ...context,
    config: {
      ...context.config,
      content: {
        ...context.config.content,
        "home.hero.kicker":
          (context.config.content["home.hero.kicker"] as string | undefined) ||
          "Leadership Pathways",
        "home.hero.title":
          (context.config.content["home.hero.title"] as string | undefined) ||
          "A sharper, future-facing school presence for ambitious families.",
      },
    },
  };
}

const renderers = Object.fromEntries(
  Object.entries(k12PlusTemplate1.renderers).map(([pageKey, renderer]) => [
    pageKey,
    (context: WebsiteTemplateRenderContext) => renderer(withCrestviewSkin(context)),
  ])
) as Record<WebsiteTemplatePageKey, WebsiteTemplateDefinition["renderers"][WebsiteTemplatePageKey]>;

export const k12PlusTemplate3 = defineWebsiteTemplate({
  manifest: {
    ...k12PlusTemplate1.manifest,
    id: "k12-plus-template-3",
    name: "Crestview",
    description:
      "A crisper, leadership-oriented K-12 template with cooler contrast and a more premium institutional tone.",
    tags: ["premium", "future-facing", "leadership"],
    features: [
      ...k12PlusTemplate1.manifest.features,
      "executive-branding",
      "premium-contrast skin",
    ],
    supportedPlans: ["PRO", "ENTERPRISE"],
    defaultThemeConfig: {
      primaryColor: "#0f172a",
      secondaryColor: "#e0f2fe",
      accentColor: "#14b8a6",
      surfaceColor: "#f8fafc",
      headingFont: "Cal Sans",
      bodyFont: "Source Sans 3",
      radius: "md",
      density: "comfortable",
      stylePreset: "executive-campus",
    },
  },
  renderers,
});
