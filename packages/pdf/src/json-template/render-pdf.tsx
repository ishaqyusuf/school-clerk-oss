import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { JsonDocumentBlock, JsonDocumentTemplate } from "./schema";
import {
  blockText,
  getBoundValue,
  interpolateText,
  isVisible,
  stringifyValue,
} from "./render-utils";

const styles = StyleSheet.create({
  imageFallback: {
    borderColor: "#CBD5E1",
    borderWidth: 1,
    color: "#94A3B8",
    fontSize: 9,
    padding: 12,
    textAlign: "center",
  },
  keyValueItem: {
    borderBottomColor: "#E5E7EB",
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingVertical: 5,
  },
  keyValueLabel: {
    color: "#64748B",
    flex: 1,
    fontSize: 9,
  },
  keyValueValue: {
    flex: 2,
    fontSize: 10,
  },
  signature: {
    borderTopColor: "#111827",
    borderTopWidth: 1,
    marginTop: 28,
    paddingTop: 6,
    textAlign: "center",
    width: 170,
  },
  table: {
    borderColor: "#CBD5E1",
    borderWidth: 1,
  },
  tableCell: {
    borderRightColor: "#E5E7EB",
    borderRightWidth: 1,
    flex: 1,
    fontSize: 9,
    padding: 5,
  },
  tableHeader: {
    backgroundColor: "#F1F5F9",
    flexDirection: "row",
  },
  tableRow: {
    borderTopColor: "#E5E7EB",
    borderTopWidth: 1,
    flexDirection: "row",
  },
  title: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 6,
  },
});

function pdfStyle(block: JsonDocumentBlock) {
  const style = block.style ?? {};

  return {
    ...(style.align ? { textAlign: style.align } : {}),
    ...(style.backgroundColor ? { backgroundColor: style.backgroundColor } : {}),
    ...(style.bold ? { fontWeight: 700 } : {}),
    ...(style.borderColor ? { borderColor: style.borderColor, borderWidth: 1 } : {}),
    ...(style.color ? { color: style.color } : {}),
    ...(style.fontSize ? { fontSize: style.fontSize } : {}),
    ...(style.height ? { height: style.height } : {}),
    ...(style.marginBottom != null ? { marginBottom: style.marginBottom } : {}),
    ...(style.width ? { width: style.width } : {}),
  };
}

function renderBlock(block: JsonDocumentBlock, payload: unknown, index: number) {
  if (!isVisible(block.visibleWhen, payload)) return null;

  if (block.type === "text") {
    return (
      <Text key={index} style={pdfStyle(block)}>
        {blockText(block, payload)}
      </Text>
    );
  }

  if (block.type === "image") {
    const src = block.src ?? stringifyValue(getBoundValue(payload, block.bind));
    if (!src) {
      return (
        <Text key={index} style={[styles.imageFallback, pdfStyle(block)]}>
          {block.alt ?? "Image"}
        </Text>
      );
    }

    return <Image key={index} src={src} style={pdfStyle(block)} />;
  }

  if (block.type === "keyValue") {
    return (
      <View key={index} style={pdfStyle(block)}>
        {block.title ? <Text style={styles.title}>{block.title}</Text> : null}
        {block.items.map((item, itemIndex) => {
          if (!isVisible(item.visibleWhen, payload)) return null;
          const rawValue =
            item.value != null
              ? interpolateText(item.value, payload)
              : stringifyValue(getBoundValue(payload, item.bind));

          return (
            <View key={itemIndex} style={styles.keyValueItem}>
              <Text style={styles.keyValueLabel}>{item.label}</Text>
              <Text style={styles.keyValueValue}>{rawValue || "Not specified"}</Text>
            </View>
          );
        })}
      </View>
    );
  }

  if (block.type === "table") {
    const rows = getBoundValue(payload, block.rowsBind);
    const tableRows = Array.isArray(rows) ? rows : [payload];

    return (
      <View key={index} style={[styles.table, pdfStyle(block)]}>
        {block.title ? <Text style={styles.title}>{block.title}</Text> : null}
        <View style={styles.tableHeader}>
          {block.columns.map((column) => (
            <Text key={column.bind} style={styles.tableCell}>
              {column.label}
            </Text>
          ))}
        </View>
        {tableRows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.tableRow}>
            {block.columns.map((column) => (
              <Text key={column.bind} style={styles.tableCell}>
                {stringifyValue(getBoundValue(row, column.bind))}
              </Text>
            ))}
          </View>
        ))}
      </View>
    );
  }

  if (block.type === "signature") {
    return (
      <Text key={index} style={[styles.signature, pdfStyle(block)]}>
        {block.label ?? "Signature"}
      </Text>
    );
  }

  return <View key={index} style={{ height: block.size }} />;
}

export function renderJsonDocumentTemplateToPdf(
  template: JsonDocumentTemplate,
  payload: unknown,
) {
  return (
    <Document title={template.label}>
      {template.pages.map((page, pageIndex) => (
        <Page
          key={pageIndex}
          size={page.size}
          style={{
            backgroundColor: "#FFFFFF",
            color: "#0F172A",
            fontFamily: "Helvetica",
            fontSize: 10,
            padding: page.margin,
          }}
        >
          {page.blocks.map((block, blockIndex) =>
            renderBlock(block, payload, blockIndex),
          )}
        </Page>
      ))}
    </Document>
  );
}
