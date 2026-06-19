import type { CSSProperties } from "react";
import type {
  TenantSiteConfig,
  WebsiteSiteRadius,
  WebsiteSiteStylePreset,
  WebsiteTemplateConfiguration,
} from "./types";

export type WebsiteResolvedStyle = {
  name: WebsiteSiteStylePreset;
  radius: WebsiteSiteRadius;
  button: {
    height: string;
    padding: string;
    radius: string;
  };
  input: {
    height: string;
    padding: string;
    radius: string;
  };
  section: {
    padding: string;
    gap: string;
    maxWidth: string;
  };
  shell: {
    headerHeight: string;
  };
  cssVars: Record<string, string>;
};

const presetTokens: Record<
  WebsiteSiteStylePreset,
  Pick<WebsiteResolvedStyle, "button" | "input" | "section" | "shell">
> = {
  nova: {
    button: { height: "2.5rem", padding: "0 1rem", radius: "0.5rem" },
    input: { height: "2.5rem", padding: "0 0.875rem", radius: "0.5rem" },
    section: { padding: "4rem 1.5rem", gap: "1.5rem", maxWidth: "72rem" },
    shell: { headerHeight: "4rem" },
  },
  vega: {
    button: { height: "2.75rem", padding: "0 1.25rem", radius: "0.875rem" },
    input: { height: "2.75rem", padding: "0 1rem", radius: "0.875rem" },
    section: { padding: "6rem 1.5rem", gap: "2rem", maxWidth: "76rem" },
    shell: { headerHeight: "4.5rem" },
  },
  maia: {
    button: { height: "2.75rem", padding: "0 1.125rem", radius: "1.25rem" },
    input: { height: "2.75rem", padding: "0 1rem", radius: "1.25rem" },
    section: { padding: "5rem 1.25rem", gap: "1.75rem", maxWidth: "72rem" },
    shell: { headerHeight: "4.25rem" },
  },
  mira: {
    button: { height: "2.5rem", padding: "0 1rem", radius: "0.75rem" },
    input: { height: "2.5rem", padding: "0 0.875rem", radius: "0.75rem" },
    section: { padding: "4.5rem 1.5rem", gap: "1.5rem", maxWidth: "72rem" },
    shell: { headerHeight: "4rem" },
  },
  lyra: {
    button: { height: "2.5rem", padding: "0 1rem", radius: "0rem" },
    input: { height: "2.5rem", padding: "0 0.875rem", radius: "0rem" },
    section: { padding: "4.75rem 1.5rem", gap: "1.5rem", maxWidth: "72rem" },
    shell: { headerHeight: "4rem" },
  },
  "classic-academic": {
    button: { height: "2.75rem", padding: "0 1.25rem", radius: "0.875rem" },
    input: { height: "2.75rem", padding: "0 1rem", radius: "0.875rem" },
    section: { padding: "5rem 1.5rem", gap: "1.75rem", maxWidth: "72rem" },
    shell: { headerHeight: "4.25rem" },
  },
  "bright-campus": {
    button: { height: "2.75rem", padding: "0 1.125rem", radius: "1rem" },
    input: { height: "2.75rem", padding: "0 1rem", radius: "1rem" },
    section: { padding: "5rem 1.5rem", gap: "1.75rem", maxWidth: "74rem" },
    shell: { headerHeight: "4.25rem" },
  },
  "sunlit-family": {
    button: { height: "3rem", padding: "0 1.25rem", radius: "999px" },
    input: { height: "3rem", padding: "0 1.125rem", radius: "999px" },
    section: { padding: "6rem 1.5rem", gap: "2rem", maxWidth: "76rem" },
    shell: { headerHeight: "4.75rem" },
  },
  "executive-campus": {
    button: { height: "2.75rem", padding: "0 1.25rem", radius: "0.625rem" },
    input: { height: "2.75rem", padding: "0 1rem", radius: "0.625rem" },
    section: { padding: "5.5rem 1.5rem", gap: "1.75rem", maxWidth: "76rem" },
    shell: { headerHeight: "4.5rem" },
  },
};

const radiusValues: Record<WebsiteSiteRadius, string> = {
  none: "0rem",
  sm: "0.375rem",
  md: "0.625rem",
  lg: "0.875rem",
  xl: "1.25rem",
  full: "999px",
};

export function resolveWebsiteStyleTokens(
  siteConfig: TenantSiteConfig,
  config: WebsiteTemplateConfiguration
): WebsiteResolvedStyle {
  const preset = presetTokens[siteConfig.style] ?? presetTokens["classic-academic"];
  const radius = radiusValues[siteConfig.radius] ?? radiusValues.lg;

  return {
    name: siteConfig.style,
    radius: siteConfig.radius,
    button: {
      ...preset.button,
      radius,
    },
    input: {
      ...preset.input,
      radius,
    },
    section: preset.section,
    shell: preset.shell,
    cssVars: {
      "--site-primary": config.themeConfig.primaryColor,
      "--site-secondary": config.themeConfig.secondaryColor,
      "--site-accent": config.themeConfig.accentColor,
      "--site-surface": config.themeConfig.surfaceColor,
      "--site-theme": siteConfig.theme,
      "--site-chart": siteConfig.chartColor,
      "--site-radius": radius,
      "--site-heading-font": siteConfig.heading,
      "--site-body-font": siteConfig.font,
    },
  };
}

export function styleVarsToProperties(vars: Record<string, string>) {
  return vars as CSSProperties;
}
