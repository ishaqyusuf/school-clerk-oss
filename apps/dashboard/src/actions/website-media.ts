"use server";

import { createWebsiteMediaAsset } from "@school-clerk/db";
import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { getAuthCookie } from "./cookies/auth-cookie";
import { env } from "@/env";

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

export async function createWebsiteMediaAssetAction(formData: FormData) {
  const cookie = await getAuthCookie();
  assertSchoolCookie(cookie);

  const name = String(formData.get("name") || "").trim();
  const sourceUrl = String(formData.get("sourceUrl") || "").trim();
  const altText = String(formData.get("altText") || "").trim();

  if (!name || !sourceUrl) {
    throw new Error("Media name and source URL are required.");
  }

  await createWebsiteMediaAsset({
    schoolProfileId: cookie.schoolId,
    name,
    sourceUrl,
    altText: altText || undefined,
    createdByUserId: cookie.auth?.userId,
  });

  revalidatePath(`/dashboard/${cookie.domain}/settings/website`);
  revalidatePath(`/dashboard/${cookie.domain}/settings/website/media`);
}

export async function uploadWebsiteMediaAssetAction(formData: FormData) {
  const cookie = await getAuthCookie();
  assertSchoolCookie(cookie);

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

  if (!file.type.startsWith("image/")) {
    throw new Error("Only image uploads are supported for website media.");
  }

  const fileBaseName =
    slugify(customName || file.name.replace(/\.[^/.]+$/, "")) || "website-image";
  const extension = file.name.includes(".")
    ? file.name.split(".").pop()?.toLowerCase() ?? "jpg"
    : "jpg";

  const blob = await put(
    `website-media/${cookie.schoolId}/${fileBaseName}.${extension}`,
    file,
    {
      access: "public",
      addRandomSuffix: true,
      token: env.BLOB_READ_WRITE_TOKEN,
    }
  );

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

  revalidatePath(`/dashboard/${cookie.domain}/settings/website`);
  revalidatePath(`/dashboard/${cookie.domain}/settings/website/media`);
}
