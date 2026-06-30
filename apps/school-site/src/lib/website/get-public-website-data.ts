import {
  createWebsiteContentDataFromConfig,
  type WebsiteTemplateContentData,
  type WebsiteTemplateConfiguration,
  type WebsiteTenantProfile,
} from "@school-clerk/template-registry";
import { prisma } from "@school-clerk/db";

const ACTIVE_APPLICATION_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "APPROVED"];

function classroomLabel(classroomDepartment: any) {
  return [
    classroomDepartment?.classRoom?.name,
    classroomDepartment?.departmentName,
  ]
    .filter(Boolean)
    .join(" ");
}

async function listVisibleAdmissionLinks(tenant: WebsiteTenantProfile) {
  if (!tenant.schoolProfileId) return [];

  const db = prisma as any;
  const now = new Date();
  const links = await db.enrollmentLink.findMany({
    where: {
      schoolProfileId: tenant.schoolProfileId,
      status: "ACTIVE",
      showOnWebsite: true,
      deletedAt: null,
      AND: [
        { OR: [{ opensAt: null }, { opensAt: { lte: now } }] },
        { OR: [{ closesAt: null }, { closesAt: { gte: now } }] },
      ],
    },
    include: {
      classrooms: {
        where: { deletedAt: null },
        include: {
          classRoomDepartment: { include: { classRoom: true } },
        },
      },
    },
    orderBy: [{ opensAt: "asc" }, { createdAt: "desc" }],
  });

  if (!links.length) return [];

  const counts = await db.enrollmentApplication.groupBy({
    by: ["enrollmentLinkId", "classRoomDepartmentId"],
    where: {
      enrollmentLinkId: { in: links.map((link: any) => link.id) },
      status: { in: ACTIVE_APPLICATION_STATUSES },
      deletedAt: null,
    },
    _count: { id: true },
  });
  const linkCountMap = new Map<string, number>();
  const classroomCountMap = new Map<string, number>();

  counts.forEach((row: any) => {
    linkCountMap.set(
      row.enrollmentLinkId,
      (linkCountMap.get(row.enrollmentLinkId) ?? 0) + row._count.id,
    );
    classroomCountMap.set(
      `${row.enrollmentLinkId}:${row.classRoomDepartmentId}`,
      row._count.id,
    );
  });

  return links.flatMap((link: any) => {
    const totalUsed = linkCountMap.get(link.id) ?? 0;

    if (
      link.capacityMode === "TOTAL" &&
      link.totalCapacity &&
      totalUsed >= link.totalCapacity
    ) {
      return [];
    }

    const openClassrooms = link.classrooms.filter((classroom: any) => {
      if (link.capacityMode !== "PER_CLASSROOM" || !classroom.capacity) {
        return true;
      }

      const used =
        classroomCountMap.get(`${link.id}:${classroom.classRoomDepartmentId}`) ??
        0;

      return used < classroom.capacity;
    });

    if (!openClassrooms.length) return [];

    return [
      {
        id: link.id,
        title: link.title,
        href: `/enroll/${link.code}`,
        classroomCount: openClassrooms.length,
        classroomLabels: openClassrooms
          .map((classroom: any) => classroomLabel(classroom.classRoomDepartment))
          .filter(Boolean)
          .slice(0, 4),
        opensAt: link.opensAt?.toISOString() ?? null,
        closesAt: link.closesAt?.toISOString() ?? null,
        instructions: link.instructions ?? null,
      },
    ];
  });
}

export async function getPublicWebsiteData(
  tenant: WebsiteTenantProfile,
  config?: WebsiteTemplateConfiguration | null,
  options: { includeFallback?: boolean } = {},
): Promise<WebsiteTemplateContentData> {
  const contentData = createWebsiteContentDataFromConfig(tenant, config, options);
  const admissionLinks = await listVisibleAdmissionLinks(tenant);

  return {
    ...contentData,
    admissionLinks: admissionLinks.length
      ? admissionLinks
      : contentData.admissionLinks,
  };
}
