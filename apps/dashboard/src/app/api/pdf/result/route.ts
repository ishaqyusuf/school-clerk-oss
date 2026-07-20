import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { configs } from "@/configs";
import { buildStudentReportsById } from "@/features/student-report/report-model";
import { getClassroomReportSheet } from "@api/db/queries/report-sheet";
import { prisma } from "@school-clerk/db";
import { renderToStream } from "@school-clerk/pdf";
import { renderSchoolDocumentTemplate } from "@school-clerk/pdf/document-templates";
import {
  jsonDocumentTemplateSchema,
  renderJsonDocumentTemplateToPdf,
} from "@school-clerk/pdf/json-template";
import {
	type StudentNameFormat,
	formatStudentName,
} from "@school-clerk/utils/student-name";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const paramsSchema = z.object({
  termFormIds: z
    .string()
    .min(1)
    .transform((value) =>
      Array.from(
        new Set(
          value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        ),
      ),
    ),
  termId: z.string().optional(),
  templateId: z.string().optional(),
	download: z.preprocess(
		(value) => value === "true",
		z.boolean().default(false),
	),
});

const getStudentName = (
	student: {
  name?: string | null;
  surname?: string | null;
  otherName?: string | null;
	},
	format?: StudentNameFormat,
) => formatStudentName(student, format);

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const parsed = paramsSchema.safeParse(
    Object.fromEntries(requestUrl.searchParams.entries()),
  );

  if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid result PDF request." },
			{ status: 400 },
		);
  }

  const auth = await getAuthCookie();
  const termId = parsed.data.termId ?? auth.termId;
  if (!auth.schoolId || !termId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const selectedTermForms = await prisma.studentTermForm.findMany({
    where: {
      id: { in: parsed.data.termFormIds },
      sessionTermId: termId,
      deletedAt: null,
    },
    select: {
      id: true,
      classroomDepartmentId: true,
    },
  });

  if (!selectedTermForms.length) {
    return NextResponse.json({ error: "No reports found." }, { status: 404 });
  }

  const departmentIds = Array.from(
		new Set(
			selectedTermForms
				.map((item) => item.classroomDepartmentId)
				.filter(Boolean),
		),
  ) as string[];

	const [classrooms, sessionTerm, departmentSheets, schoolSettings] =
		await Promise.all([
    prisma.classRoomDepartment.findMany({
      where: {
        id: { in: departmentIds },
      },
      select: {
        id: true,
        departmentName: true,
        classRoom: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.sessionTerm.findUnique({
      where: {
        id: termId,
      },
      select: {
        title: true,
        session: {
          select: {
            title: true,
          },
        },
      },
    }),
    Promise.all(
      departmentIds.map((departmentId) =>
        getClassroomReportSheet(
          {
            db: prisma,
            profile: {
              schoolId: auth.schoolId,
              termId,
              sessionId: auth.sessionId,
              authSessionId: auth.auth?.bearerToken,
              domain: auth.domain,
            },
          },
          {
            departmentId,
            sessionTermId: termId,
          },
        ),
      ),
    ),
			prisma.schoolProfile.findFirst({
				where: {
					id: auth.schoolId,
					deletedAt: null,
				},
				select: {
					studentNameFormat: true,
				},
			}),
  ]);

  const reportsById = buildStudentReportsById({
    departmentSheets,
    classrooms,
  });

  const selectedReports = parsed.data.termFormIds
    .map((id) => reportsById[id])
    .filter(Boolean);

  if (!selectedReports.length) {
		return NextResponse.json(
			{ error: "No printable reports found." },
			{ status: 404 },
		);
  }

  const termLabel = [sessionTerm?.title, sessionTerm?.session?.title]
    .filter(Boolean)
    .join(" • ");
  const safeTitle = `student-report-${termLabel || "term"}`
    .replace(/[^a-z0-9-_]+/gi, "-")
    .toLowerCase();
  const resultTemplatePreference = await (
    prisma as any
  ).schoolDocumentTemplatePreference.findFirst({
    where: {
      deletedAt: null,
      documentType: "RESULT_SHEET",
      schoolProfileId: auth.schoolId,
    },
    select: {
      source: true,
      templateId: true,
    },
  });
  const preferredTemplateId =
    parsed.data.templateId ??
    resultTemplatePreference?.templateId ??
    configs.resultTemplates.preferredTemplateId;
  const resultPayload = {
    schoolName: configs.schoolName,
    schoolAddress: configs.schoolAddress,
    termLabel,
    returnDate: "28/03/26",
    commentLabelArabic: configs.comment,
    teacherSignatureLabel: configs.teacherSignature,
    directorSignatureLabel: configs.directorSignature,
    reports: selectedReports.map((report) => ({
			studentName: getStudentName(
				report.student,
				schoolSettings?.studentNameFormat,
			),
      classroomName: report.departmentName,
      percentage: report.grade.percentage,
      position: report.grade.position,
      totalStudents: report.grade.totalStudents,
      commentArabic: report.comment?.arabic,
      commentEnglish: report.comment?.english,
      tables: report.tables,
    })),
  };
  const customTemplateRequest =
    preferredTemplateId &&
    (parsed.data.templateId || resultTemplatePreference?.source === "custom")
      ? await (prisma as any).customDocumentTemplateRequest.findFirst({
          where: {
            builtTemplateId: preferredTemplateId,
            deletedAt: null,
            documentType: "RESULT_SHEET",
            schoolProfileId: auth.schoolId,
            status: "READY",
          },
          select: {
            builtTemplateJson: true,
          },
        })
      : null;
  const customTemplateResult = customTemplateRequest?.builtTemplateJson
		? jsonDocumentTemplateSchema.safeParse(
				customTemplateRequest.builtTemplateJson,
			)
    : null;

  if (customTemplateResult && !customTemplateResult.success) {
    return NextResponse.json(
      { error: "Selected custom result template JSON is invalid." },
      { status: 500 },
    );
  }

  const customTemplate = customTemplateResult?.data ?? null;
  const strm =
    customTemplate?.documentType === "RESULT_SHEET"
      ? renderJsonDocumentTemplateToPdf(customTemplate, resultPayload)
      : renderSchoolDocumentTemplate({
          documentType: "RESULT_SHEET",
          preferredTemplateId,
          schoolSystem: configs.resultTemplates.schoolSystem,
          payload: resultPayload,
        });

  try {
    const stream = await renderToStream(strm);
    if (!stream) {
      return NextResponse.json(
        { error: "Failed to render PDF stream" },
				{ status: 500 },
      );
    }

    const blob = await new Response(stream as unknown as BodyInit).blob();

    const headers: Record<string, string> = {
      "Content-Type": "application/pdf",
      "Cache-Control": "no-store, max-age=0",
    };

    if (parsed.data.download) {
			headers["Content-Disposition"] =
				`attachment; filename="${safeTitle}.pdf"`;
    } else {
      headers["Content-Disposition"] = `inline; filename="${safeTitle}.pdf"`;
    }

    return new Response(blob, { headers });
  } catch (error) {
    return NextResponse.json(
      {
        error:
					error instanceof Error
						? error.message
						: "Unable to generate result PDF.",
      },
			{ status: 500 },
    );
  }
}
