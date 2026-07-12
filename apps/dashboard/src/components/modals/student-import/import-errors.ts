const HTML_RESPONSE_PATTERNS = [
  /Unexpected token ['"]?<['"]?/i,
  /<!doctype\s+html/i,
  /<html[\s>]/i,
  /is not valid JSON/i,
];

const SECRET_PATTERNS = [
  /(authorization|cookie|token|session|password)=([^&\s]+)/gi,
  /(authorization|cookie|token|session|password):\s*([^\n\r]+)/gi,
  /(bearer\s+)[A-Za-z0-9._~+/=-]+/gi,
];

export type StudentImportOperation =
  "verification" | "execution" | "single-row execution";

export type NormalizedStudentImportError = {
  title: "Import needs attention";
  message: string;
  diagnostics: string[];
  isTransportError: boolean;
};

export function normalizeStudentImportError(
  operation: StudentImportOperation,
  error: unknown,
): NormalizedStudentImportError | null {
  if (!error) return null;

  const message = getErrorMessage(error);
  const status = findHttpStatus(error);
  const contentType = findContentType(error);
  const preview = getSafeResponsePreview(error, message);
  const isTransportError =
    HTML_RESPONSE_PATTERNS.some((pattern) => pattern.test(message)) ||
    HTML_RESPONSE_PATTERNS.some((pattern) => pattern.test(preview)) ||
    contentType.toLowerCase().includes("text/html");

  if (!isTransportError) {
    return {
      title: "Import needs attention",
      message:
        message || "The import request failed. Review the rows and try again.",
      diagnostics: [
        `Operation: ${operation}`,
        ...(status ? [`HTTP status: ${status}`] : []),
        ...(contentType ? [`Content type: ${contentType}`] : []),
      ],
      isTransportError: false,
    };
  }

  return {
    title: "Import needs attention",
    message:
      "The import service returned a page instead of a data response. Your staged rows were kept, so you can retry in a moment or cancel the import.",
    diagnostics: [
      `Operation: ${operation}`,
      ...(status ? [`HTTP status: ${status}`] : []),
      ...(contentType ? [`Content type: ${contentType}`] : []),
      ...(preview ? [`Response preview: ${preview}`] : []),
    ],
    isTransportError: true,
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : "";
  }
  return "";
}

function findHttpStatus(error: unknown): string {
  const values = collectNestedValues(error, new Set(), 0);
  const status = values.find(
    (value) =>
      (value.key === "httpStatus" ||
        value.key === "status" ||
        value.key === "statusCode") &&
      (typeof value.value === "number" || typeof value.value === "string"),
  );

  return status ? String(status.value).slice(0, 16) : "";
}

function findContentType(error: unknown): string {
  const values = collectNestedValues(error, new Set(), 0);
  const contentType = values.find(
    (value) =>
      value.key.toLowerCase() === "content-type" ||
      value.key.toLowerCase() === "contenttype",
  );

  if (
    contentType &&
    (typeof contentType.value === "string" ||
      typeof contentType.value === "number")
  ) {
    return sanitizeDiagnostic(String(contentType.value), 120);
  }

  const response = values.find((value) => value.key === "response")?.value;
  if (response && typeof response === "object" && "headers" in response) {
    const headers = (
      response as { headers?: { get?: (key: string) => string | null } }
    ).headers;
    const header = headers?.get?.("content-type");
    if (header) return sanitizeDiagnostic(header, 120);
  }

  return "";
}

function getSafeResponsePreview(error: unknown, message: string): string {
  const values = collectNestedValues(error, new Set(), 0);
  const previewValue = values.find((value) =>
    ["body", "responseText", "text", "preview"].includes(value.key),
  )?.value;
  const rawPreview =
    typeof previewValue === "string"
      ? previewValue
      : extractJsonParsePreview(message) || message;

  return sanitizeDiagnostic(rawPreview, 160);
}

function extractJsonParsePreview(message: string): string {
  const quotedPreview = message.match(/"([^"]{1,240})"/)?.[1];
  return quotedPreview || "";
}

function sanitizeDiagnostic(value: string, maxLength: number): string {
  let sanitized = value.replace(/\s+/g, " ").trim();
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, (_match, keyOrPrefix) =>
      String(keyOrPrefix).toLowerCase().startsWith("bearer")
        ? `${keyOrPrefix}[redacted]`
        : `${keyOrPrefix}=[redacted]`,
    );
  }
  sanitized = sanitized.replace(
    /<script\b[^>]*>.*?<\/script>/gi,
    "<script>[redacted]</script>",
  );
  if (sanitized.length > maxLength) {
    return `${sanitized.slice(0, maxLength - 1)}...`;
  }
  return sanitized;
}

function collectNestedValues(
  value: unknown,
  seen: Set<unknown>,
  depth: number,
): Array<{ key: string; value: unknown }> {
  if (!value || typeof value !== "object" || seen.has(value) || depth > 3) {
    return [];
  }
  seen.add(value);

  const output: Array<{ key: string; value: unknown }> = [];
  for (const [key, nestedValue] of Object.entries(value)) {
    output.push({ key, value: nestedValue });
    output.push(...collectNestedValues(nestedValue, seen, depth + 1));
  }

  return output;
}
