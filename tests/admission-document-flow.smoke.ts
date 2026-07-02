import assert from "node:assert/strict";
import { mock } from "bun:test";

const localDatabaseUrl =
  "postgresql://postgres:postgres@127.0.0.1:55432/school_clerk";
const smokeDashboardPassword = "lorem-ipsum";
const smokeDashboardPasswordHash =
  "964d103ac14cec8ec8b929c030a7f0b2:7910af4b44dba9fedd8cb5eb87a47f5c35e1dae995cca6535017ad0f4ad2f7fb532ac5373ee4610d32789d156b2bd1ebe75b7a3c454939112def56f127dd52de";
const onePixelPngDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

process.env.POSTGRES_URL ??= localDatabaseUrl;
process.env.DATABASE_URL ??= process.env.POSTGRES_URL;
process.env.APP_ROOT_DOMAIN ??= "school-clerk-dashboard.localhost";
process.env.SCHOOL_SITE_ROOT_DOMAIN ??= "school-clerk-site.localhost";
process.env.BLOB_READ_WRITE_TOKEN ??= "smoke-blob-token";
delete process.env.RESEND_API_KEY;

mock.module("@vercel/blob", () => ({
  put: async (key: string) => ({
    url: onePixelPngDataUrl,
    pathname: key,
  }),
}));

mock.module("next/headers", () => ({
  headers: async () =>
    new Headers({
      host: "smoke.school-clerk-site.localhost",
      "x-forwarded-proto": "http",
    }),
}));

mock.module("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), {
      digest: `NEXT_REDIRECT;replace;${url};303;`,
      url,
    });
  },
}));

function extractRedirectUrl(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "digest" in error &&
    typeof error.digest === "string"
  ) {
    return error.digest.split(";")[2] ?? null;
  }

  return null;
}

function makeSubmissionForm(input: {
  classRoomDepartmentId: string;
  dob?: string;
  documents?: Record<string, File>;
  email?: string;
}) {
  const form = new FormData();
  form.set("classRoomDepartmentId", input.classRoomDepartmentId);
  form.set("studentFirstName", "Ada");
  form.set("studentSurname", "Smoke");
  form.set("studentOtherName", "Flow");
  form.set("studentDob", input.dob ?? "2020-01-15");
  form.set("studentGender", "Female");
  form.set("parentName", "Parent Smoke");
  form.set("parentRelation", "Mother");
  form.set("parentEmail", input.email ?? `parent-${crypto.randomUUID()}@example.com`);
  form.set("parentPhone", "+2348012345678");
  form.set("additionalNotes", "Smoke admission submission.");

  for (const [requirementId, file] of Object.entries(input.documents ?? {})) {
    form.set(`document:${requirementId}`, file);
  }

  return form;
}

function pngFile(name: string) {
  return new File(["smoke"], name, { type: "image/png" });
}

function pdfFile(name: string) {
  return new File(["%PDF-1.4 smoke"], name, { type: "application/pdf" });
}

async function expectRejectsWithMessage(
  action: () => Promise<unknown>,
  expected: string,
) {
  try {
    await action();
  } catch (error) {
    assert.match(error instanceof Error ? error.message : String(error), new RegExp(expected));
    return;
  }

  assert.fail(`Expected action to reject with ${expected}`);
}

