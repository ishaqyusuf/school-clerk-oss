"use client";

import { useWebsiteEditor } from "./editor-context";
import { useRegistry } from "./registry-context";
import type { WebsiteTemplatePageKey } from "./types";

export function useEditableField(fieldKey: string) {
  const registry = useRegistry();
  const editor = useWebsiteEditor();
  const config = editor?.config ?? registry.config;
  const value = config.content[fieldKey];

  return {
    value,
    text: typeof value === "string" ? value : "",
    isEditable: registry.mode === "editor" && !!editor,
    setValue: (nextValue: string) => {
      editor?.setFieldValue(fieldKey, nextValue);
    },
  };
}

export function useFeatureEnabled(featureKey: string) {
  const { siteConfig } = useRegistry();
  return siteConfig.enabledFeatures[featureKey] ?? false;
}

export function usePageSections(pageKey: WebsiteTemplatePageKey) {
  const { siteConfig } = useRegistry();
  return siteConfig.pages[pageKey]?.sections ?? [];
}
