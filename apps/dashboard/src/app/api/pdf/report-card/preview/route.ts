import {
	dashboardAccessErrorResponse,
	requireDashboardModules,
} from "@/lib/module-access";
import { prisma } from "@school-clerk/db";
import { SAMPLE_REPORTS, SAMPLE_TERM } from "@school-clerk/pdf/report-card";
import { renderReportCardsToBuffer } from "@school-clerk/pdf/report-card/pdf";
import {
	isReportCardTemplateId,
	resolveReportCardConfig,
} from "@school-clerk/utils/report-card";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
	templateId: z.string(),
	config: z.unknown(),
	sample: z.enum(["short", "long"]).default("short"),
});

/** Renders the editor's unsaved template against sample data, as the real PDF. */
export async function POST(req: NextRequest) {
	const context = await requireDashboardModules(
		["RESULTS_AND_REPORTS"],
		["Admin"],
	).catch(dashboardAccessErrorResponse);
	if (context instanceof Response) return context;

	const parsed = bodySchema.safeParse(await req.json().catch(() => null));
	if (!parsed.success || !isReportCardTemplateId(parsed.data.templateId)) {
		return NextResponse.json(
			{ error: "Invalid preview request." },
			{ status: 400 },
		);
	}
	const school = context.profile.schoolId
		? await prisma.schoolProfile.findFirst({
				where: { id: context.profile.schoolId, deletedAt: null },
				select: { name: true },
			})
		: null;
	const config = resolveReportCardConfig(parsed.data.config, {
		schoolName: school?.name,
	});

	try {
		const buffer = await renderReportCardsToBuffer(
			[
				{
					templateId: parsed.data.templateId,
					config,
					report: SAMPLE_REPORTS[parsed.data.sample],
					term: SAMPLE_TERM,
				},
			],
			{
				title: "Report card preview",
				fontBaseUrl: new URL("/fonts/", new URL(req.url).origin),
			},
		);
		return new Response(new Uint8Array(buffer), {
			headers: {
				"Content-Type": "application/pdf",
				"Cache-Control": "no-store, max-age=0",
				"Content-Disposition": 'inline; filename="report-card-preview.pdf"',
			},
		});
	} catch (error) {
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Unable to render the preview.",
			},
			{ status: 500 },
		);
	}
}
