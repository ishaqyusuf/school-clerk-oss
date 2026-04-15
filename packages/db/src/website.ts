import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./index";

export type WebsiteConfigRecord = Prisma.WebsiteTemplateConfigGetPayload<{
  select: {
    id: true;
    schoolProfileId: true;
    templateId: true;
    name: true;
    status: true;
    contentJson: true;
    sectionJson: true;
    themeJson: true;
    seoJson: true;
    analyticsJson: true;
    templateVersion: true;
    publishedAt: true;
    updatedAt: true;
  };
}>;

export type WebsiteMediaAssetRecord = {
  id: string;
  schoolProfileId: string;
  name: string;
  kind: string;
  sourceUrl: string;
  altText: string | null;
  storageProvider: string | null;
  storageKey: string | null;
  mimeType: string | null;
  createdAt: Date;
};

const websiteMediaClient = prisma as unknown as PrismaClient;

function appendAuditEntry(
  analyticsJson: unknown,
  entry: Record<string, unknown>
): Prisma.InputJsonValue {
  const current =
    typeof analyticsJson === "object" && analyticsJson
      ? (analyticsJson as Record<string, unknown>)
      : {};

  const auditTrail = Array.isArray(current.auditTrail)
    ? [...current.auditTrail, entry]
    : [entry];

  return {
    ...current,
    auditTrail,
  } as Prisma.InputJsonValue;
}

