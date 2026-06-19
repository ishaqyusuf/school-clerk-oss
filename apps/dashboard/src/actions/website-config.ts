"use server";

import {
  createWebsiteTemplateDraft,
  duplicateWebsiteTemplateDraft,
  getWebsiteConfigById,
  publishWebsiteTemplateConfig,
  Prisma,
  updateWebsiteTemplateDraft,
} from "@school-clerk/db";
import {
  CURRENT_TEMPLATE_CONFIG_VERSION,
  getTemplateById,
  templateRegistry,
} from "@school-clerk/template-registry";
import { revalidatePath } from "next/cache";
import { getAuthCookie } from "./cookies/auth-cookie";

function assertSchoolCookie(
  cookie: Awaited<ReturnType<typeof getAuthCookie>>,
): asserts cookie is NonNullable<typeof cookie> & {
  schoolId: string;
  domain: string;
} {
  if (!cookie?.schoolId || !cookie?.domain) {
    throw new Error("Tenant context not found for website configuration.");
  }
}

export async function createWebsiteDraftAction(formData: FormData) {
  const cookie = await getAuthCookie();
  assertSchoolCookie(cookie);

  const templateId = String(formData.get("templateId") || "").trim();
  const templateName = String(formData.get("templateName") || "").trim();

  if (!templateId || !templateName) {
    throw new Error("Template selection is required.");
  }

  await createWebsiteTemplateDraft({
    schoolProfileId: cookie.schoolId,
    templateId,
    name: `${templateName} Draft`,
    templateVersion: CURRENT_TEMPLATE_CONFIG_VERSION,
    createdByUserId: cookie.auth?.userId,
  });

  revalidatePath(`/${cookie.domain}/settings/website`);
}

export async function publishWebsiteDraftAction(formData: FormData) {
  const cookie = await getAuthCookie();
  assertSchoolCookie(cookie);

  const configId = String(formData.get("configId") || "").trim();

  if (!configId) {
    throw new Error("Website configuration id is required.");
  }

  await publishWebsiteTemplateConfig({
    id: configId,
    schoolProfileId: cookie.schoolId,
    publishedByUserId: cookie.auth?.userId,
  });

  revalidatePath(`/${cookie.domain}/settings/website`);
}

export async function updateWebsiteDraftEditorAction(formData: FormData) {
  const cookie = await getAuthCookie();
  assertSchoolCookie(cookie);

  const configId = String(formData.get("configId") || "").trim();
  const templateId = String(formData.get("templateId") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const templateVersion = Number(formData.get("templateVersion") || "1");

  if (!configId) {
    throw new Error("Website configuration id is required.");
  }
  if (!templateId) {
    throw new Error("Template selection is required.");
  }

  getTemplateById(templateRegistry, templateId);

  const content: Record<string, unknown> = {};
  const sectionVisibility: Record<string, boolean> = {};
  const sectionOrder: Record<string, string[]> = {};
  const seo: Record<string, string> = {};
  const sectionKeys = formData.getAll("sectionKeys").map(String);

  for (const [key, value] of formData.entries()) {
    if (key.startsWith("content:")) {
      content[key.replace("content:", "")] = String(value);
    }
    if (key.startsWith("contentJson:")) {
      const raw = String(value);

      try {
        content[key.replace("contentJson:", "")] = JSON.parse(raw);
      } catch {
        content[key.replace("contentJson:", "")] = raw;
      }
    }
    if (key.startsWith("seo:")) {
      seo[key.replace("seo:", "")] = String(value);
    }
    if (key.startsWith("sectionOrder:")) {
      try {
        sectionOrder[key.replace("sectionOrder:", "")] = JSON.parse(
          String(value),
        );
      } catch {
        sectionOrder[key.replace("sectionOrder:", "")] = [];
      }
    }
  }

  for (const sectionKey of sectionKeys) {
    sectionVisibility[sectionKey] =
      formData.get(`section:${sectionKey}`) === "on";
  }

  await updateWebsiteTemplateDraft({
    id: configId,
    schoolProfileId: cookie.schoolId,
    templateId,
    name,
    updatedByUserId: cookie.auth?.userId,
    contentJson: content as Prisma.InputJsonValue,
    sectionJson: {
      visibility: sectionVisibility,
      order: sectionOrder,
    } as Prisma.InputJsonValue,
    seoJson: seo,
    themeJson: {
      primaryColor: String(formData.get("theme:primaryColor") || "#0f4c81"),
      secondaryColor: String(formData.get("theme:secondaryColor") || "#e8f1f7"),
      accentColor: String(formData.get("theme:accentColor") || "#f59e0b"),
      surfaceColor: String(formData.get("theme:surfaceColor") || "#ffffff"),
      headingFont: String(formData.get("theme:headingFont") || "Georgia"),
      bodyFont: String(formData.get("theme:bodyFont") || "Inter"),
      radius: String(formData.get("theme:radius") || "lg"),
      density: String(formData.get("theme:density") || "comfortable"),
      stylePreset: String(
        formData.get("theme:stylePreset") || "classic-academic",
      ),
      baseColor: String(formData.get("theme:baseColor") || "slate"),
      theme: String(formData.get("theme:theme") || "#0f4c81"),
      chartColor: String(formData.get("theme:chartColor") || "#0f4c81"),
      iconLibrary: String(formData.get("theme:iconLibrary") || "lucide"),
      menuStyle: String(formData.get("theme:menuStyle") || "default"),
      menuAccent: String(formData.get("theme:menuAccent") || "subtle"),
    },
    templateVersion,
  });

  revalidatePath(`/${cookie.domain}/settings/website`);
  revalidatePath(`/${cookie.domain}/settings/website/${configId}`);
}

export async function updateWebsiteCmsAction(formData: FormData) {
  const cookie = await getAuthCookie();
  assertSchoolCookie(cookie);

  const configId = String(formData.get("configId") || "").trim();

  if (!configId) {
    throw new Error("Website configuration id is required.");
  }

  const existing = await getWebsiteConfigById({
    id: configId,
    schoolProfileId: cookie.schoolId,
  });

  if (!existing) {
    throw new Error("Website configuration not found.");
  }

  const content =
    typeof existing.contentJson === "object" && existing.contentJson
      ? { ...(existing.contentJson as Record<string, unknown>) }
      : {};

  for (const key of [
    "cms.announcements",
    "cms.blogPosts",
    "cms.events",
    "cms.resources",
  ]) {
    const raw = String(formData.get(key) || "[]");

    try {
      content[key] = JSON.parse(raw);
    } catch {
      content[key] = [];
    }
  }

  await updateWebsiteTemplateDraft({
    id: configId,
    schoolProfileId: cookie.schoolId,
    contentJson: content as Prisma.InputJsonValue,
    updatedByUserId: cookie.auth?.userId,
  });

  revalidatePath(`/${cookie.domain}/settings/website`);
  revalidatePath(`/${cookie.domain}/settings/website/${configId}`);
  revalidatePath(`/${cookie.domain}/settings/website/${configId}/cms`);
}

export async function duplicateWebsiteDraftAction(formData: FormData) {
  const cookie = await getAuthCookie();
  assertSchoolCookie(cookie);

  const configId = String(formData.get("configId") || "").trim();

  if (!configId) {
    throw new Error("Website configuration id is required.");
  }

  await duplicateWebsiteTemplateDraft({
    id: configId,
    schoolProfileId: cookie.schoolId,
    createdByUserId: cookie.auth?.userId,
  });

  revalidatePath(`/${cookie.domain}/settings/website`);
}
