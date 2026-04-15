"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { WebsiteMediaAsset, WebsiteTemplateConfiguration } from "./types";

type WebsiteEditorContextValue = {
  config: WebsiteTemplateConfiguration;
  mediaAssets: WebsiteMediaAsset[];
  setDraftName: (value: string) => void;
  setFieldValue: (key: string, value: string) => void;
  addObjectListItem: (key: string, item: Record<string, string>) => void;
  setObjectListValue: (
    key: string,
    value: Array<Record<string, string>>
  ) => void;
  setObjectListItemValue: (
    key: string,
    itemIndex: number,
    itemKey: string,
    value: string
  ) => void;
  removeObjectListItem: (key: string, itemIndex: number) => void;
  moveSection: (
    pageKey: string,
    sectionKey: string,
    direction: "up" | "down"
  ) => void;
  duplicateSection: (pageKey: string, sectionKey: string) => void;
  setSectionVisibility: (key: string, value: boolean) => void;
  setThemeValue: (
    key: keyof WebsiteTemplateConfiguration["themeConfig"],
    value: string
  ) => void;
};

const WebsiteEditorContext = createContext<WebsiteEditorContextValue | null>(null);

export function WebsiteEditorProvider({
  initialConfig,
  mediaAssets = [],
  children,
}: {
  initialConfig: WebsiteTemplateConfiguration;
  mediaAssets?: WebsiteMediaAsset[];
  children: ReactNode;
}) {
  const [config, setConfig] = useState(initialConfig);

  const value = useMemo<WebsiteEditorContextValue>(
    () => ({
      config,
      mediaAssets,
      setDraftName: (value) => {
        setConfig((current) => ({
          ...current,
          name: value,
        }));
      },
      setFieldValue: (key, value) => {
        setConfig((current) => ({
          ...current,
          content: {
            ...current.content,
            [key]: value,
          },
        }));
      },
      addObjectListItem: (key, item) => {
        setConfig((current) => {
          const currentValue = current.content[key];
          const nextItems = Array.isArray(currentValue)
            ? [
                ...currentValue.map((entry) =>
                  typeof entry === "object" && entry
                    ? Object.fromEntries(
                        Object.entries(entry).map(([entryKey, entryValue]) => [
                          entryKey,
                          String(entryValue ?? ""),
                        ])
                      )
                    : {}
                ),
                item,
              ]
            : [item];

          return {
            ...current,
            content: {
              ...current.content,
              [key]: nextItems,
            },
          };
        });
      },
      setObjectListValue: (key, value) => {
        setConfig((current) => ({
          ...current,
          content: {
            ...current.content,
            [key]: value,
          },
        }));
      },
      setObjectListItemValue: (key, itemIndex, itemKey, value) => {
        setConfig((current) => {
          const currentValue = current.content[key];
          let items: Array<Record<string, string>> = [];

          if (Array.isArray(currentValue)) {
            items = currentValue.map((item) =>
              typeof item === "object" && item
                ? Object.fromEntries(
                    Object.entries(item).map(([entryKey, entryValue]) => [
                      entryKey,
                      String(entryValue ?? ""),
                    ])
                  )
                : {}
            );
          } else if (typeof currentValue === "string" && currentValue.trim()) {
            try {
              const parsed = JSON.parse(currentValue);
              if (Array.isArray(parsed)) {
                items = parsed.map((item) =>
                  typeof item === "object" && item
                    ? Object.fromEntries(
                        Object.entries(item).map(([entryKey, entryValue]) => [
                          entryKey,
                          String(entryValue ?? ""),
                        ])
                      )
                    : {}
                );
              }
            } catch {}
          }

          const nextItems = [...items];
          nextItems[itemIndex] = {
            ...(nextItems[itemIndex] ?? {}),
            [itemKey]: value,
          };

          return {
            ...current,
            content: {
              ...current.content,
              [key]: nextItems,
            },
          };
        });
      },
      removeObjectListItem: (key, itemIndex) => {
        setConfig((current) => {
          const currentValue = current.content[key];
          if (!Array.isArray(currentValue)) return current;

          return {
            ...current,
            content: {
              ...current.content,
              [key]: currentValue.filter((_, index) => index !== itemIndex),
            },
          };
        });
      },
      moveSection: (pageKey, sectionKey, direction) => {
        setConfig((current) => {
          const order = current.sectionOrder?.[pageKey] ?? [];
          const index = order.indexOf(sectionKey);
          if (index === -1) return current;

          const targetIndex = direction === "up" ? index - 1 : index + 1;
          if (targetIndex < 0 || targetIndex >= order.length) return current;

          const nextOrder = [...order];
          const [moved] = nextOrder.splice(index, 1);
          if (!moved) return current;
          nextOrder.splice(targetIndex, 0, moved);

          return {
            ...current,
            sectionOrder: {
              ...(current.sectionOrder ?? {}),
              [pageKey]: nextOrder,
            },
          };
        });
      },
      duplicateSection: (pageKey, sectionKey) => {
        setConfig((current) => {
          const order = current.sectionOrder?.[pageKey] ?? [];
          const index = order.indexOf(sectionKey);
          if (index === -1) return current;

          const duplicateKey = `${sectionKey}__dup${Date.now()}`;
          const nextOrder = [...order];
          nextOrder.splice(index + 1, 0, duplicateKey);
          const nextContent = { ...current.content };

          for (const [contentKey, contentValue] of Object.entries(current.content)) {
            if (contentKey.startsWith(`${sectionKey}.`)) {
              nextContent[contentKey.replace(sectionKey, duplicateKey)] =
                typeof contentValue === "object" && contentValue
                  ? JSON.parse(JSON.stringify(contentValue))
                  : contentValue;
            }
          }

          return {
            ...current,
            content: nextContent,
            sectionVisibility: {
              ...current.sectionVisibility,
              [duplicateKey]: current.sectionVisibility[sectionKey] ?? true,
            },
            sectionOrder: {
              ...(current.sectionOrder ?? {}),
              [pageKey]: nextOrder,
            },
          };
        });
      },
      setSectionVisibility: (key, value) => {
        setConfig((current) => ({
          ...current,
          sectionVisibility: {
            ...current.sectionVisibility,
            [key]: value,
          },
        }));
      },
      setThemeValue: (key, value) => {
        setConfig((current) => ({
          ...current,
          themeConfig: {
            ...current.themeConfig,
            [key]: value,
          },
        }));
      },
    }),
    [config, mediaAssets]
  );

  return (
    <WebsiteEditorContext.Provider value={value}>
      {children}
    </WebsiteEditorContext.Provider>
  );
}

export function useWebsiteEditor() {
  return useContext(WebsiteEditorContext);
}
