"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { put } from "@vercel/blob";

import { initAuth } from "@school-clerk/auth";
import { prisma } from "@school-clerk/db";
import { resolveDashboardAppRootDomain } from "@school-clerk/utils";

const ACTIVE_APPLICATION_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "APPROVED"];
const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
const SUPPORTED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

function normalizePhone(value?: FormDataEntryValue | string | null) {
  return typeof value === "string" ? value.replace(/[^\d+]/g, "").trim() : "";
}

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function nullableTextValue(formData: FormData, key: string) {
  const value = textValue(formData, key);
  return value || null;
}

function calculateAgeMonths(dateOfBirth: Date, cutoffDate: Date) {
  let months =
    (cutoffDate.getFullYear() - dateOfBirth.getFullYear()) * 12 +
    (cutoffDate.getMonth() - dateOfBirth.getMonth());

  if (cutoffDate.getDate() < dateOfBirth.getDate()) {
    months -= 1;
  }

  return months;
}

function formatAgeMonths(months: number) {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years && remainingMonths) {
    return `${years} year${years === 1 ? "" : "s"} ${remainingMonths} month${
      remainingMonths === 1 ? "" : "s"
    }`;
  }

  if (years) return `${years} year${years === 1 ? "" : "s"}`;
  return `${months} month${months === 1 ? "" : "s"}`;
}

function getApplicableDocumentRequirements(
  requirements: any[],
  classRoomDepartmentId: string,
) {
  return requirements.filter(
    (requirement) =>
      !requirement.classRoomDepartmentId ||
      requirement.classRoomDepartmentId === classRoomDepartmentId,
  );
}

function assertClassAgeRequirement(input: {
  classroom: any;
  link: any;
  studentDob: Date;
}) {
  if (
    input.classroom.minimumAgeMonths == null &&
    input.classroom.maximumAgeMonths == null
  ) {
    return;
  }

  const cutoffDate =
    input.classroom.ageCutoffDate ?? input.link.opensAt ?? new Date();
  const ageMonths = calculateAgeMonths(input.studentDob, cutoffDate);

  if (
    input.classroom.minimumAgeMonths != null &&
    ageMonths < input.classroom.minimumAgeMonths
  ) {
    throw new Error(
      `Student must be at least ${formatAgeMonths(
        input.classroom.minimumAgeMonths,
      )} for this classroom.`,
    );
  }

  if (
    input.classroom.maximumAgeMonths != null &&
    ageMonths > input.classroom.maximumAgeMonths
  ) {
    throw new Error(
      `Student must not be older than ${formatAgeMonths(
        input.classroom.maximumAgeMonths,
      )} for this classroom.`,
    );
  }
}

function getDashboardOrigin(subDomain: string) {
  const appRoot = resolveDashboardAppRootDomain(process.env.APP_ROOT_DOMAIN);
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

  if (process.env.NODE_ENV === "production") {
    const rootDomain = appRoot.startsWith("dashboard.")
      ? appRoot.slice("dashboard.".length)
      : appRoot;

    return `${protocol}://dashboard.${subDomain}.${rootDomain}`;
  }

  return `${protocol}://${subDomain}.${appRoot}`;
}

function getAuthForSchoolSite() {
  const appRoot = resolveDashboardAppRootDomain(process.env.APP_ROOT_DOMAIN);
  const baseUrl =
    process.env.NODE_ENV === "production"
      ? `https://${process.env.NEXT_PUBLIC_APP_URL}`
      : `http://${appRoot}`;

  return initAuth({
    baseUrl,
    productionUrl: `https://${process.env.NEXT_PUBLIC_APP_URL ?? "turbo.t3.gg"}`,
    secret: process.env.BETTER_AUTH_SECRET,
  });
}

async function findApplication(id: string) {
  return (prisma as any).enrollmentApplication.findFirst({
    where: { id, deletedAt: null },
    include: {
      schoolProfile: true,
      parents: { where: { deletedAt: null } },
    },
  });
}

