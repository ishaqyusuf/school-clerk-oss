import type { JsonDocumentBlock } from "./schema";

export function getBoundValue(payload: unknown, path?: string | null): unknown {
  if (!path) return null;

  return path.split(".").reduce<unknown>((current, segment) => {
    if (current == null || typeof current !== "object") return null;
    return (current as Record<string, unknown>)[segment];
  }, payload);
}

export function stringifyValue(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

export function interpolateText(text: string, payload: unknown) {
  return text.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, path: string) =>
    stringifyValue(getBoundValue(payload, path.trim())),
  );
}

export function isVisible(
  visibleWhen: JsonDocumentBlock["visibleWhen"],
  payload: unknown,
) {
  if (!visibleWhen) return true;

  const value = getBoundValue(payload, visibleWhen.bind);
  if (visibleWhen.exists != null) {
    const exists = value != null && value !== "";
    if (exists !== visibleWhen.exists) return false;
  }

  if (visibleWhen.equals != null) {
    return value === visibleWhen.equals;
  }

  return true;
}

export function blockText(
  block: Extract<JsonDocumentBlock, { type: "text" }>,
  payload: unknown,
) {
  const bound = stringifyValue(getBoundValue(payload, block.bind));
  const text = block.text ? interpolateText(block.text, payload) : "";
  return text || bound;
}
