import { prisma } from "@school-clerk/db";
import { renderToStream } from "@school-clerk/pdf";
import { renderSchoolDocumentTemplate } from "@school-clerk/pdf/document-templates";
import {
  jsonDocumentTemplateSchema,
  renderJsonDocumentTemplateToPdf,
} from "@school-clerk/pdf/json-template";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const paramsSchema = z.object({
  applicationId: z.string().min(1),
  code: z.string().min(1),
  download: z.preprocess((value) => value === "true", z.boolean().default(false)),
  templateId: z.string().trim().min(1).max(120).optional(),
});

function fullName(input: {
  studentFirstName?: string | null;
  studentOtherName?: string | null;
  studentSurname?: string | null;
}) {
  return [input.studentFirstName, input.studentOtherName, input.studentSurname]
    .filter(Boolean)
    .join(" ");
}

function classroomLabel(classroomDepartment: any) {
  return [
    classroomDepartment?.classRoom?.name,
    classroomDepartment?.departmentName,
  ]
    .filter(Boolean)
    .join(" ");
}

function formatDate(value?: Date | string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(date);
}

function formatPaymentAmount(
  amount?: { toString: () => string } | number | string | null,
  currency = "NGN",
) {
  if (amount == null || Number(amount) <= 0) return null;

  return new Intl.NumberFormat("en-NG", {
    currency,
    style: "currency",
  }).format(Number(amount));
}

function safeFilename(value: string) {
  return value.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();
}

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const parsed = paramsSchema.safeParse(
    Object.fromEntries(requestUrl.searchParams.entries()),
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid admission letter PDF request." },
      { status: 400 },
    );
  }

  const application = await (prisma as any).enrollmentApplication.findFirst({
    where: {
      id: parsed.data.applicationId,
      deletedAt: null,
      status: "APPROVED",
      enrollmentLink: {
        code: parsed.data.code,
        deletedAt: null,
      },
    },
    include: {
      classRoomDepartment: {
        include: {
          classRoom: {
            include: {
              session: true,
            },
          },
        },
      },
      documents: {
        where: {
          deletedAt: null,
          documentType: "PASSPORT_PHOTO",
        },
        orderBy: [{ uploadedAt: "desc" }],
        take: 1,
      },
      enrollmentLink: true,
      parents: {
        where: { deletedAt: null },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
      schoolProfile: true,
    },
  });

  if (!application) {
    return NextResponse.json(
      { error: "Admission letter not found." },
      { status: 404 },
    );
  }

  const studentName = fullName(application);
  const primaryParent = application.parents[0] ?? null;
  const passport = application.documents[0] ?? null;
  const paymentCurrency = application.admissionPaymentCurrency ?? "NGN";
  const preferredTemplateId =
    parsed.data.templateId ?? application.admissionLetterTemplateId ?? undefined;
  const admissionLetterPayload = {
    applicationReference: application.id.slice(0, 8).toUpperCase(),
    approvedAt: formatDate(application.reviewedAt),
    classroomName: classroomLabel(application.classRoomDepartment),
    parentName: primaryParent?.name ?? null,
    passportPhotoUrl: passport?.fileUrl ?? null,
    payment: {
      amount: formatPaymentAmount(
        application.admissionPaymentAmount,
        paymentCurrency,
      ),
      dueAt: formatDate(application.admissionPaymentDueAt),
      instructions: application.admissionPaymentInstructions,
      label: application.admissionPaymentLabel,
      link: application.admissionPaymentLink,
      required: Boolean(application.admissionPaymentRequired),
    },
    schoolAddress: null,
    schoolName: application.schoolProfile.name,
    sessionLabel:
      application.classRoomDepartment?.classRoom?.session?.title ?? null,
    studentName,
  };
  const customTemplateRequest = preferredTemplateId
    ? await (prisma as any).customDocumentTemplateRequest.findFirst({
        where: {
          builtTemplateId: preferredTemplateId,
          deletedAt: null,
          documentType: "ADMISSION_LETTER",
          schoolProfileId: application.schoolProfileId,
          status: "READY",
        },
        select: {
          builtTemplateJson: true,
        },
      })
    : null;
  const customTemplateResult = customTemplateRequest?.builtTemplateJson
    ? jsonDocumentTemplateSchema.safeParse(customTemplateRequest.builtTemplateJson)
    : null;

  if (customTemplateResult && !customTemplateResult.success) {
    return NextResponse.json(
      { error: "Selected custom admission letter template JSON is invalid." },
      { status: 500 },
    );
  }

  const customTemplate = customTemplateResult?.data ?? null;
  const strm =
    customTemplate?.documentType === "ADMISSION_LETTER"
      ? renderJsonDocumentTemplateToPdf(customTemplate, admissionLetterPayload)
      : renderSchoolDocumentTemplate({
          documentType: "ADMISSION_LETTER",
          preferredTemplateId,
          schoolSystem: "k12",
          payload: admissionLetterPayload,
        });

  try {
    const stream = await renderToStream(strm);
    if (!stream) {
      return NextResponse.json(
        { error: "Failed to render admission letter PDF stream." },
        { status: 500 },
      );
    }

    const blob = await new Response(stream as unknown as BodyInit).blob();
    const safeTitle = safeFilename(
      `admission-letter-${studentName || application.id.slice(0, 8)}`,
    );
    const headers: Record<string, string> = {
      "Cache-Control": "no-store, max-age=0",
      "Content-Type": "application/pdf",
    };

    headers["Content-Disposition"] = parsed.data.download
      ? `attachment; filename="${safeTitle}.pdf"`
      : `inline; filename="${safeTitle}.pdf"`;

    return new Response(blob, { headers });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate admission letter PDF.",
      },
      { status: 500 },
    );
  }
}