async function assertCapacity(link: any, classRoomDepartmentId: string) {
  const baseWhere = {
    enrollmentLinkId: link.id,
    status: { in: ACTIVE_APPLICATION_STATUSES },
    deletedAt: null,
  };

  if (link.capacityMode === "TOTAL") {
    const count = await (prisma as any).enrollmentApplication.count({
      where: baseWhere,
    });

    if (link.totalCapacity && count >= link.totalCapacity) {
      throw new Error("This enrollment link has reached its total capacity.");
    }

    return;
  }

  const classroom = link.classrooms.find(
    (row: any) => row.classRoomDepartmentId === classRoomDepartmentId,
  );
  const count = await (prisma as any).enrollmentApplication.count({
    where: {
      ...baseWhere,
      classRoomDepartmentId,
    },
  });

  if (classroom?.capacity && count >= classroom.capacity) {
    throw new Error("This classroom has reached its enrollment capacity.");
  }
}

async function uploadDocument(input: {
  applicationId: string;
  code: string;
  file: File;
  requirementId: string;
}) {
  if (!SUPPORTED_DOCUMENT_TYPES.has(input.file.type)) {
    throw new Error(`${input.file.name} must be a PDF, JPG, or PNG file.`);
  }

  if (input.file.size > MAX_DOCUMENT_SIZE_BYTES) {
    throw new Error(`${input.file.name} must be 10MB or smaller.`);
  }

  const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const key = `enrollment/${input.code}/${input.applicationId}/${input.requirementId}-${safeName}`;
  const blob = await put(key, input.file, {
    access: "public",
  });

  return {
    fileName: input.file.name,
    fileUrl: blob.url,
    storageProvider: "vercel-blob",
    storageKey: blob.pathname,
    mimeType: input.file.type,
    sizeBytes: input.file.size,
  };
}

export async function submitEnrollmentApplication(
  code: string,
  formData: FormData,
) {
  const db = prisma as any;
  const link = await db.enrollmentLink.findFirst({
    where: { code, status: "ACTIVE", deletedAt: null },
    include: {
      schoolProfile: true,
      classrooms: { where: { deletedAt: null } },
      documentRequirements: {
        where: { deletedAt: null },
        orderBy: [{ sortOrder: "asc" }],
      },
    },
  });

  if (!link) {
    throw new Error("This enrollment link is no longer available.");
  }

  const now = new Date();
  if (link.opensAt && link.opensAt > now) {
    throw new Error("This enrollment link is not open yet.");
  }
  if (link.closesAt && link.closesAt < now) {
    throw new Error("This enrollment link is closed.");
  }

  const classRoomDepartmentId = textValue(formData, "classRoomDepartmentId");
  const selectedClassroom = link.classrooms.find(
    (classroom: any) =>
      classroom.classRoomDepartmentId === classRoomDepartmentId,
  );

  if (!selectedClassroom) {
    throw new Error("Select an available classroom.");
  }

  await assertCapacity(link, classRoomDepartmentId);

  const parentPhone = normalizePhone(formData.get("parentPhone"));
  if (!parentPhone) {
    throw new Error("Primary parent phone number is required.");
  }
  const studentFirstName = textValue(formData, "studentFirstName");
  const studentSurname = textValue(formData, "studentSurname");
  const studentDobText = textValue(formData, "studentDob");
  const studentDob = studentDobText ? new Date(studentDobText) : null;
  const studentGender = textValue(formData, "studentGender");
  const parentName = textValue(formData, "parentName");

  if (!studentFirstName || !studentSurname) {
    throw new Error("Student first name and surname are required.");
  }
  if (!studentDob || Number.isNaN(studentDob.getTime())) {
    throw new Error("A valid student date of birth is required.");
  }
  if (studentGender !== "Male" && studentGender !== "Female") {
    throw new Error("Select a valid student gender.");
  }
  if (!parentName) {
    throw new Error("Primary parent name is required.");
  }

  assertClassAgeRequirement({
    classroom: selectedClassroom,
    link,
    studentDob,
  });

  const documentUploads: {
    file: File;
    requirementId: string;
  }[] = [];
  const applicableRequirements = getApplicableDocumentRequirements(
    link.documentRequirements,
    classRoomDepartmentId,
  );

  for (const requirement of applicableRequirements) {
    const file = formData.get(`document:${requirement.id}`);
    if (
      requirement.uploadRequired &&
      (!(file instanceof File) || file.size === 0)
    ) {
      throw new Error(`${requirement.label} is required.`);
    }

    if (file instanceof File && file.size > 0) {
      documentUploads.push({
        file,
        requirementId: requirement.id,
      });
    }
  }

  const applicationId = crypto.randomUUID();
  const uploadedDocuments: {
    fileName: string;
    fileUrl: string;
    mimeType: string;
    requirementId: string;
    sizeBytes: number;
    storageKey: string;
    storageProvider: string;
  }[] = [];

  for (const upload of documentUploads) {
    uploadedDocuments.push({
      requirementId: upload.requirementId,
      ...(await uploadDocument({
        applicationId,
        code,
        file: upload.file,
        requirementId: upload.requirementId,
      })),
    });
  }

  const application = await db.enrollmentApplication.create({
    data: {
      id: applicationId,
      schoolProfileId: link.schoolProfileId,
      enrollmentLinkId: link.id,
      classRoomDepartmentId,
      studentFirstName,
      studentSurname,
      studentOtherName: nullableTextValue(formData, "studentOtherName"),
      studentDob,
      studentGender,
      additionalNotes: nullableTextValue(formData, "additionalNotes"),
      parents: {
        create: {
          name: parentName,
          relation: nullableTextValue(formData, "parentRelation"),
          email: nullableTextValue(formData, "parentEmail")?.toLowerCase(),
          phone: parentPhone,
          phone2: normalizePhone(formData.get("parentPhone2")) || null,
          isPrimary: true,
        },
      },
      documents: {
        create: uploadedDocuments,
      },
    },
    select: { id: true },
  });

  redirect(`/enroll/${code}?submitted=${application.id}`);
}

