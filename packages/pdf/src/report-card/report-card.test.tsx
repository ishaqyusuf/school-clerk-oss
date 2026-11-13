import { describe, expect, it } from "bun:test";
import {
	ENGLISH_REPORT_CARD_LABELS,
	type ReportCardTemplateId,
	createDefaultReportCardConfig,
} from "@school-clerk/utils/report-card";
import { shapeArabicForPdf, toPdfParagraph } from "./arabic-shaping";
import { SAMPLE_REPORTS, SAMPLE_TERM } from "./sample-data";
import { renderReportCardsToBuffer } from "./templates/pdf";
import type { ReportCardData, ReportCardRenderProps } from "./types";

const codes = (value: string) =>
	Array.from(value).map((char) => char.codePointAt(0)?.toString(16));

describe("shapeArabicForPdf", () => {
	it("joins letters into their positional forms", () => {
		// م initial, ح medial, م medial, د final
		expect(codes(shapeArabicForPdf("محمد"))).toEqual([
			"fee3",
			"fea4",
			"fee4",
			"feaa",
		]);
	});

	it("uses lam-alef ligatures and keeps marks", () => {
		expect(codes(shapeArabicForPdf("لا"))).toEqual(["fefb"]);
		expect(codes(shapeArabicForPdf("بلال"))).toEqual(["fe91", "fefc", "fedd"]);
		expect(shapeArabicForPdf("جدًا")).toContain("ً");
	});

	it("joins across kashida and leaves other text alone", () => {
		expect(codes(shapeArabicForPdf("مـد"))).toEqual(["fee3", "640", "feaa"]);
		expect(shapeArabicForPdf("Ahmad 12")).toBe("Ahmad 12");
	});
});

describe("toPdfParagraph", () => {
	it("moves edge punctuation across in right-to-left paragraphs", () => {
		expect(toPdfParagraph("الفصل:", "rtl")).toBe(
			`:${shapeArabicForPdf("الفصل")}`,
		);
		expect(toPdfParagraph("٨٤٫٥%", "rtl")).toBe("%٨٤٫٥");
		expect(toPdfParagraph("(١٠٠)", "rtl")).toBe("(١٠٠)");
	});

	it("leaves left-to-right and Latin text as written", () => {
		expect(toPdfParagraph("Comment:", "rtl")).toBe("Comment:");
		expect(toPdfParagraph("الفصل:", "ltr")).toBe(
			`${shapeArabicForPdf("الفصل")}:`,
		);
	});
});

// Leaves room for the one retry the renderer makes if Bun drops a render.
const RENDER_TIMEOUT = 40_000;

const pageCount = (buffer: Buffer) =>
	(buffer.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length;

const oversized: ReportCardData = {
	...SAMPLE_REPORTS.long,
	id: "oversized",
	tables: [
		{
			columns: SAMPLE_REPORTS.long.tables[0]?.columns ?? [],
			rows: Array.from({ length: 30 }, (_, index) => ({
				columns: [
					{ value: `${index + 1}. مادة دراسية طويلة الاسم رقم ${index + 1}` },
					{ value: 9 },
					{ value: 25 },
					{ value: 50 },
					{ value: 84 },
				],
			})),
		},
	],
};

const english = createDefaultReportCardConfig({
	schoolName: "Al Ghurobaa Academy",
});
english.layout.direction = "ltr";
english.layout.numerals = "western";
english.labels = { ...ENGLISH_REPORT_CARD_LABELS };
english.comments.mode = "blank";
english.comments.blankLines = 3;

describe("PdfReportCardDocument", () => {
	const config = createDefaultReportCardConfig({
		schoolName: "مدرسة دار الحديث",
	});
	config.school.address = "Sannushehu Street, Ilorin, Kwara State, Nigeria.";
	const templates: ReportCardTemplateId[] = [
		"bilingual-classic",
		"framed-ledger",
	];
	const reports: [string, ReportCardData, typeof config][] = [
		["short", SAMPLE_REPORTS.short, config],
		["long", SAMPLE_REPORTS.long, config],
		["oversized", oversized, config],
		["english", SAMPLE_REPORTS.long, english],
	];

	for (const templateId of templates) {
		for (const [name, report, reportConfig] of reports) {
			it(
				`keeps the ${name} ${templateId} report on one A4 page`,
				async () => {
					const page: ReportCardRenderProps = {
						templateId,
						config: reportConfig,
						report,
						term: SAMPLE_TERM,
					};
					const buffer = await renderReportCardsToBuffer([page]);
					expect(pageCount(buffer)).toBe(1);
					expect(buffer.toString("latin1")).toContain("/MediaBox [0 0 595.28");
				},
				RENDER_TIMEOUT,
			);
		}
	}

	it(
		"prints one page per student",
		async () => {
			const page = (report: ReportCardData): ReportCardRenderProps => ({
				templateId: "bilingual-classic",
				config,
				report,
				term: SAMPLE_TERM,
			});
			const buffer = await renderReportCardsToBuffer([
				page(SAMPLE_REPORTS.short),
				page(SAMPLE_REPORTS.long),
				page(oversized),
			]);
			expect(pageCount(buffer)).toBe(3);
		},
		RENDER_TIMEOUT,
	);
});
