import { toReportCardRenderProps } from "@/features/report-card/report-card-data";
import { buildStudentReportsById } from "@/features/student-report/report-model";
import {
	dashboardAccessErrorResponse,
	requireDashboardModules,
} from "@/lib/module-access";
import { getQueryClient, trpc } from "@/trpc/server";
import { prisma } from "@school-clerk/db";
import { renderReportCardsToBuffer } from "@school-clerk/pdf/report-card/pdf";
import { TRPCClientError } from "@trpc/client";
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
		)
		.pipe(z.array(z.string().min(1)).min(1).max(200)),
	termId: z.string().optional(),
	download: z.preprocess(
		(value) => value === "true",
		z.boolean().default(false),
	),
});

const unavailable = (error: unknown) => {
	const code = error instanceof TRPCClientError ? error.data?.code : undefined;
	if (typeof code !== "string") return null;
	const status =
		code === "UNAUTHORIZED"
			? 401
			: code === "FORBIDDEN"
				? 403
				: code === "NOT_FOUND"
					? 404
					: null;
	return status
		? NextResponse.json(
				{ error: "The requested reports are unavailable." },
				{ status },
			)
		: null;
};

/** Renders the selected students' report cards with the school's report card template. */
export async function GET(req: NextRequest) {
	const requestUrl = new URL(req.url);
	const parsed = paramsSchema.safeParse(
		Object.fromEntries(requestUrl.searchParams.entries()),
	);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid report card request." },
			{ status: 400 },
		);
	}

	const context = await requireDashboardModules(
		["RESULTS_AND_REPORTS"],
		["Admin", "Registrar", "Teacher"],
	).catch(dashboardAccessErrorResponse);
	if (context instanceof Response) return context;
	const auth = context.profile;
	const termId = parsed.data.termId ?? auth.termId;
	if (!auth.schoolId || !termId) {
		return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
	}

	const termForms = await prisma.studentTermForm.findMany({
		where: {
			id: { in: parsed.data.termFormIds },
			sessionTermId: termId,
			schoolProfileId: auth.schoolId,
			student: { schoolProfileId: auth.schoolId, deletedAt: null },
			deletedAt: null,
		},
		select: { id: true, classroomDepartmentId: true },
	});
	if (termForms.length !== parsed.data.termFormIds.length) {
		return NextResponse.json({ error: "No reports found." }, { status: 404 });
	}
	const departmentIds = Array.from(
		new Set(
			termForms.map((item) => item.classroomDepartmentId).filter(Boolean),
		),
	) as string[];

	const loaded = await Promise.all([
		prisma.classRoomDepartment.findMany({
			where: {
				id: { in: departmentIds },
				schoolProfileId: auth.schoolId,
				deletedAt: null,
			},
			select: {
				id: true,
				departmentName: true,
				classRoom: { select: { name: true } },
			},
		}),
		Promise.all(
			departmentIds.map((departmentId) =>
				getQueryClient().fetchQuery(
					trpc.assessments.getClassroomReportSheet.queryOptions({
						departmentId,
						sessionTermId: termId,
					}),
				),
			),
		),
		getQueryClient().fetchQuery(
			trpc.reportCards.getPrintContext.queryOptions({ termId, departmentIds }),
		),
		prisma.schoolProfile.findFirst({
			where: { id: auth.schoolId, deletedAt: null },
			select: { studentNameFormat: true },
		}),
	]).catch((error: unknown) => {
		const response = unavailable(error);
		if (response) return response;
		throw error;
	});
	if (loaded instanceof Response) return loaded;
	const [classrooms, departmentSheets, printContext, school] = loaded;

	const reportsById = buildStudentReportsById({ departmentSheets, classrooms });
	const records = parsed.data.termFormIds
		.map((id) => reportsById[id])
		.filter(Boolean);
	if (records.length !== parsed.data.termFormIds.length) {
		return NextResponse.json(
			{ error: "No printable reports found." },
			{ status: 404 },
		);
	}

	const pages = records.map((record) =>
		toReportCardRenderProps(
			// biome-ignore lint/style/noNonNullAssertion: filtered above.
			record!,
			printContext,
			school?.studentNameFormat,
		),
	);
	const termLabel = [printContext.term?.title, printContext.term?.sessionTitle]
		.filter(Boolean)
		.join(" ");
	const fileName = `report-cards-${termLabel || "term"}`
		.replace(/[^a-z0-9-_]+/gi, "-")
		.toLowerCase();

	try {
		const buffer = await renderReportCardsToBuffer(pages, {
			title: `Report cards ${termLabel}`.trim(),
			fontBaseUrl: new URL("/fonts/", requestUrl.origin),
		});
		return new Response(new Uint8Array(buffer), {
			headers: {
				"Content-Type": "application/pdf",
				"Cache-Control": "no-store, max-age=0",
				"Content-Disposition": `${parsed.data.download ? "attachment" : "inline"}; filename="${fileName}.pdf"`,
			},
		});
	} catch (error) {
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Unable to generate report cards.",
			},
			{ status: 500 },
		);
	}
}
