import { describe, expect, it } from "bun:test";
import {
	DEFAULT_REPORT_CARD_COMMENT_BANDS,
	applyNameCalligraphy,
	computeReportFit,
	createDefaultReportCardConfig,
	findCommentBandIssues,
	formatReportDate,
	formatReportNumerals,
	formatReportPosition,
	formatReportTermLabel,
	parseCalligraphyDictionary,
	resolveReportCardConfig,
	resolveReportComment,
	stretchArabicWord,
	termNumberFromTitle,
} from "./index";

const strip = (value: string) => value.replace(/ـ+/g, "|");

describe("stretchArabicWord", () => {
	it("stretches the last joinable gap", () => {
		expect(strip(stretchArabicWord("محمد", 3))).toBe("محم|د");
		expect(strip(stretchArabicWord("خديجة", 3))).toBe("خديج|ة");
		expect(strip(stretchArabicWord("حواء", 3))).toBe("ح|واء");
		expect(strip(stretchArabicWord("الحاج", 3))).toBe("الح|اج");
	});

	it("keeps lam-alef ligatures whole", () => {
		expect(strip(stretchArabicWord("بلال", 3))).toBe("ب|لال");
	});

	it("keeps diacritics attached to their letter", () => {
		expect(strip(stretchArabicWord("رقيّة", 3))).toBe("رقيّ|ة");
	});

	it("leaves non-Arabic, unjoinable and already stretched words alone", () => {
		expect(stretchArabicWord("Ahmad", 3)).toBe("Ahmad");
		expect(stretchArabicWord("داود", 3)).toBe("داود");
		expect(stretchArabicWord("محمــد", 3)).toBe("محمــد");
	});

	it("uses the requested length", () => {
		expect(stretchArabicWord("زيد", 4)).toBe("زيــــد");
	});
});

describe("applyNameCalligraphy", () => {
	it("prefers school overrides, then the built-in dictionary", () => {
		const options = {
			mode: "dictionary" as const,
			kashidaLength: 4,
			dictionary: { محمد: "مـحمد" },
		};
		expect(applyNameCalligraphy("محمد بلال", options)).toBe("مـحمد بــــــــــلال");
	});

	it("only auto-stretches unknown words in auto mode", () => {
		expect(
			applyNameCalligraphy("كمال", { mode: "dictionary", kashidaLength: 2 }),
		).toBe("كمال");
		expect(
			applyNameCalligraphy("كمال", { mode: "auto", kashidaLength: 2 }),
		).toBe("كمــال");
	});

	it("respects opt-out entries and off mode", () => {
		expect(applyNameCalligraphy("عبد", { mode: "auto", kashidaLength: 2 })).toBe("عبد");
		expect(applyNameCalligraphy("محمد", { mode: "off", kashidaLength: 2 })).toBe("محمد");
	});

	it("parses editor dictionary lines", () => {
		expect(parseCalligraphyDictionary("أحمد = أحمــد\n\nbad line\nزيد=زيــد")).toEqual({
			أحمد: "أحمــد",
			زيد: "زيــد",
		});
	});
});

describe("report formatting", () => {
	const config = createDefaultReportCardConfig({ schoolName: "Test" });

	it("converts numerals", () => {
		expect(formatReportNumerals("12.5", "arabic-indic")).toBe("١٢٫٥");
		expect(formatReportNumerals(7, "western")).toBe("7");
	});

	it("maps term titles to ordinals", () => {
		expect(termNumberFromTitle("2nd Term")).toBe(2);
		expect(termNumberFromTitle("Third term")).toBe(3);
		expect(formatReportTermLabel("3rd term", config.header)).toBe("الثالثة");
		expect(
			formatReportTermLabel("3rd term", { ...config.header, termLabelMode: "title" }),
		).toBe("3rd term");
	});

	it("formats calendar dates without timezone drift", () => {
		expect(formatReportDate("2026-03-28T00:00:00.000Z", config)).toBe("٢٨/٠٣/٢٦");
		// Local midnight in Lagos, stored as 23:00 UTC the previous day.
		expect(formatReportDate("2026-03-27T23:00:00.000Z", config)).toBe("٢٨/٠٣/٢٦");
		expect(
			formatReportDate("2026-03-28T00:00:00.000Z", {
				...config,
				layout: { ...config.layout, numerals: "western" },
				header: { ...config.header, dateFormat: "d MMMM yyyy" },
			}),
		).toBe("28 March 2026");
	});

	it("uses Arabic count agreement for class size", () => {
		expect(formatReportPosition(2, 8, config)).toBe("٢ من ٨ طلاب");
		expect(formatReportPosition(2, 25, config)).toBe("٢ من ٢٥ طالبا");
	});
});

describe("comments", () => {
	it("finds the band for a percentage", () => {
		expect(resolveReportComment(95, DEFAULT_REPORT_CARD_COMMENT_BANDS)?.min).toBe(90);
		expect(resolveReportComment(89.6, DEFAULT_REPORT_CARD_COMMENT_BANDS)?.min).toBe(80);
		expect(resolveReportComment(0, DEFAULT_REPORT_CARD_COMMENT_BANDS)?.min).toBe(0);
	});

	it("reports gaps and overlaps", () => {
		expect(findCommentBandIssues(DEFAULT_REPORT_CARD_COMMENT_BANDS)).toEqual([]);
		expect(
			findCommentBandIssues([
				{ min: 0, max: 49, primary: "", secondary: "" },
				{ min: 45, max: 89, primary: "", secondary: "" },
			]),
		).toEqual(["45–89 overlaps another range.", "No comment covers 90–100."]);
	});
});

describe("resolveReportCardConfig", () => {
	it("fills missing keys and falls back on invalid configs", () => {
		const config = resolveReportCardConfig(
			{ layout: { direction: "ltr" } },
			{ schoolName: "Al Ghurobaa" },
		);
		expect(config.layout.direction).toBe("ltr");
		expect(config.layout.numerals).toBe("arabic-indic");
		expect(config.school.name).toBe("Al Ghurobaa");
		expect(resolveReportCardConfig({ layout: { pageMarginMm: 999 } }).layout.pageMarginMm).toBe(10);
	});
});

describe("computeReportFit", () => {
	it("spreads free space across rows and gaps for short reports", () => {
		const fit = computeReportFit({
			pageHeight: 1000,
			contentHeight: 700,
			rows: 5,
			gaps: 4,
			basePad: 6,
		});
		expect(fit.scale).toBe(1);
		expect(fit.rowPad).toBe(26);
		expect(fit.gap).toBe(25);
		expect(fit.slack).toBe(0);
	});

	it("caps growth so tiny reports do not get absurd rows", () => {
		const fit = computeReportFit({
			pageHeight: 1000,
			contentHeight: 300,
			rows: 2,
			gaps: 4,
			basePad: 6,
		});
		expect(fit.rowPad).toBe(30);
		expect(fit.gap).toBe(40);
		expect(fit.slack).toBeGreaterThan(0);
	});

	it("tightens rows, then scales, when content overflows", () => {
		const tight = computeReportFit({
			pageHeight: 1000,
			contentHeight: 1040,
			rows: 20,
			gaps: 4,
			basePad: 6,
		});
		expect(tight).toEqual({ rowPad: 5, gap: 0, scale: 1, slack: 0 });

		const scaled = computeReportFit({
			pageHeight: 1000,
			contentHeight: 1300,
			rows: 20,
			gaps: 4,
			basePad: 6,
		});
		expect(scaled.rowPad).toBe(2);
		expect(scaled.scale).toBeCloseTo(1000 / 1140, 2);
	});
});
