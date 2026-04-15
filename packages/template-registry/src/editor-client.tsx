"use client";

import { createMockWebsiteContentData } from "./content-data";
import { resolveWebsiteMediaConfig } from "./media";
import { renderTemplatePage } from "./registry";
import { WebsiteEditorProvider, useWebsiteEditor } from "./editor-context";
import type {
  WebsiteMediaAsset,
  WebsiteTemplateConfiguration,
  WebsiteTemplateDefinition,
  WebsiteTemplatePageKey,
  WebsiteTenantProfile,
} from "./types";

function EditorPreviewInner({
  template,
  tenant,
  pageKey,
  mediaAssets,
}: {
  template: WebsiteTemplateDefinition;
  tenant: WebsiteTenantProfile;
  pageKey: WebsiteTemplatePageKey;
  mediaAssets?: WebsiteMediaAsset[];
}) {
  const editor = useWebsiteEditor();

  if (!editor) return null;

  const config =
    mediaAssets?.length
      ? resolveWebsiteMediaConfig(editor.config, mediaAssets)
      : editor.config;

  return renderTemplatePage(
    new Map([[template.manifest.id, template]]),
    {
      mode: "editor",
      tenant,
      config,
      pageKey,
      routeSlug: null,
      pathname: template.manifest.pages.find((page) => page.key === pageKey)?.route,
      contentData: createMockWebsiteContentData(tenant),
    }
  );
}

export function WebsiteTemplateEditorProvider({
  initialConfig,
  mediaAssets,
  children,
}: {
  initialConfig: WebsiteTemplateConfiguration;
  mediaAssets?: WebsiteMediaAsset[];
  children: React.ReactNode;
}) {
  return (
    <WebsiteEditorProvider initialConfig={initialConfig} mediaAssets={mediaAssets}>
      {children}
    </WebsiteEditorProvider>
  );
}

export function WebsiteTemplateEditorPreview(props: {
  template: WebsiteTemplateDefinition;
  tenant: WebsiteTenantProfile;
  pageKey: WebsiteTemplatePageKey;
  mediaAssets?: WebsiteMediaAsset[];
}) {
  return <EditorPreviewInner {...props} />;
}

export { useWebsiteEditor } from "./editor-context";
