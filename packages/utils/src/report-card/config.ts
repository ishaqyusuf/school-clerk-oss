import { z } from "zod";

export const REPORT_CARD_DOCUMENT_TYPE = "REPORT_CARD";

export const reportCardTemplateIds = [
	"bilingual-classic",
	"framed-ledger",
] as const;
export type ReportCardTemplateId = (typeof reportCardTemplateIds)[number];
export const DEFAULT_REPORT_CARD_TEMPLATE_ID: ReportCardTemplateId =
	"bilingual-classic";

export const reportCardTemplateCatalog: {
	id: ReportCardTemplateId;
	label: string;
	description: string;
}[] = [
	{
		id: "bilingual-classic",
		label: "Bilingual classic",
		description:
			"Centred school name, double rule, dotted fill-in lines and a two-language comment block. Built from the Darul Hadith report sheet.",
	},
	{
		id: "framed-ledger",
		label: "Framed ledger",
		description:
			"A bordered page with a boxed student panel and a summary strip. Suits schools that want a more formal sheet.",
	},
];

const text = (max: number) => z.string().trim().max(max);
const optionalImageUrl = z
	.string()
	.trim()
	.max(500_000)
	.refine(
		(value) =>
			!value ||
			value.startsWith("https://") ||
			value.startsWith("http://") ||
			value.startsWith("/") ||
			value.startsWith("data:image/"),
		"Use an uploaded image or an http(s) link.",
	)
	.nullable()
	.default(null);

export const reportCardCommentBandSchema = z.object({
	min: z.number().min(0).max(100),
	max: z.number().min(0).max(100),
	primary: text(240),
	secondary: text(240),
});
export type ReportCardCommentBand = z.infer<typeof reportCardCommentBandSchema>;

export const reportCardConfigSchema = z.object({
	school: z.object({
		name: text(200),
		address: text(300),
		addressStyle: z.enum(["script", "plain"]).default("script"),
	}),
	layout: z.object({
		/** Pick margin and text size from the length of each report. */
		autoSize: z.boolean().default(true),
		direction: z.enum(["rtl", "ltr"]).default("rtl"),
		numerals: z.enum(["arabic-indic", "western"]).default("arabic-indic"),
		pageMarginMm: z.number().min(4).max(25).default(10),
		fitToPage: z.boolean().default(true),
		fontScale: z.number().min(0.7).max(1.25).default(1),
	}),
	header: z.object({
		showAcademicYear: z.boolean().default(true),
		academicYearSuffix: text(12).default(""),
		showTerm: z.boolean().default(true),
		termLabelMode: z.enum(["title", "ordinal"]).default("title"),
		termOrdinals: z.array(text(40)).max(6).default([]),
		showPercentage: z.boolean().default(true),
		showTotalScore: z.boolean().default(false),
		showPosition: z.boolean().default(true),
		showResumptionDate: z.boolean().default(true),
		dateFormat: z
			.enum(["dd/MM/yy", "dd/MM/yyyy", "d MMMM yyyy"])
			.default("dd/MM/yy"),
	}),
	labels: z.object({
		studentName: text(80),
		academicYear: text(80),
		classroom: text(80),
		term: text(80),
		percentage: text(80),
		totalScore: text(80),
		position: text(80),
		positionTemplate: text(120),
		studentsFew: text(40),
		studentsMany: text(40),
		resumptionDate: text(80),
		subjects: text(80),
		total: text(80),
		commentPrimary: text(80),
		commentSecondary: text(80),
		headSignature: text(80),
		teacherSignature: text(80),
	}),
	table: z.object({
		numberSubjects: z.boolean().default(true),
		emptyCell: text(4).default("-"),
	}),
	comments: z.object({
		enabled: z.boolean().default(true),
		mode: z.enum(["auto", "blank"]).default("auto"),
		showPrimary: z.boolean().default(true),
		showSecondary: z.boolean().default(true),
		secondaryDirection: z.enum(["rtl", "ltr"]).default("ltr"),
		blankLines: z.number().int().min(1).max(4).default(1),
		bands: z.array(reportCardCommentBandSchema).max(12),
	}),
	signatures: z.object({
		showHead: z.boolean().default(true),
		headImageUrl: optionalImageUrl,
		showTeacher: z.boolean().default(true),
		useClassTeacherSignature: z.boolean().default(true),
	}),
	calligraphy: z.object({
		mode: z.enum(["off", "dictionary", "auto"]).default("dictionary"),
		kashidaLength: z.number().int().min(1).max(14).default(10),
		useDefaultDictionary: z.boolean().default(true),
		dictionary: z.record(z.string(), z.string()).default({}),
	}),
});

export type ReportCardConfig = z.infer<typeof reportCardConfigSchema>;

