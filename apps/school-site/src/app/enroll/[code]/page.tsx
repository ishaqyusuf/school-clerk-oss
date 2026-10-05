import { notFound } from "next/navigation";

import { ParentSetupEmailForm } from "./parent-setup-form";
import { requireEnrollmentModules } from "@/lib/enrollment/module-access";
import { canAccessModules, ModuleAccessDeniedError } from "@school-clerk/utils/module-config";
import { EnrollmentFormClient } from "./enrollment-form-client";
import { prisma } from "@school-clerk/db";
import { Badge } from "@school-clerk/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@school-clerk/ui/card";

const ACTIVE_APPLICATION_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "APPROVED"];

function classroomName(classroomDepartment: any) {
  return [
    classroomDepartment?.classRoom?.name,
    classroomDepartment?.departmentName,
  ]
    .filter(Boolean)
    .join(" ");
}

function inferDocumentTypeFromLabel(label?: string | null) {
  const normalized = label?.toLowerCase() ?? "";

  if (normalized.includes("passport") || normalized.includes("photo")) {
    return "PASSPORT_PHOTO";
  }

  if (normalized.includes("birth") && normalized.includes("certificate")) {
    return "BIRTH_CERTIFICATE";
  }

  if (
    normalized.includes("previous") ||
    normalized.includes("report") ||
    normalized.includes("transcript")
  ) {
    return "PREVIOUS_SCHOOL_REPORT";
  }

  return "GENERAL";
}

function normalizeDocumentType(value?: string | null, label?: string | null) {
  return value && value !== "GENERAL" ? value : inferDocumentTypeFromLabel(label);
}

async function getEnrollmentLink(code: string) {
  const db = prisma as any;
  const scope = await db.enrollmentLink.findFirst({
    where: { code, status: "ACTIVE", deletedAt: null },
    select: { schoolProfileId: true },
  });
  if (!scope) return null;
  const access = await requireEnrollmentModules(scope.schoolProfileId);
  const link = await db.enrollmentLink.findFirst({
    where: { code, schoolProfileId: scope.schoolProfileId, status: "ACTIVE", deletedAt: null },
    include: {
      schoolProfile: true,
      classrooms: {
        where: { deletedAt: null },
        include: {
          classRoomDepartment: { include: { classRoom: true } },
        },
      },
      documentRequirements: {
        where: { deletedAt: null },
        orderBy: [{ sortOrder: "asc" }],
      },
    },
  });

  if (!link) return null;

  const counts = await db.enrollmentApplication.groupBy({
    by: ["classRoomDepartmentId"],
    where: {
      enrollmentLinkId: link.id,
      status: { in: ACTIVE_APPLICATION_STATUSES },
      deletedAt: null,
    },
    _count: { id: true },
  });
  const totalCount = counts.reduce(
    (sum: number, row: any) => sum + row._count.id,
    0,
  );
  const countMap = new Map(
    counts.map((row: any) => [row.classRoomDepartmentId, row._count.id]),
  );

  return {
    ...link,
    canSetupParentLogin: canAccessModules(access, ["PARENT_PORTAL"]),
    totalCount,
    classrooms: link.classrooms.map((row: any) => ({
      ...row,
      name: classroomName(row.classRoomDepartment),
      used: countMap.get(row.classRoomDepartmentId) ?? 0,
    })),
  };
}

async function getSubmissionState(
  code: string,
  schoolProfileId: string,
  applicationId?: string | null,
) {
  if (!applicationId) return null;

  const application = await (prisma as any).enrollmentApplication.findFirst({
    where: {
      id: applicationId,
      schoolProfileId,
      deletedAt: null,
      enrollmentLink: {
        code,
        deletedAt: null,
      },
    },
    select: { id: true },
  });

  if (!application) return null;
  return { application };
}