export async function resolveSchoolProfileByHost(host: string) {
  if (!host) return null;

  return prisma.schoolProfile.findFirst({
    where: {
      OR: [
        { subDomain: host },
        {
          domains: {
            some: {
              OR: [{ subdomain: host }, { customDomain: host }],
            },
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      subDomain: true,
      domains: {
        select: {
          subdomain: true,
          customDomain: true,
          isPrimary: true,
        },
        take: 5,
      },
    },
  });
}

export async function getPublishedWebsiteConfigBySchoolProfileId(
  schoolProfileId: string
) {
  return prisma.websitePublishedConfig.findFirst({
    where: {
      schoolProfileId,
    },
    select: {
      publishedAt: true,
      websiteConfig: {
        select: {
          id: true,
          schoolProfileId: true,
          templateId: true,
          name: true,
          status: true,
          contentJson: true,
          sectionJson: true,
          themeJson: true,
          seoJson: true,
          analyticsJson: true,
          templateVersion: true,
          publishedAt: true,
          updatedAt: true,
        },
      },
    },
  });
}

export async function listWebsiteConfigsBySchoolProfileId(
  schoolProfileId: string
) {
  return prisma.websiteTemplateConfig.findMany({
    where: {
      schoolProfileId,
    },
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      schoolProfileId: true,
      templateId: true,
      name: true,
      status: true,
      contentJson: true,
      sectionJson: true,
      themeJson: true,
      seoJson: true,
      analyticsJson: true,
      templateVersion: true,
      publishedAt: true,
      updatedAt: true,
    },
  });
}

export async function getWebsiteConfigById(input: {
  id: string;
  schoolProfileId: string;
}) {
  return prisma.websiteTemplateConfig.findFirst({
    where: {
      id: input.id,
      schoolProfileId: input.schoolProfileId,
    },
    select: {
      id: true,
      schoolProfileId: true,
      templateId: true,
      name: true,
      status: true,
      contentJson: true,
      sectionJson: true,
      themeJson: true,
      seoJson: true,
      analyticsJson: true,
      templateVersion: true,
      publishedAt: true,
      updatedAt: true,
    },
  });
}

export async function getWebsiteConfigPreviewById(id: string) {
  return prisma.websiteTemplateConfig.findFirst({
    where: {
      id,
      status: {
        not: "ARCHIVED",
      },
    },
    select: {
      id: true,
      schoolProfileId: true,
      templateId: true,
      name: true,
      status: true,
      contentJson: true,
      sectionJson: true,
      themeJson: true,
      seoJson: true,
      analyticsJson: true,
      templateVersion: true,
      publishedAt: true,
      updatedAt: true,
      schoolProfile: {
        select: {
          id: true,
          name: true,
          subDomain: true,
          domains: {
            select: {
              subdomain: true,
              customDomain: true,
              isPrimary: true,
            },
            take: 5,
          },
        },
      },
    },
  });
}

export async function listWebsiteMediaAssetsBySchoolProfileId(
  schoolProfileId: string
) {
  return websiteMediaClient.websiteMediaAsset.findMany({
    where: {
      schoolProfileId,
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      schoolProfileId: true,
      name: true,
      kind: true,
      sourceUrl: true,
      altText: true,
      storageProvider: true,
      storageKey: true,
      mimeType: true,
      createdAt: true,
    },
  });
}

export async function createWebsiteMediaAsset(input: {
  schoolProfileId: string;
  name: string;
  sourceUrl: string;
  altText?: string;
  kind?: string;
  storageProvider?: string;
  storageKey?: string;
  mimeType?: string;
  createdByUserId?: string;
}) {
  return websiteMediaClient.websiteMediaAsset.create({
    data: {
      schoolProfileId: input.schoolProfileId,
      name: input.name,
      sourceUrl: input.sourceUrl,
      altText: input.altText,
      kind: input.kind ?? "IMAGE",
      storageProvider: input.storageProvider,
      storageKey: input.storageKey,
      mimeType: input.mimeType,
      createdByUserId: input.createdByUserId,
    },
  });
}

export async function createWebsiteTemplateDraft(input: {
  schoolProfileId: string;
  templateId: string;
  name: string;
  contentJson?: Prisma.InputJsonValue;
  sectionJson?: Prisma.InputJsonValue;
  themeJson?: Prisma.InputJsonValue;
  seoJson?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
  analyticsJson?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
  templateVersion?: number;
  createdByUserId?: string;
}) {
  return prisma.websiteTemplateConfig.create({
    data: {
      schoolProfileId: input.schoolProfileId,
      templateId: input.templateId,
      name: input.name,
      status: "DRAFT",
      contentJson: input.contentJson ?? {},
      sectionJson: input.sectionJson ?? {},
      themeJson: input.themeJson ?? {},
      seoJson: input.seoJson ?? Prisma.JsonNull,
      analyticsJson: input.analyticsJson ?? Prisma.JsonNull,
      templateVersion: input.templateVersion ?? 1,
      createdByUserId: input.createdByUserId,
      updatedByUserId: input.createdByUserId,
    },
  });
}

export async function updateWebsiteTemplateDraft(input: {
  id: string;
  schoolProfileId: string;
  contentJson?: Prisma.InputJsonValue;
  sectionJson?: Prisma.InputJsonValue;
  themeJson?: Prisma.InputJsonValue;
  seoJson?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
  analyticsJson?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
  templateVersion?: number;
  updatedByUserId?: string;
  name?: string;
}) {
  const existing = await prisma.websiteTemplateConfig.findFirst({
    where: {
      id: input.id,
      schoolProfileId: input.schoolProfileId,
    },
    select: {
      analyticsJson: true,
    },
  });

  return prisma.websiteTemplateConfig.update({
    where: {
      id: input.id,
      schoolProfileId: input.schoolProfileId,
      deletedAt: null,
      status: {
        not: "ARCHIVED",
      },
    },
    data: {
      ...(input.name ? { name: input.name } : {}),
      ...(input.contentJson ? { contentJson: input.contentJson } : {}),
      ...(input.sectionJson ? { sectionJson: input.sectionJson } : {}),
      ...(input.themeJson ? { themeJson: input.themeJson } : {}),
      ...(input.seoJson !== undefined ? { seoJson: input.seoJson } : {}),
      ...(input.templateVersion ? { templateVersion: input.templateVersion } : {}),
      ...(input.analyticsJson !== undefined
        ? { analyticsJson: input.analyticsJson }
        : {
            analyticsJson: appendAuditEntry(existing?.analyticsJson, {
              type: "save",
              at: new Date().toISOString(),
              userId: input.updatedByUserId ?? null,
            }),
          }),
      updatedByUserId: input.updatedByUserId,
    },
  });
}

export async function archiveWebsiteTemplateDraft(input: {
  id: string;
  schoolProfileId: string;
  updatedByUserId?: string;
}) {
  return prisma.websiteTemplateConfig.update({
    where: {
      id: input.id,
      schoolProfileId: input.schoolProfileId,
      deletedAt: null,
    },
    data: {
      status: "ARCHIVED",
      updatedByUserId: input.updatedByUserId,
    },
  });
}

export async function duplicateWebsiteTemplateDraft(input: {
  id: string;
  schoolProfileId: string;
  createdByUserId?: string;
}) {
  const existing = await prisma.websiteTemplateConfig.findFirst({
    where: {
      id: input.id,
      schoolProfileId: input.schoolProfileId,
    },
  });

  if (!existing) {
    throw new Error("Website template config not found.");
  }

  return createWebsiteTemplateDraft({
    schoolProfileId: existing.schoolProfileId,
    templateId: existing.templateId,
    name: `${existing.name} Copy`,
    contentJson: existing.contentJson as Prisma.InputJsonValue,
    sectionJson: existing.sectionJson as Prisma.InputJsonValue,
    themeJson: existing.themeJson as Prisma.InputJsonValue,
    seoJson: (existing.seoJson ?? Prisma.JsonNull) as
      | Prisma.InputJsonValue
      | Prisma.NullableJsonNullValueInput,
    analyticsJson: (existing.analyticsJson ?? Prisma.JsonNull) as
      | Prisma.InputJsonValue
      | Prisma.NullableJsonNullValueInput,
    templateVersion: existing.templateVersion,
    createdByUserId: input.createdByUserId,
  });
}

export async function publishWebsiteTemplateConfig(input: {
  id: string;
  schoolProfileId: string;
  publishedByUserId?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.websiteTemplateConfig.findFirst({
      where: {
        id: input.id,
        schoolProfileId: input.schoolProfileId,
      },
    });

    if (!existing) {
      throw new Error("Website template config not found.");
    }

    await tx.websiteTemplateConfig.updateMany({
      where: {
        schoolProfileId: input.schoolProfileId,
        status: "PUBLISHED",
        id: {
          not: input.id,
        },
      },
      data: {
        status: "DRAFT",
      },
    });

    const publishedConfig = await tx.websiteTemplateConfig.update({
      where: {
        id: input.id,
      },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        analyticsJson: appendAuditEntry(existing.analyticsJson, {
          type: "publish",
          at: new Date().toISOString(),
          userId: input.publishedByUserId ?? null,
        }),
        updatedByUserId: input.publishedByUserId,
      },
    });

    await tx.websitePublishedConfig.upsert({
      where: {
        schoolProfileId: input.schoolProfileId,
      },
      create: {
        schoolProfileId: input.schoolProfileId,
        websiteConfigId: input.id,
      },
      update: {
        websiteConfigId: input.id,
        publishedAt: new Date(),
      },
    });

    return publishedConfig;
  });
}
