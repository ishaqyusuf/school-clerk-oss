"use server";

import {
  archiveWebsiteTemplateDraft,
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
  normalizeWebsiteTemplateConfigInput,
  templateRegistry,
} from "@school-clerk/template-registry";
import { revalidatePath } from "next/cache";
import { getAuthCookie } from "./cookies/auth-cookie";
import {
  assertTemplateAvailableForContext,
  assertWebsiteManager,
} from "@/lib/website/access";

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
  const context = await assertWebsiteManager(cookie);

  const templateId = String(formData.get("templateId") || "").trim();

  if (!templateId) {
    throw new Error("Template selection is required.");
  }

  const template = getTemplateById(templateRegistry, templateId);
  assertTemplateAvailableForContext(template, context);

  await createWebsiteTemplateDraft({
    schoolProfileId: cookie.schoolId,
    templateId,
    name: `${template.manifest.name} Draft`,
    templateVersion: CURRENT_TEMPLATE_CONFIG_VERSION,
    createdByUserId: cookie.auth?.userId,
  });

  revalidatePath(`/${cookie.domain}/settings/website`);
}

export async function publishWebsiteDraftAction(formData: FormData) {
  const cookie = await getAuthCookie();
  assertSchoolCookie(cookie);
  const context = await assertWebsiteManager(cookie);

  const configId = String(formData.get("configId") || "").trim();

  if (!configId) {
    throw new Error("Website configuration id is required.");
  }

  const config = await getWebsiteConfigById({
    id: configId,
    schoolProfileId: cookie.schoolId,
  });

  if (!config) {
    throw new Error("Website configuration not found.");
  }

  const template = getTemplateById(templateRegistry, config.templateId);
  assertTemplateAvailableForContext(template, context);

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
  const context = await assertWebsiteManager(cookie);

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

  const template = getTemplateById(templateRegistry, templateId);
  assertTemplateAvailableForContext(template, context);

  const content: Record<string, unknown> = {};
  const sectionVisibility: Record<string, boolean> = {};
  const sectionOrder: Record<string, string[]> = {};
  const seo: Record<string, string> = {};
  const themeConfig: Record<string, unknown> = {};
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

  for (const key of [
    "primaryColor",
    "secondaryColor",
    "accentColor",
    "surfaceColor",
    "headingFont",
    "bodyFont",
    "radius",
    "density",
    "stylePreset",
    "baseColor",
    "theme",
    "chartColor",
    "iconLibrary",
    "menuStyle",
    "menuAccent",
  ]) {
    themeConfig[key] = formData.get(`theme:${key}`);
  }

  const normalized = normalizeWebsiteTemplateConfigInput(template, {
    content,
    sectionVisibility,
    sectionOrder,
    seoConfig: seo,
    themeConfig,
  });

  await updateWebsiteTemplateDraft({
    id: configId,
    schoolProfileId: cookie.schoolId,
    templateId,
    name,
    updatedByUserId: cookie.auth?.userId,
    contentJson: normalized.content as Prisma.InputJsonValue,
    sectionJson: {
      visibility: normalized.sectionVisibility,
      order: normalized.sectionOrder,
    } as Prisma.InputJsonValue,
    seoJson: normalized.seoConfig,
    themeJson: normalized.themeConfig as Prisma.InputJsonValue,
    templateVersion,
  });

  revalidatePath(`/${cookie.domain}/settings/website`);
  revalidatePath(`/${cookie.domain}/settings/website/${configId}`);
}

export async function updateWebsiteCmsAction(formData: FormData) {
  const cookie = await getAuthCookie();
  assertSchoolCookie(cookie);
  const context = await assertWebsiteManager(cookie);

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

  const template = getTemplateById(templateRegistry, existing.templateId);
  assertTemplateAvailableForContext(template, context);

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

  const sectionJson =
    typeof existing.sectionJson === "object" && existing.sectionJson
      ? (existing.sectionJson as {
          visibility?: Record<string, boolean>;
          order?: Record<string, string[]>;
        })
      : {};
  const normalized = normalizeWebsiteTemplateConfigInput(template, {
    content,
    sectionVisibility: sectionJson.visibility ?? {},
    sectionOrder: sectionJson.order ?? {},
    seoConfig:
      typeof existing.seoJson === "object" && existing.seoJson
        ? (existing.seoJson as Record<string, unknown>)
        : {},
    themeConfig:
      typeof existing.themeJson === "object" && existing.themeJson
        ? (existing.themeJson as Record<string, unknown>)
        : {},
  });

  await updateWebsiteTemplateDraft({
    id: configId,
    schoolProfileId: cookie.schoolId,
    contentJson: normalized.content as Prisma.InputJsonValue,
    sectionJson: {
      visibility: normalized.sectionVisibility,
      order: normalized.sectionOrder,
    } as Prisma.InputJsonValue,
    seoJson: normalized.seoConfig,
    themeJson: normalized.themeConfig as Prisma.InputJsonValue,
    updatedByUserId: cookie.auth?.userId,
  });

  revalidatePath(`/${cookie.domain}/settings/website`);
  revalidatePath(`/${cookie.domain}/settings/website/${configId}`);
  revalidatePath(`/${cookie.domain}/settings/website/${configId}/cms`);
}

export async function duplicateWebsiteDraftAction(formData: FormData) {
  const cookie = await getAuthCookie();
  assertSchoolCookie(cookie);
  await assertWebsiteManager(cookie);

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

export async function archiveWebsiteDraftAction(formData: FormData) {
  const cookie = await getAuthCookie();
  assertSchoolCookie(cookie);
  await assertWebsiteManager(cookie);

  const configId = String(formData.get("configId") || "").trim();

  if (!configId) {
    throw new Error("Website configuration id is required.");
  }

  await archiveWebsiteTemplateDraft({
    id: configId,
    schoolProfileId: cookie.schoolId,
    updatedByUserId: cookie.auth?.userId,
  });

  revalidatePath(`/${cookie.domain}/settings/website`);
}