export default async function EnrollmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const [{ code }, query] = await Promise.all([params, searchParams]);
  const link = await getEnrollmentLink(code).catch((error: unknown) => {
    if (error instanceof ModuleAccessDeniedError) return "unavailable" as const;
    throw error;
  });

  if (link === "unavailable") {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
        <Card className="mx-auto w-full min-w-0 max-w-xl break-words bg-white">
          <CardHeader>
            <CardTitle>Enrollment unavailable</CardTitle>
            <CardDescription>
              Online enrollment is currently unavailable. Please contact the
              school for application updates or help with admission.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (!link) notFound();
  const submission = await getSubmissionState(
    code,
    link.schoolProfileId,
    query.submitted,
  );

  const now = new Date();
  const isNotOpen = link.opensAt && link.opensAt > now;
  const isClosed = link.closesAt && link.closesAt < now;
  const totalFull =
    link.capacityMode === "TOTAL" &&
    link.totalCapacity &&
    link.totalCount >= link.totalCapacity;
  const classroomOptions = link.classrooms.map((classroom: any) => {
    const capacity =
      link.capacityMode === "PER_CLASSROOM"
        ? classroom.capacity
        : link.totalCapacity;
    const used =
      link.capacityMode === "PER_CLASSROOM" ? classroom.used : link.totalCount;

    return {
      id: classroom.id,
      classRoomDepartmentId: classroom.classRoomDepartmentId,
      name: classroom.name,
      capacity: capacity ?? null,
      used,
      isFull: capacity ? used >= capacity : false,
      minimumAgeMonths: classroom.minimumAgeMonths,
      maximumAgeMonths: classroom.maximumAgeMonths,
      ageCutoffDate: classroom.ageCutoffDate?.toISOString() ?? null,
      requirementNotes: classroom.requirementNotes,
    };
  });
  const documentRequirements = link.documentRequirements.map((requirement: any) => ({
    id: requirement.id,
    label: requirement.label,
    description: requirement.description,
    documentType: normalizeDocumentType(
      requirement.documentType,
      requirement.label,
    ),
    uploadRequired: requirement.uploadRequired,
    sortOrder: requirement.sortOrder,
    classRoomDepartmentId: requirement.classRoomDepartmentId,
  }));

  if (submission) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950">
        <div className="mx-auto max-w-2xl">
          <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <Badge className="w-fit" variant="success">
                Application submitted
              </Badge>
              <CardTitle className="text-2xl">
                {link.schoolProfile.name} received your enrollment request
              </CardTitle>
              <CardDescription>
                We saved the application for review. The school will confirm the
                next step after checking classroom capacity and documents.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {!link.canSetupParentLogin ? (
                <p className="break-words rounded-md border border-slate-200 p-4 text-sm text-slate-600">
                  Parent portal access is not currently available. Please contact
                  the school for updates on your application.
                </p>
              ) : (
                <ParentSetupEmailForm code={code} applicationId={submission.application.id} />
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-500">
              {link.schoolProfile.name}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {link.title}
            </h1>
            {link.instructions ? (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {link.instructions}
              </p>
            ) : null}
          </div>

          <Card className="rounded-lg bg-white">
            <CardHeader>
              <CardTitle>Available classrooms</CardTitle>
              <CardDescription>
                Select one of the open classroom options in the form.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {link.classrooms.map((classroom: any) => {
                const capacity =
                  link.capacityMode === "PER_CLASSROOM"
                    ? classroom.capacity
                    : link.totalCapacity;
                const used =
                  link.capacityMode === "PER_CLASSROOM"
                    ? classroom.used
                    : link.totalCount;
                const isFull = capacity ? used >= capacity : false;

                return (
                  <div
                    className="flex items-center justify-between rounded-md border border-slate-200 p-3 text-sm"
                    key={classroom.id}
                  >
                    <span>{classroom.name}</span>
                    <Badge variant={isFull ? "destructive" : "secondary"}>
                      {capacity ? `${used}/${capacity}` : "Open"}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>

        <Card className="rounded-lg bg-white">
          <CardHeader>
            <CardTitle>Student enrollment form</CardTitle>
            <CardDescription>
              Submit accurate details and upload each required document.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isNotOpen || isClosed || totalFull ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                This enrollment link is not accepting applications right now.
              </div>
            ) : (
              <EnrollmentFormClient
                code={code}
                classrooms={classroomOptions}
                documentRequirements={documentRequirements}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