export async function setupEnrollmentParentPassword(
  code: string,
  formData: FormData,
) {
  const applicationId = textValue(formData, "applicationId");
  const email = textValue(formData, "email").toLowerCase();
  const password = textValue(formData, "password");
  const application = await findApplication(applicationId);

  if (!email || !email.includes("@")) {
    throw new Error("A valid email address is required.");
  }
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  if (!application) {
    throw new Error("Enrollment application not found.");
  }

  const primaryParent =
    application.parents.find((parent: any) => parent.isPrimary) ??
    application.parents[0];

  if (!primaryParent) {
    throw new Error("Primary parent information was not found.");
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      saasAccountId: application.schoolProfile.accountId,
      OR: [{ email }, { phoneNo: normalizePhone(primaryParent.phone) }],
    },
    select: {
      id: true,
      accounts: { select: { password: true } },
    },
  });

  if (existingUser?.accounts.some((account) => Boolean(account.password))) {
    await (prisma as any).enrollmentApplicationParent.update({
      where: { id: primaryParent.id },
      data: { linkedUserId: existingUser.id },
    });
    redirect(`${getDashboardOrigin(application.schoolProfile.subDomain)}/login`);
  }

  if (existingUser) {
    const token = crypto.randomUUID();
    await prisma.verification.create({
      data: {
        identifier: `reset-password:${token}`,
        value: existingUser.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });
    await (prisma as any).enrollmentApplicationParent.update({
      where: { id: primaryParent.id },
      data: { linkedUserId: existingUser.id, email },
    });

    const resetUrl = new URL(
      `${getDashboardOrigin(application.schoolProfile.subDomain)}/reset-password`,
    );
    resetUrl.searchParams.set("token", token);
    resetUrl.searchParams.set("email", email);
    redirect(resetUrl.toString());
  }

  const requestHeaders = new Headers(await headers());
  const auth = getAuthForSchoolSite();
  const signUp = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name: primaryParent.name,
      role: "Parent",
    },
    headers: requestHeaders,
  });
  const userId = signUp?.user?.id;

  if (!userId) {
    throw new Error("Could not create parent login.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      saasAccountId: application.schoolProfile.accountId,
      phoneNo: normalizePhone(primaryParent.phone),
      role: "Parent",
    },
  });

  await (prisma as any).enrollmentApplicationParent.update({
    where: { id: primaryParent.id },
    data: { linkedUserId: userId, email },
  });

  redirect(`/enroll/${code}?submitted=${applicationId}&parentReady=1`);
}
