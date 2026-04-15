"use client";

import { createWebsiteMediaReference, getWebsiteMediaReferenceAssetId } from "../media";
import { useWebsiteEditor } from "../editor-context";

function resolvePreviewSource(value: string, mediaAssets: Array<{ id: string; sourceUrl: string }>) {
  const assetId = getWebsiteMediaReferenceAssetId(value);
  if (!assetId) return value;
  return mediaAssets.find((asset) => asset.id === assetId)?.sourceUrl ?? value;
}

export function EditableMedia({
  fieldKey,
  fallback,
  alt,
  mode,
  className,
  style,
  objectListKey,
  objectListIndex,
  objectListItemKey,
}: {
  fieldKey?: string;
  fallback: string;
  alt: string;
  mode: "preview" | "editor" | "production";
  className?: string;
  style?: React.CSSProperties;
  objectListKey?: string;
  objectListIndex?: number;
  objectListItemKey?: string;
}) {
  const editor = useWebsiteEditor();
  const mediaAssets = editor?.mediaAssets ?? [];

  let rawValue = fallback;

  if (
    editor &&
    objectListKey &&
    typeof objectListIndex === "number" &&
    objectListItemKey
  ) {
    const items = editor.config.content[objectListKey];
    if (Array.isArray(items)) {
      const item = items[objectListIndex];
      if (typeof item === "object" && item && objectListItemKey in item) {
        rawValue = String((item as Record<string, unknown>)[objectListItemKey] ?? fallback);
      }
    }
  } else if (editor && fieldKey) {
    rawValue = String(editor.config.content[fieldKey] ?? fallback);
  }

  const previewSource = resolvePreviewSource(rawValue, mediaAssets);

  if (mode !== "editor" || !editor) {
    return <img alt={alt} src={previewSource} className={className} style={style} />;
  }

  return (
    <div style={{ position: "relative" }}>
      <img
        alt={alt}
        src={previewSource}
        className={className}
        style={{
          outline: "2px dashed rgba(15, 76, 129, 0.18)",
          outlineOffset: 6,
          borderRadius: 18,
          ...style,
        }}
      />
      {mediaAssets.length ? (
        <div
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            bottom: 12,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            padding: 10,
            borderRadius: 16,
            background: "rgba(15, 23, 42, 0.72)",
            backdropFilter: "blur(6px)",
          }}
        >
          {mediaAssets.slice(0, 4).map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => {
                const nextValue = createWebsiteMediaReference(asset.id);

                if (
                  objectListKey &&
                  typeof objectListIndex === "number" &&
                  objectListItemKey
                ) {
                  editor.setObjectListItemValue(
                    objectListKey,
                    objectListIndex,
                    objectListItemKey,
                    nextValue
                  );
                  return;
                }

                if (fieldKey) {
                  editor.setFieldValue(fieldKey, nextValue);
                }
              }}
              style={{
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 999,
                background: "rgba(255,255,255,0.12)",
                color: "#ffffff",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
                padding: "8px 10px",
              }}
            >
              {asset.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
