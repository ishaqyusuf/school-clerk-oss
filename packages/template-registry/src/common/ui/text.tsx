"use client";

import {
  createElement,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "../cn";
import { useRegistry } from "../../registry-context";
import { useWebsiteEditor } from "../../editor-context";

type TextTag = "span" | "p" | "div" | "h1" | "h2" | "h3";

export type TextProps = HTMLAttributes<HTMLElement> & {
  as?: TextTag;
  field?: string;
  children: ReactNode;
};

export function Text({
  as = "p",
  field,
  className,
  style,
  children,
  ...props
}: TextProps) {
  const registry = useRegistry();
  const editor = useWebsiteEditor();
  const editableConfig = editor?.config ?? registry.config;
  const fieldValue = field ? editableConfig.content[field] : undefined;
  const text =
    typeof fieldValue === "string" && fieldValue.length > 0 ? fieldValue : children;
  const isEditable = registry.mode === "editor" && !!field && !!editor;

  const baseStyle: CSSProperties = {
    fontFamily: as.startsWith("h")
      ? registry.config.themeConfig.headingFont
      : registry.config.themeConfig.bodyFont,
    color: "inherit",
    ...style,
  };

  if (!isEditable || !field || !editor) {
    return createElement(
      as,
      {
        className,
        style: baseStyle,
        ...props,
      },
      text
    );
  }

  const editableField = field;

  return createElement(
    as,
    {
      ...props,
      className: cn(className),
      contentEditable: true,
      suppressContentEditableWarning: true,
      "data-editable-key": editableField,
      style: {
        ...baseStyle,
        outline: "2px dashed rgba(15, 76, 129, 0.22)",
        outlineOffset: 6,
        borderRadius: 8,
        cursor: "text",
      },
      onBlur: (event: React.FocusEvent<HTMLElement>) => {
        props.onBlur?.(event);
        editor.setFieldValue(editableField, event.currentTarget.textContent || "");
      },
    },
    text
  );
}
