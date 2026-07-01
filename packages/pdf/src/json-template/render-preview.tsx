import * as React from "react";
import type { JsonDocumentBlock, JsonDocumentTemplate } from "./schema";
import {
  blockText,
  getBoundValue,
  interpolateText,
  isVisible,
  stringifyValue,
} from "./render-utils";

function previewStyle(block: JsonDocumentBlock): React.CSSProperties {
  const style = block.style ?? {};

  return {
    ...(style.align ? { textAlign: style.align } : {}),
    ...(style.backgroundColor ? { backgroundColor: style.backgroundColor } : {}),
    ...(style.bold ? { fontWeight: 700 } : {}),
    ...(style.borderColor ? { border: `1px solid ${style.borderColor}` } : {}),
    ...(style.color ? { color: style.color } : {}),
    ...(style.fontSize ? { fontSize: style.fontSize } : {}),
    ...(style.height ? { height: style.height } : {}),
    ...(style.marginBottom != null ? { marginBottom: style.marginBottom } : {}),
    ...(style.width ? { width: style.width } : {}),
  };
}

function renderPreviewBlock(
  block: JsonDocumentBlock,
  payload: unknown,
  index: number,
) {
  if (!isVisible(block.visibleWhen, payload)) return null;

  if (block.type === "text") {
    return (
      <p key={index} style={previewStyle(block)}>
        {blockText(block, payload)}
      </p>
    );
  }

  if (block.type === "image") {
    const src = block.src ?? stringifyValue(getBoundValue(payload, block.bind));
    return src ? (
      <img alt={block.alt ?? ""} key={index} src={src} style={previewStyle(block)} />
    ) : (
      <div key={index} style={previewStyle(block)}>
        {block.alt ?? "Image"}
      </div>
    );
  }

  if (block.type === "keyValue") {
    return (
      <div key={index} style={previewStyle(block)}>
        {block.title ? <strong>{block.title}</strong> : null}
        {block.items.map((item, itemIndex) => {
          if (!isVisible(item.visibleWhen, payload)) return null;
          const value =
            item.value != null
              ? interpolateText(item.value, payload)
              : stringifyValue(getBoundValue(payload, item.bind));

          return (
            <div
              key={itemIndex}
              style={{
                borderBottom: "1px solid #E5E7EB",
                display: "grid",
                gap: 12,
                gridTemplateColumns: "140px 1fr",
                padding: "6px 0",
              }}
            >
              <span style={{ color: "#64748B" }}>{item.label}</span>
              <span>{value || "Not specified"}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (block.type === "table") {
    const rows = getBoundValue(payload, block.rowsBind);
    const tableRows = Array.isArray(rows) ? rows : [payload];

    return (
      <table key={index} style={{ borderCollapse: "collapse", width: "100%" }}>
        {block.title ? <caption>{block.title}</caption> : null}
        <thead>
          <tr>
            {block.columns.map((column) => (
              <th key={column.bind} style={{ border: "1px solid #CBD5E1", padding: 6 }}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableRows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {block.columns.map((column) => (
                <td key={column.bind} style={{ border: "1px solid #CBD5E1", padding: 6 }}>
                  {stringifyValue(getBoundValue(row, column.bind))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (block.type === "signature") {
    return (
      <div
        key={index}
        style={{
          borderTop: "1px solid #111827",
          marginTop: 32,
          paddingTop: 6,
          textAlign: "center",
          width: 180,
          ...previewStyle(block),
        }}
      >
        {block.label ?? "Signature"}
      </div>
    );
  }

  return <div key={index} style={{ height: block.size }} />;
}

export function JsonDocumentTemplatePreview({
  payload,
  template,
}: {
  payload: unknown;
  template: JsonDocumentTemplate;
}) {
  return (
    <div style={{ display: "grid", gap: 24 }}>
      {template.pages.map((page, pageIndex) => (
        <div
          key={pageIndex}
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            color: "#0F172A",
            fontFamily: "Arial, sans-serif",
            minHeight: page.size === "LETTER" ? 880 : 920,
            padding: page.margin,
          }}
        >
          {page.blocks.map((block, blockIndex) =>
            renderPreviewBlock(block, payload, blockIndex),
          )}
        </div>
      ))}
    </div>
  );
}
