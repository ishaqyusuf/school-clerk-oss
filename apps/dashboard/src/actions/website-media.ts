"use server";

import { createWebsiteMediaAsset } from "@school-clerk/db";
import { createBlobUploadError } from "@school-clerk/utils";
import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { getAuthCookie } from "./cookies/auth-cookie";
import { env } from "@/env";
import { assertWebsiteManager } from "@/lib/website/access";

const MAX_WEBSITE_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_WEBSITE_IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

function assertSchoolCookie(
  cookie: Awaited<ReturnType<typeof getAuthCookie>>
): asserts cookie is NonNullable<typeof cookie> & { schoolId: string; domain: string } {
  if (!cookie?.schoolId || !cookie?.domain) {
    throw new Error("Tenant context not found for website media.");
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function assertSafePublicUrl(value: string) {
  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Media URL must use http or https.");
    }
  } catch {
    throw new Error("Media source URL must be a valid public URL.");
  }
}

export async function createWebsiteMediaAssetAction(formData: FormData) {
  const cookie = await getAuthCookie();
  assertSchoolCookie(cookie);
  await assertWebsiteManager(cookie);

  const name = String(formData.get("name") || "").trim();
  const sourceUrl = String(formData.get("sourceUrl") || "").trim();
  const altText = String(formData.get("altText") || "").trim();

  if (!name || !sourceUrl) {
    throw new Error("Media name and source URL are required.");
  }

  assertSafePublicUrl(sourceUrl);

  await createWebsiteMediaAsset({
    schoolProfileId: cookie.schoolId,
    name,
    sourceUrl,
    altText: altText || undefined,
    createdByUserId: cookie.auth?.userId,
  });

  revalidatePath(`/${cookie.domain}/settings/website`);
  revalidatePath(`/${cookie.domain}/settings/website/media`);
}

export async function uploadWebsiteMediaAssetAction(formData: FormData) {
  const cookie = await getAuthCookie();
  assertSchoolCookie(cookie);
  await assertWebsiteManager(cookie);

  if (!env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is required before uploading website media."
    );
  }

  const file = formData.get("file");
  const customName = String(formData.get("name") || "").trim();
  const altText = String(formData.get("altText") || "").trim();

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Select an image file to upload.");
  }

  const extension = ALLOWED_WEBSITE_IMAGE_TYPES.get(file.type);

  if (!extension) {
    throw new Error("Only JPG, PNG, WebP, and GIF uploads are supported.");
  }

  if (file.size > MAX_WEBSITE_IMAGE_SIZE) {
    throw new Error("Website media uploads must be 10MB or smaller.");
  }

  const fileBaseName =
    slugify(customName || file.name.replace(/\.[^/.]+$/, "")) || "website-image";

  const blob = await put(
    `website-media/${cookie.schoolId}/${fileBaseName}.${extension}`,
    file,
    {
      access: "public",
      addRandomSuffix: true,
      token: env.BLOB_READ_WRITE_TOKEN,
    },
  ).catch((error) => {
    throw createBlobUploadError("Website media storage", error);
  });

  await createWebsiteMediaAsset({
    schoolProfileId: cookie.schoolId,
    name: customName || file.name,
    sourceUrl: blob.url,
    altText: altText || undefined,
    createdByUserId: cookie.auth?.userId,
    storageProvider: "vercel-blob",
    storageKey: blob.pathname,
    mimeType: file.type,
  });

  revalidatePath(`/${cookie.domain}/settings/website`);
  revalidatePath(`/${cookie.domain}/settings/website/media`);
}
