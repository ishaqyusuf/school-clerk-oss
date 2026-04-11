import { renderToBuffer } from "@school-clerk/pdf";
import { ResultTemplate } from "@school-clerk/pdf/result-template";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
	previewResultTemplateConfig,
	previewResultTemplateReports,
} from "@/features/result-pdf/preview-data";

const paramsSchema = z.object({
	template: z.enum(["template-1"]).default("template-1"),
	download: z.preprocess((val) => val === "true", z.boolean().default(false)),
});

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

	const safeTitle = `student-result-${parsed.data.template}`;
	const document = ResultTemplate({
		config: previewResultTemplateConfig,
		reports: previewResultTemplateReports,
		template: parsed.data.template,
		title: safeTitle,
	});

	try {
		const buffer = await renderToBuffer(document);
		if (!buffer) {
			return NextResponse.json(
				{ error: "Failed to render PDF stream" },
				{ status: 500 },
			);
		}

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

		return new Response(buffer, { headers });
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