export const DEFAULT_REPORT_CARD_COMMENT_BANDS: ReportCardCommentBand[] = [
	{
		min: 90,
		max: 100,
		primary: "ممتاز! أداء رائع واستثنائي.",
		secondary: "Excellent! Outstanding and exceptional performance.",
	},
	{
		min: 80,
		max: 89,
		primary: "جيد جدًا! أداء قوي وجهد ملحوظ.",
		secondary: "Very good! Strong performance and great effort.",
	},
	{
		min: 70,
		max: 79,
		primary: "جيد! عمل جيد ولكن هناك مجال للتحسين.",
		secondary: "Good! Well done, but there is room for improvement.",
	},
	{
		min: 60,
		max: 69,
		primary: "مقبول! تحتاج إلى بذل المزيد من الجهد.",
		secondary: "Satisfactory! Needs more effort.",
	},
	{
		min: 50,
		max: 59,
		primary: "ضعيف! حاول تحسين أدائك في المستقبل.",
		secondary: "Weak! Try to improve your performance in the future.",
	},
	{
		min: 0,
		max: 49,
		primary: "راسب! بحاجة إلى العمل الجاد والمثابرة.",
		secondary: "Fail! Needs hard work and persistence.",
	},
];

export const ARABIC_REPORT_CARD_LABELS: ReportCardConfig["labels"] = {
	studentName: "اسم التلميذ/التلميذة",
	academicYear: "العام الدراسي",
	classroom: "الفصل",
	term: "الفترة",
	percentage: "النسبة المئوية",
	totalScore: "المجموع الكلي",
	position: "الدرجة",
	positionTemplate: "{position} من {total} {students}",
	studentsFew: "طلاب",
	studentsMany: "طالبا",
	resumptionDate: "تاريخ العودة",
	subjects: "المواد",
	total: "المجموع الكلي",
	commentPrimary: "الملاحظة",
	commentSecondary: "Comment",
	headSignature: "توقيع المدير",
	teacherSignature: "توقيع المدرس",
};

export const ENGLISH_REPORT_CARD_LABELS: ReportCardConfig["labels"] = {
	studentName: "Student name",
	academicYear: "Session",
	classroom: "Class",
	term: "Term",
	percentage: "Percentage",
	totalScore: "Total score",
	position: "Position",
	positionTemplate: "{position} of {total} {students}",
	studentsFew: "students",
	studentsMany: "students",
	resumptionDate: "Resumption date",
	subjects: "Subjects",
	total: "Total",
	commentPrimary: "Teacher's comment",
	commentSecondary: "Head's comment",
	headSignature: "Head teacher",
	teacherSignature: "Class teacher",
};

export const ARABIC_TERM_ORDINALS = ["الأولى", "الثانية", "الثالثة"];

export function createDefaultReportCardConfig(input?: {
	schoolName?: string | null;
}): ReportCardConfig {
	return {
		school: {
			name: input?.schoolName?.trim() || "",
			address: "",
			addressStyle: "script",
		},
		layout: {
			autoSize: true,
			direction: "rtl",
			numerals: "arabic-indic",
			pageMarginMm: 10,
			fitToPage: true,
			fontScale: 1,
		},
		header: {
			showAcademicYear: true,
			academicYearSuffix: "هـ",
			showTerm: true,
			termLabelMode: "ordinal",
			termOrdinals: [...ARABIC_TERM_ORDINALS],
			showPercentage: true,
			showTotalScore: false,
			showPosition: true,
			showResumptionDate: true,
			dateFormat: "dd/MM/yy",
		},
		labels: { ...ARABIC_REPORT_CARD_LABELS },
		table: { numberSubjects: true, emptyCell: "-" },
		comments: {
			enabled: true,
			mode: "auto",
			showPrimary: true,
			showSecondary: true,
			secondaryDirection: "ltr",
			blankLines: 1,
			bands: DEFAULT_REPORT_CARD_COMMENT_BANDS.map((band) => ({ ...band })),
		},
		signatures: {
			showHead: true,
			headImageUrl: null,
			showTeacher: true,
			useClassTeacherSignature: true,
		},
		calligraphy: {
			mode: "dictionary",
			kashidaLength: 10,
			useDefaultDictionary: true,
			dictionary: {},
		},
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === "object" && !Array.isArray(value);
}

function deepMerge<T>(base: T, override: unknown): T {
	if (!isRecord(base) || !isRecord(override)) {
		return (override === undefined ? base : override) as T;
	}
	const result: Record<string, unknown> = { ...base };
	for (const [key, value] of Object.entries(override)) {
		const current = (base as Record<string, unknown>)[key];
		result[key] =
			isRecord(current) && isRecord(value) && key !== "dictionary"
				? deepMerge(current, value)
				: value;
	}
	return result as T;
}

/**
 * Reads a stored config leniently: missing keys fall back to defaults and an
 * invalid stored value falls back to the defaults entirely, so printing never
 * breaks because of an older or partial saved config.
 */
export function resolveReportCardConfig(
	stored: unknown,
	fallback: { schoolName?: string | null } = {},
): ReportCardConfig {
	const defaults = createDefaultReportCardConfig(fallback);
	const merged = deepMerge(defaults, stored ?? {});
	const parsed = reportCardConfigSchema.safeParse(merged);
	const config = parsed.success ? parsed.data : defaults;
	if (!config.school.name && fallback.schoolName) {
		config.school.name = fallback.schoolName;
	}
	return config;
}

export function isReportCardTemplateId(
	value: unknown,
): value is ReportCardTemplateId {
	return reportCardTemplateIds.includes(value as ReportCardTemplateId);
}