async function main() {
  const [
    { prisma },
    {
      approveEnrollmentApplication,
      createOrUpdateEnrollmentLink,
      listEnrollmentLinks,
    },
    { submitEnrollmentApplication },
    { getPublicWebsiteData },
    { GET: admissionLetterGet },
    {
      jsonDocumentTemplateSchema,
      renderJsonDocumentTemplateToPdf,
      simpleAdmissionLetterJsonTemplate,
    },
    { renderToStream },
  ] = await Promise.all([
    import("../packages/db/src/index.ts"),
    import("../apps/api/src/db/queries/enrollment-links.ts"),
    import("../apps/school-site/src/lib/enrollment/actions.ts"),
    import("../apps/school-site/src/lib/website/get-public-website-data.ts"),
    import("../apps/school-site/src/app/api/pdf/admission-letter/route.ts"),
    import("../packages/pdf/src/json-template/index.tsx"),
    import("../packages/pdf/src/index.ts"),
  ]);

  if (
    process.env.SMOKE_CLEANUP_SCHOOL_ID &&
    process.env.SMOKE_CLEANUP_ACCOUNT_ID
  ) {
    await cleanup(prisma as any, {
      accountId: process.env.SMOKE_CLEANUP_ACCOUNT_ID,
      schoolId: process.env.SMOKE_CLEANUP_SCHOOL_ID,
    });
    await prisma.$disconnect();
    console.log(JSON.stringify({ cleaned: true, ok: true }));
    return;
  }

  const suffix = crypto.randomUUID().slice(0, 8);
  const account = await prisma.saasAccount.create({
    data: {
      email: `smoke-${suffix}@example.com`,
      name: `Smoke Account ${suffix}`,
    },
  });
  const admin = await prisma.user.create({
    data: {
      email: `admin-${suffix}@example.com`,
      emailVerified: true,
      name: "Smoke Admin",
      role: "Admin",
      saasAccountId: account.id,
    },
  });
  await prisma.account.create({
    data: {
      accountId: admin.id,
      password: smokeDashboardPasswordHash,
      providerId: "credential",
      userId: admin.id,
    },
  });
  const school = await prisma.schoolProfile.create({
    data: {
      accountId: account.id,
      country: "NG",
      educationSystem: "k12",
      institutionType: "PRIMARY",
      languageOfInstruction: "English",
      name: `Smoke School ${suffix}`,
      slug: `smoke-school-${suffix}`,
      subDomain: `smoke-${suffix}`,
    },
  });
  await prisma.tenantDomain.create({
    data: {
      isPrimary: true,
      isVerified: true,
      saasAccountId: account.id,
      schoolProfileId: school.id,
      subdomain: school.subDomain,
    },
  });
  const websiteConfig = await (prisma as any).websiteTemplateConfig.create({
    data: {
      analyticsJson: {},
      contentJson: {},
      createdByUserId: admin.id,
      name: "Smoke published school website",
      publishedAt: new Date(),
      schoolProfileId: school.id,
      sectionJson: {},
      seoJson: {},
      status: "PUBLISHED",
      templateId: "k12-plus-template-1",
      templateVersion: 1,
      themeJson: {},
      updatedByUserId: admin.id,
    },
  });
  await (prisma as any).websitePublishedConfig.create({
    data: {
      schoolProfileId: school.id,
      websiteConfigId: websiteConfig.id,
    },
  });

  const session = await prisma.schoolSession.create({
    data: {
      schoolId: school.id,
      title: "2026/2027",
    },
  });
  const term = await prisma.sessionTerm.create({
    data: {
      schoolId: school.id,
      sessionId: session.id,
      title: "First Term",
    },
  });
  const classRoom = await prisma.classRoom.create({
    data: {
      classLevel: 1,
      name: `Primary Smoke ${suffix}`,
      schoolProfileId: school.id,
      schoolSessionId: session.id,
    },
  });
  const [primaryA, primaryB] = await Promise.all([
    prisma.classRoomDepartment.create({
      data: {
        classRoomsId: classRoom.id,
        departmentName: `A ${suffix}`,
        schoolProfileId: school.id,
      },
    }),
    prisma.classRoomDepartment.create({
      data: {
        classRoomsId: classRoom.id,
        departmentName: `B ${suffix}`,
        schoolProfileId: school.id,
      },
    }),
  ]);

  const ctx = {
    currentUser: {
      id: admin.id,
      role: "Admin",
      saasAccountId: account.id,
    },
    db: prisma,
    profile: {
      authSessionId: null,
      domain: school.subDomain,
      schoolId: school.id,
      sessionId: session.id,
      termId: term.id,
    },
  } as any;

  const visibleLinkResult = await createOrUpdateEnrollmentLink(ctx, {
    capacityMode: "PER_CLASSROOM",
    classrooms: [
      {
        ageCutoffDate: new Date("2026-09-01T00:00:00.000Z"),
        capacity: 2,
        classRoomDepartmentId: primaryA.id,
        maximumAgeMonths: 96,
        minimumAgeMonths: 60,
        requirementNotes: "Bring original birth certificate on resumption.",
      },
      {
        capacity: 2,
        classRoomDepartmentId: primaryB.id,
      },
    ],
    closesAt: null,
    documentRequirements: [
      {
        classRoomDepartmentId: null,
        documentType: "BIRTH_CERTIFICATE",
        label: "Birth certificate",
        sortOrder: 1,
        uploadRequired: true,
      },
      {
        classRoomDepartmentId: primaryA.id,
        documentType: "PASSPORT_PHOTO",
        label: "Passport photo",
        sortOrder: 2,
        uploadRequired: true,
      },
      {
        classRoomDepartmentId: primaryB.id,
        documentType: "PREVIOUS_SCHOOL_REPORT",
        label: "Previous school report",
        sortOrder: 3,
        uploadRequired: true,
      },
    ],
    id: null,
    instructions: "Apply for the new academic session.",
    opensAt: null,
    showOnWebsite: true,
    status: "ACTIVE",
    title: "2026 Admissions",
    totalCapacity: null,
  });

  const hiddenLinkResult = await createOrUpdateEnrollmentLink(ctx, {
    capacityMode: "TOTAL",
    classrooms: [{ classRoomDepartmentId: primaryB.id }],
    closesAt: null,
    documentRequirements: [],
    id: null,
    instructions: "Manual invite only.",
    opensAt: null,
    showOnWebsite: false,
    status: "ACTIVE",
    title: "Manual admission link",
    totalCapacity: 20,
  });

  await createOrUpdateEnrollmentLink(ctx, {
    capacityMode: "TOTAL",
    classrooms: [{ classRoomDepartmentId: primaryA.id }],
    closesAt: new Date("2020-01-01T00:00:00.000Z"),
    documentRequirements: [],
    id: null,
    instructions: "Closed link.",
    opensAt: null,
    showOnWebsite: true,
    status: "ACTIVE",
    title: "Closed admission link",
    totalCapacity: 20,
  });

  const fullLinkResult = await createOrUpdateEnrollmentLink(ctx, {
    capacityMode: "TOTAL",
    classrooms: [{ classRoomDepartmentId: primaryA.id }],
    closesAt: null,
    documentRequirements: [],
    id: null,
    instructions: "Full link.",
    opensAt: null,
    showOnWebsite: true,
    status: "ACTIVE",
    title: "Full admission link",
    totalCapacity: 1,
  });
  await (prisma as any).enrollmentApplication.create({
    data: {
      classRoomDepartmentId: primaryA.id,
      enrollmentLinkId: fullLinkResult.id,
      schoolProfileId: school.id,
      status: "SUBMITTED",
      studentDob: new Date("2020-01-15T00:00:00.000Z"),
      studentFirstName: "Full",
      studentGender: "Female",
      studentSurname: "Capacity",
    },
  });

  const links = await listEnrollmentLinks(ctx);
  const visibleListed = links.find((link: any) => link.id === visibleLinkResult.id);
  assert.equal(visibleListed?.showOnWebsite, true);
  assert.match(visibleListed?.publicUrl ?? "", /school-clerk-site\.localhost\/enroll\//);

  const websiteData = await getPublicWebsiteData(
    {
      institutionType: "PRIMARY",
      schoolName: school.name,
      schoolProfileId: school.id,
      subdomain: school.subDomain,
    },
    null,
    { includeFallback: false },
  );
  assert.deepEqual(
    websiteData.admissionLinks.map((link: any) => link.title),
    ["2026 Admissions"],
  );

  const requirements = await (prisma as any).enrollmentLinkDocumentRequirement.findMany({
    where: { enrollmentLinkId: visibleLinkResult.id, deletedAt: null },
    orderBy: [{ sortOrder: "asc" }],
  });
  const birthCertificate = requirements.find(
    (requirement: any) => requirement.documentType === "BIRTH_CERTIFICATE",
  );
  const passport = requirements.find(
    (requirement: any) => requirement.documentType === "PASSPORT_PHOTO",
  );
  const previousReport = requirements.find(
    (requirement: any) => requirement.documentType === "PREVIOUS_SCHOOL_REPORT",
  );
  assert.ok(birthCertificate);
  assert.ok(passport);
  assert.ok(previousReport);

  await expectRejectsWithMessage(
    () =>
      submitEnrollmentApplication(
        visibleLinkResult.code,
        makeSubmissionForm({
          classRoomDepartmentId: primaryA.id,
          dob: "2024-01-01",
          documents: {
            [birthCertificate.id]: pdfFile("birth.pdf"),
            [passport.id]: pngFile("passport.png"),
          },
        }),
      ),
    "at least",
  );

  await expectRejectsWithMessage(
    () =>
      submitEnrollmentApplication(
        visibleLinkResult.code,
        makeSubmissionForm({
          classRoomDepartmentId: primaryA.id,
          documents: {
            [birthCertificate.id]: pdfFile("birth.pdf"),
          },
        }),
      ),
    "Passport photo is required",
  );

  await expectRejectsWithMessage(
    () =>
      submitEnrollmentApplication(
        visibleLinkResult.code,
        makeSubmissionForm({
          classRoomDepartmentId: primaryA.id,
          documents: {
            [birthCertificate.id]: pdfFile("birth.pdf"),
            [passport.id]: pngFile("passport.png"),
            [previousReport.id]: pdfFile("wrong-class.pdf"),
          },
        }),
      ),
    "Only upload documents",
  );

  let redirectUrl: string | null = null;
  try {
    await submitEnrollmentApplication(
      visibleLinkResult.code,
      makeSubmissionForm({
        classRoomDepartmentId: primaryA.id,
        documents: {
          [birthCertificate.id]: pdfFile("birth.pdf"),
          [passport.id]: pngFile("passport.png"),
        },
      }),
    );
  } catch (error) {
    redirectUrl = extractRedirectUrl(error);
  }
  assert.match(redirectUrl ?? "", new RegExp(`/enroll/${visibleLinkResult.code}`));

  const application = await (prisma as any).enrollmentApplication.findFirstOrThrow({
    where: {
      enrollmentLinkId: visibleLinkResult.id,
      studentFirstName: "Ada",
    },
    include: {
      documents: true,
      parents: true,
    },
  });
  assert.equal(application.documents.length, 2);
  assert.ok(
    application.documents.some(
      (document: any) => document.documentType === "PASSPORT_PHOTO",
    ),
  );
  assert.equal(application.parents[0]?.email?.includes("@example.com"), true);

  let manualRedirectUrl: string | null = null;
  try {
    await submitEnrollmentApplication(
      hiddenLinkResult.code,
      makeSubmissionForm({
        classRoomDepartmentId: primaryB.id,
        email: `manual-${suffix}@example.com`,
      }),
    );
  } catch (error) {
    manualRedirectUrl = extractRedirectUrl(error);
  }
  assert.match(manualRedirectUrl ?? "", new RegExp(`/enroll/${hiddenLinkResult.code}`));

  const customAdmissionTemplate = jsonDocumentTemplateSchema.parse({
    ...simpleAdmissionLetterJsonTemplate,
    label: "Smoke custom admission letter",
    templateId: `custom-admission-${suffix}`,
  });
  const customResultTemplate = jsonDocumentTemplateSchema.parse({
    ...simpleAdmissionLetterJsonTemplate,
    documentType: "RESULT_SHEET",
    label: "Smoke custom result",
    templateId: `custom-result-${suffix}`,
  });
  await (prisma as any).customDocumentTemplateRequest.createMany({
    data: [
      {
        builtTemplateId: customAdmissionTemplate.templateId,
        builtTemplateJson: customAdmissionTemplate,
        builtTemplateVersion: customAdmissionTemplate.templateVersion,
        documentType: "ADMISSION_LETTER",
        mimeType: "application/pdf",
        schoolProfileId: school.id,
        sourceFileName: "source-admission.pdf",
        sourceFileUrl: "https://example.com/source-admission.pdf",
        status: "READY",
        storageProvider: "vercel-blob",
        title: "Smoke custom admission letter",
      },
      {
        builtTemplateId: customResultTemplate.templateId,
        builtTemplateJson: customResultTemplate,
        builtTemplateVersion: customResultTemplate.templateVersion,
        documentType: "RESULT_SHEET",
        mimeType: "application/pdf",
        quotePaymentInstructions: "Pay before custom build starts.",
        quotePaymentLink: "https://pay.example.com/template",
        quotedAmount: 15000,
        quotedCurrency: "NGN",
        schoolProfileId: school.id,
        sourceFileName: "source-result.pdf",
        sourceFileUrl: "https://example.com/source-result.pdf",
        status: "READY",
        storageProvider: "vercel-blob",
        title: "Smoke custom result",
      },
    ],
  });
  await (prisma as any).schoolDocumentTemplatePreference.create({
    data: {
      documentType: "RESULT_SHEET",
      schoolProfileId: school.id,
      source: "custom",
      templateId: customResultTemplate.templateId,
      templateVersion: customResultTemplate.templateVersion,
    },
  });

  await expectRejectsWithMessage(
    () =>
      approveEnrollmentApplication(ctx, {
        applicationId: application.id,
        admissionLetterTemplateId: customAdmissionTemplate.templateId,
        paymentAmount: 0,
        paymentCurrency: "NGN",
        paymentInstructions: "",
        paymentRequired: true,
      } as any),
    "positive amount",
  );

  const approval = await approveEnrollmentApplication(ctx, {
    admissionLetterTemplateId: customAdmissionTemplate.templateId,
    applicationId: application.id,
    paymentAmount: 25000,
    paymentCurrency: "NGN",
    paymentDueAt: new Date("2026-10-01T00:00:00.000Z"),
    paymentInstructions: "Pay through the bursary before resumption.",
    paymentLabel: "Admission payment",
    paymentLink: "https://pay.example.com/admission",
    paymentRequired: true,
  });
  assert.equal(approval.success, true);

  const approvedApplication = await (prisma as any).enrollmentApplication.findUniqueOrThrow({
    where: { id: application.id },
  });
  assert.equal(approvedApplication.status, "APPROVED");
  assert.equal(
    approvedApplication.admissionLetterTemplateId,
    customAdmissionTemplate.templateId,
  );
  assert.equal(approvedApplication.admissionPaymentRequired, true);
  assert.equal(approvedApplication.acceptedStudentId ? true : false, true);
  assert.equal(approvedApplication.acceptedTermFormId ? true : false, true);

  const customLetterResponse = await admissionLetterGet(
    new Request(
      `http://smoke.school-clerk-site.localhost/api/pdf/admission-letter?code=${visibleLinkResult.code}&applicationId=${application.id}`,
    ) as any,
  );
  assert.equal(customLetterResponse.headers.get("content-type"), "application/pdf");
  assert.ok((await customLetterResponse.arrayBuffer()).byteLength > 1000);

  const builtInLetterResponse = await admissionLetterGet(
    new Request(
      `http://smoke.school-clerk-site.localhost/api/pdf/admission-letter?code=${visibleLinkResult.code}&applicationId=${application.id}&templateId=admission-classic-v1`,
    ) as any,
  );
  assert.equal(builtInLetterResponse.headers.get("content-type"), "application/pdf");
  assert.ok((await builtInLetterResponse.arrayBuffer()).byteLength > 1000);

  const customResultStream = await renderToStream(
    renderJsonDocumentTemplateToPdf(customResultTemplate, {
      reports: [
        {
          classroomName: "Primary Smoke",
          studentName: "Ada Smoke",
        },
      ],
      schoolName: school.name,
      termLabel: "First Term • 2026/2027",
    }),
  );
  assert.ok(customResultStream);
  assert.ok((await new Response(customResultStream as BodyInit).arrayBuffer()).byteLength > 1000);

  console.log(
    JSON.stringify({
      accountId: account.id,
      admissionLinksOnWebsite: websiteData.admissionLinks.length,
      adminEmail: admin.email,
      adminPassword: smokeDashboardPassword,
      applicationId: application.id,
      approvedApplicationStatus: approvedApplication.status,
      customAdmissionTemplate: customAdmissionTemplate.templateId,
      customResultTemplate: customResultTemplate.templateId,
      documentsUploaded: application.documents.length,
      hiddenLink: hiddenLinkResult.code,
      manualLinkSubmitted: Boolean(manualRedirectUrl),
      ok: true,
      schoolId: school.id,
      schoolSubDomain: school.subDomain,
      sessionId: session.id,
      termId: term.id,
      visibleLink: visibleLinkResult.code,
      websiteConfigId: websiteConfig.id,
    }),
  );

  if (process.env.SMOKE_KEEP_DATA !== "1") {
    await cleanup(prisma as any, {
      accountId: account.id,
      schoolId: school.id,
    });
  }
  await prisma.$disconnect();
}

async function cleanup(
  db: any,
  input: {
    accountId: string;
    schoolId: string;
  },
) {
  const smokeUsers = await db.user.findMany({
    where: { saasAccountId: input.accountId },
    select: { id: true },
  });
  const smokeUserIds = smokeUsers.map((user: { id: string }) => user.id);

  await db.enrollmentApplicationDocument.deleteMany({
    where: { enrollmentApplication: { schoolProfileId: input.schoolId } },
  });
  await db.enrollmentApplicationParent.deleteMany({
    where: { enrollmentApplication: { schoolProfileId: input.schoolId } },
  });
  await db.enrollmentApplication.deleteMany({
    where: { schoolProfileId: input.schoolId },
  });
  await db.enrollmentLinkDocumentRequirement.deleteMany({
    where: { enrollmentLink: { schoolProfileId: input.schoolId } },
  });
  await db.enrollmentLinkClassroom.deleteMany({
    where: { enrollmentLink: { schoolProfileId: input.schoolId } },
  });
  await db.enrollmentLink.deleteMany({
    where: { schoolProfileId: input.schoolId },
  });
  await db.websitePublishedConfig.deleteMany({
    where: { schoolProfileId: input.schoolId },
  });
  await db.websiteMediaAsset.deleteMany({
    where: { schoolProfileId: input.schoolId },
  });
  await db.websiteTemplateConfig.deleteMany({
    where: { schoolProfileId: input.schoolId },
  });
  await db.schoolDocumentTemplatePreference.deleteMany({
    where: { schoolProfileId: input.schoolId },
  });
  await db.customDocumentTemplateRequest.deleteMany({
    where: { schoolProfileId: input.schoolId },
  });
  await db.notificationRecipient.deleteMany({
    where: {
      OR: [
        { notification: { schoolProfileId: input.schoolId } },
        { recipientContact: { schoolProfileId: input.schoolId } },
      ],
    },
  });
  await db.notificationTag.deleteMany({
    where: { notification: { schoolProfileId: input.schoolId } },
  });
  await db.notification.deleteMany({
    where: { schoolProfileId: input.schoolId },
  });
  await db.notificationPreference.deleteMany({
    where: { schoolProfileId: input.schoolId },
  });
  await db.notificationContact.deleteMany({
    where: { schoolProfileId: input.schoolId },
  });
  await db.studentGuardians.deleteMany({
    where: { student: { schoolProfileId: input.schoolId } },
  });
  await db.studentTermForm.deleteMany({
    where: { schoolProfileId: input.schoolId },
  });
  await db.studentSessionForm.deleteMany({
    where: { schoolProfileId: input.schoolId },
  });
  await db.students.deleteMany({
    where: { schoolProfileId: input.schoolId },
  });
  await db.guardians.deleteMany({
    where: { schoolProfileId: input.schoolId },
  });
  await db.classRoomDepartment.deleteMany({
    where: { schoolProfileId: input.schoolId },
  });
  await db.classRoom.deleteMany({
    where: { schoolProfileId: input.schoolId },
  });
  await db.sessionTerm.deleteMany({
    where: { schoolId: input.schoolId },
  });
  await db.schoolSession.deleteMany({
    where: { schoolId: input.schoolId },
  });
  await db.tenantDomain.deleteMany({
    where: { schoolProfileId: input.schoolId },
  });
  await db.schoolProfile.deleteMany({
    where: { id: input.schoolId },
  });
  await db.session.deleteMany({
    where: { user: { saasAccountId: input.accountId } },
  });
  await db.account.deleteMany({
    where: { user: { saasAccountId: input.accountId } },
  });
  if (smokeUserIds.length) {
    await db.verification.deleteMany({
      where: {
        OR: [
          {
            identifier: { startsWith: "reset-password:" },
            value: { in: smokeUserIds },
          },
          ...smokeUserIds.map((userId: string) => ({
            identifier: { startsWith: "dev-quick-login-restore:" },
            value: { contains: userId },
          })),
        ],
      },
    });
  }
  await db.user.deleteMany({
    where: { saasAccountId: input.accountId },
  });
  await db.saasAccount.deleteMany({
    where: { id: input.accountId },
  });
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
