"use client";

import {
  createContext,
  useContext,
  useMemo,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createMockWebsiteContentData } from "./content-data";
import {
  resolveWebsiteStyleTokens,
  styleVarsToProperties,
  type WebsiteResolvedStyle,
} from "./style-tokens";
import type {
  TenantSiteConfig,
  WebsiteTemplateConfiguration,
  WebsiteTemplateContentData,
  WebsiteTemplateMode,
  WebsiteTenantProfile,
} from "./types";

export type WebsiteRegistryRouter = {
  push?: (href: string) => void;
  replace?: (href: string) => void;
  prefetch?: (href: string) => void;
};

export type WebsiteRegistryContextValue<TSiteClient = unknown> = {
  tenant: WebsiteTenantProfile;
  config: WebsiteTemplateConfiguration;
  siteConfig: TenantSiteConfig;
  mode: WebsiteTemplateMode;
  isTemplateMode: boolean;
  contentData: WebsiteTemplateContentData;
  style: WebsiteResolvedStyle;
  cssVarsStyle: CSSProperties;
  router?: WebsiteRegistryRouter;
  siteClient?: TSiteClient;
};

const WebsiteRegistryContext =
  createContext<WebsiteRegistryContextValue | null>(null);

export function WebsiteRegistryProvider<TSiteClient = unknown>({
  tenant,
  config,
  siteConfig,
  mode,
  contentData,
  router,
  siteClient,
  children,
}: {
  tenant: WebsiteTenantProfile;
  config: WebsiteTemplateConfiguration;
  siteConfig: TenantSiteConfig;
  mode: WebsiteTemplateMode;
  contentData?: WebsiteTemplateContentData;
  router?: WebsiteRegistryRouter;
  siteClient?: TSiteClient;
  children?: ReactNode;
}) {
  const value = useMemo<WebsiteRegistryContextValue<TSiteClient>>(() => {
    const style = resolveWebsiteStyleTokens(siteConfig, config);

    return {
      tenant,
      config,
      siteConfig,
      mode,
      isTemplateMode: mode !== "production",
      contentData: contentData ?? createMockWebsiteContentData(tenant),
      style,
      cssVarsStyle: styleVarsToProperties(style.cssVars),
      router,
      siteClient,
    };
  }, [tenant, config, siteConfig, mode, contentData, router, siteClient]);

  return (
    <WebsiteRegistryContext.Provider value={value}>
      {children}
    </WebsiteRegistryContext.Provider>
  );
}

export function useRegistry<TSiteClient = unknown>() {
  const value = useContext(WebsiteRegistryContext);

  if (!value) {
    throw new Error("useRegistry must be used inside WebsiteRegistryProvider.");
  }

  return value as WebsiteRegistryContextValue<TSiteClient>;
}

export function useTenantConfig() {
  return useRegistry().siteConfig;
}

export function useTemplateMode() {
  const { mode, isTemplateMode } = useRegistry();
  return { mode, isTemplateMode };
}

export function useSiteClient<TSiteClient>() {
  return useRegistry<TSiteClient>().siteClient ?? null;
}
