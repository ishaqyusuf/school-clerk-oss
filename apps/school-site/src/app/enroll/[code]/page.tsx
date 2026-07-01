import { notFound } from "next/navigation";

import { setupEnrollmentParentPassword } from "@/lib/enrollment/actions";
import { EnrollmentFormClient } from "./enrollment-form-client";
import { prisma } from "@school-clerk/db";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@school-clerk/ui/card";
import { Input } from "@school-clerk/ui/input";

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
  const link = await db.enrollmentLink.findFirst({
    where: { code, status: "ACTIVE", deletedAt: null },
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
    totalCount,
    classrooms: link.classrooms.map((row: any) => ({
      ...row,
      name: classroomName(row.classRoomDepartment),
      used: countMap.get(row.classRoomDepartmentId) ?? 0,
    })),
  };
}

async function getSubmissionState(code: string, applicationId?: string | null) {
  if (!applicationId) return null;

  const application = await (prisma as any).enrollmentApplication.findFirst({
    where: {
      id: applicationId,
      deletedAt: null,
      enrollmentLink: {
        code,
        deletedAt: null,
      },
    },
    include: {
      schoolProfile: true,
      parents: { where: { deletedAt: null } },
    },
  });

  if (!application) return null;
  const primaryParent =
    application.parents.find((parent: any) => parent.isPrimary) ??
    application.parents[0];

  const existingUser = primaryParent
    ? await prisma.user.findFirst({
        where: {
          deletedAt: null,
          saasAccountId: application.schoolProfile.accountId,
          OR: [
            ...(primaryParent.email ? [{ email: primaryParent.email }] : []),
            { phoneNo: primaryParent.phone },
          ],
        },
        select: {
          id: true,
          email: true,
          accounts: { select: { password: true } },
        },
      })
    : null;

  return {
    application,
    primaryParent,
    existingUser,
    canLogin: existingUser?.accounts.some((account) => Boolean(account.password)),
  };
}

export default async function EnrollmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ submitted?: string; parentReady?: string }>;
}) {
  const [{ code }, query] = await Promise.all([params, searchParams]);
  const [link, submission] = await Promise.all([
    getEnrollmentLink(code),
    getSubmissionState(code, query.submitted),
  ]);

  if (!link) notFound();

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
              {submission.canLogin || query.parentReady === "1" ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  Your parent login is ready. You can sign in with your email or
                  primary phone number after the school approves your ward.
                </div>
              ) : (
                <form
                  action={setupEnrollmentParentPassword.bind(null, code)}
                  className="space-y-4 rounded-md border border-slate-200 p-4"
                >
                  <input
                    name="applicationId"
                    type="hidden"
                    value={submission.application.id}
                  />
                  <div>
                    <h2 className="font-medium">Setup parent password</h2>
                    <p className="text-sm text-slate-600">
                      Create your parent login now. You can sign in later with
                      this email or your primary phone number.
                    </p>
                  </div>
                  <label className="block space-y-1 text-sm">
                    <span>Email</span>
                    <Input
                      defaultValue={submission.primaryParent?.email ?? ""}
                      name="email"
                      required
                      type="email"
                    />
                  </label>
                  <label className="block space-y-1 text-sm">
                    <span>Password</span>
                    <Input name="password" required type="password" />
                  </label>
                  <Button type="submit">Setup parent password</Button>
                </form>
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
