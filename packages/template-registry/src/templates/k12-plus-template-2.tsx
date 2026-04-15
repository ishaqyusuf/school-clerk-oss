import type {
  WebsiteTemplateDefinition,
  WebsiteTemplatePageKey,
  WebsiteTemplateRenderContext,
} from "../types";
import { defineWebsiteTemplate } from "../registry";
import { k12PlusTemplate1 } from "./k12-plus-template-1";

function withNorthfieldSkin(
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
          "Family Visits Open",
        "home.hero.title":
          (context.config.content["home.hero.title"] as string | undefined) ||
          "A warmer first impression for families choosing carefully.",
      },
    },
  };
}

const renderers = Object.fromEntries(
  Object.entries(k12PlusTemplate1.renderers).map(([pageKey, renderer]) => [
    pageKey,
    (context: WebsiteTemplateRenderContext) => renderer(withNorthfieldSkin(context)),
  ])
) as Record<WebsiteTemplatePageKey, WebsiteTemplateDefinition["renderers"][WebsiteTemplatePageKey]>;

export const k12PlusTemplate2 = defineWebsiteTemplate({
  manifest: {
    ...k12PlusTemplate1.manifest,
    id: "k12-plus-template-2",
    name: "Northfield",
    description:
      "A warmer, family-facing K-12 starter with softer tones, storytelling energy, and the same editor-compatible page system.",
    tags: ["family-first", "warm", "storytelling"],
    features: [
      ...k12PlusTemplate1.manifest.features,
      "staff-spotlight",
      "announcements",
      "family-facing visual skin",
    ],
    supportedPlans: ["PLUS", "PRO", "ENTERPRISE"],
    defaultThemeConfig: {
      primaryColor: "#9a3412",
      secondaryColor: "#fff7ed",
      accentColor: "#7c3aed",
      surfaceColor: "#fffaf5",
      headingFont: "Palatino",
      bodyFont: "Avenir Next",
      radius: "full",
      density: "airy",
      stylePreset: "sunlit-family",
    },
  },
  renderers,
});
