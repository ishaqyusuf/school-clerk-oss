"use client";

import { useWebsiteEditor } from "../editor-context";

export function EditableText({
  as: Tag,
  fieldKey,
  objectListKey,
  objectListIndex,
  objectListItemKey,
  fallback,
  mode,
  className,
  style,
}: {
  as: "div" | "span" | "p" | "h1";
  fieldKey?: string;
  objectListKey?: string;
  objectListIndex?: number;
  objectListItemKey?: string;
  fallback: string;
  mode: "preview" | "editor" | "production";
  className?: string;
  style?: React.CSSProperties;
}) {
  const editor = useWebsiteEditor();
  let value: unknown = fieldKey ? editor?.config.content[fieldKey] : undefined;

  if (
    editor &&
    objectListKey &&
    typeof objectListIndex === "number" &&
    objectListItemKey
  ) {
    const items = editor.config.content[objectListKey];
    if (Array.isArray(items)) {
      const item = items[objectListIndex];
      if (typeof item === "object" && item) {
        value = (item as Record<string, unknown>)[objectListItemKey];
      }
    }
  }

  const text = typeof value === "string" && value.length > 0 ? value : fallback;

  if (mode !== "editor" || !editor) {
    return (
      <Tag className={className} style={style}>
        {text}
      </Tag>
    );
  }

  return (
    <Tag
      className={className}
      style={{
        outline: "2px dashed rgba(15, 76, 129, 0.18)",
        outlineOffset: 6,
        borderRadius: 8,
        cursor: "text",
        ...style,
      }}
      contentEditable
      suppressContentEditableWarning
      onBlur={(event) => {
        const nextValue = event.currentTarget.textContent || "";
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
      data-editable-key={fieldKey}
    >
      {text}
    </Tag>
  );
}
