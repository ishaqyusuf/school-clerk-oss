import type {
  WebsiteMediaAsset,
  WebsiteTemplateConfiguration,
} from "./types";

export const WEBSITE_MEDIA_REFERENCE_PREFIX = "media:";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createWebsiteMediaReference(assetId: string) {
  return `${WEBSITE_MEDIA_REFERENCE_PREFIX}${assetId}`;
}

export function getWebsiteMediaReferenceAssetId(value: unknown) {
  if (
    typeof value !== "string" ||
    !value.startsWith(WEBSITE_MEDIA_REFERENCE_PREFIX)
  ) {
    return null;
  }

  return value.slice(WEBSITE_MEDIA_REFERENCE_PREFIX.length) || null;
}

export function resolveWebsiteMediaValue(
  value: unknown,
  assets: WebsiteMediaAsset[]
): unknown {
  const assetId = getWebsiteMediaReferenceAssetId(value);

  if (assetId) {
    return assets.find((asset) => asset.id === assetId)?.sourceUrl ?? value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveWebsiteMediaValue(item, assets));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [
        key,
        resolveWebsiteMediaValue(entryValue, assets),
      ])
    );
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (
      (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
      (trimmed.startsWith("{") && trimmed.endsWith("}"))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        const resolved = resolveWebsiteMediaValue(parsed, assets);
        return JSON.stringify(resolved, null, 2);
      } catch {
        return value;
      }
    }
  }

  return value;
}

export function resolveWebsiteMediaContent(
  content: Record<string, unknown>,
  assets: WebsiteMediaAsset[]
) {
  return Object.fromEntries(
    Object.entries(content).map(([key, value]) => [
      key,
      resolveWebsiteMediaValue(value, assets),
    ])
  );
}

export function resolveWebsiteMediaConfig(
  config: WebsiteTemplateConfiguration,
  assets: WebsiteMediaAsset[]
): WebsiteTemplateConfiguration {
  return {
    ...config,
    content: resolveWebsiteMediaContent(config.content, assets),
  };
}
