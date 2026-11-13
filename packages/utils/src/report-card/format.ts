import type { ReportCardCommentBand, ReportCardConfig } from "./config";

const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function formatReportNumerals(
	value: string | number | null | undefined,
	numerals: ReportCardConfig["layout"]["numerals"],
) {
	if (value === null || value === undefined) return "";
	const text = String(value);
	if (numerals === "western") return text;
	return text
		.replace(/(\d)\.(\d)/g, "$1٫$2")
		.replace(/\d/g, (digit) => ARABIC_INDIC_DIGITS.charAt(Number(digit)));
}

const ORDINAL_WORDS: Record<string, number> = {
	first: 1,
	second: 2,
	third: 3,
	fourth: 4,
	fifth: 5,
	sixth: 6,
	"الأولى": 1,
	"الاولى": 1,
	"الثانية": 2,
	"الثالثة": 3,
	"الرابعة": 4,
};

/** Reads the term's position (1st, Second, 3) from its title. */
export function termNumberFromTitle(title: string | null | undefined) {
	if (!title) return null;
	const digit = title.match(/(\d+)/);
	if (digit) return Number(digit[1]);
	const lower = title.toLocaleLowerCase();
	for (const [word, number] of Object.entries(ORDINAL_WORDS)) {
		if (lower.includes(word)) return number;
	}
	return null;
}

export function formatReportTermLabel(
	termTitle: string | null | undefined,
	header: ReportCardConfig["header"],
) {
	if (!termTitle) return "";
	if (header.termLabelMode === "ordinal") {
		const number = termNumberFromTitle(termTitle);
		const ordinal = number ? header.termOrdinals[number - 1] : undefined;
		if (ordinal) return ordinal;
	}
	return termTitle;
}

export function formatReportAcademicYear(
	sessionTitle: string | null | undefined,
	config: ReportCardConfig,
) {
	if (!sessionTitle) return "";
	const value = `${sessionTitle}${config.header.academicYearSuffix ?? ""}`;
	return formatReportNumerals(value, config.layout.numerals);
}

const MONTHS_EN = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];
const MONTHS_AR = [
	"يناير",
	"فبراير",
	"مارس",
	"أبريل",
	"مايو",
	"يونيو",
	"يوليو",
	"أغسطس",
	"سبتمبر",
	"أكتوبر",
	"نوفمبر",
	"ديسمبر",
];

const pad = (value: number) => String(value).padStart(2, "0");

/** Formats a calendar date (stored as midnight UTC or local) without timezone drift. */
export function formatReportDate(
	value: Date | string | null | undefined,
	config: ReportCardConfig,
) {
	if (!value) return "";
	const raw = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(raw.getTime())) return "";
	// Dates are picked as calendar days. Older rows hold local midnight (for
	// example 23:00 UTC the day before in Lagos), so read the nearest UTC day.
	const date = new Date(raw.getTime() + 12 * 60 * 60 * 1000);
	const day = date.getUTCDate();
	const month = date.getUTCMonth();
	const year = date.getUTCFullYear();
	let text: string;
	switch (config.header.dateFormat) {
		case "dd/MM/yyyy":
			text = `${pad(day)}/${pad(month + 1)}/${year}`;
			break;
		case "d MMMM yyyy":
			text = `${day} ${(config.layout.numerals === "arabic-indic" ? MONTHS_AR : MONTHS_EN)[month]} ${year}`;
			break;
		default:
			text = `${pad(day)}/${pad(month + 1)}/${String(year).slice(-2)}`;
	}
	return formatReportNumerals(text, config.layout.numerals);
}

export function formatReportPosition(
	position: number | null | undefined,
	totalStudents: number | null | undefined,
	config: ReportCardConfig,
) {
	if (!position) return "";
	const total = totalStudents ?? 0;
	// Arabic counts 3–10 take the plural; 11 and above take the singular.
	const students =
		total >= 3 && total <= 10
			? config.labels.studentsFew
			: config.labels.studentsMany;
	const template = config.labels.positionTemplate || "{position}/{total}";
	return template
		.replace("{position}", formatReportNumerals(position, config.layout.numerals))
		.replace("{total}", formatReportNumerals(total, config.layout.numerals))
		.replace("{students}", students)
		.replace(/\s+/g, " ")
		.trim();
}

export function resolveReportComment(
	percentage: number | null | undefined,
	bands: ReportCardCommentBand[],
) {
	if (percentage === null || percentage === undefined) return null;
	if (Number.isNaN(percentage)) return null;
	// Bands are whole-number ranges (80–89), so 89.6 belongs to the 80 band.
	const score = Math.floor(percentage);
	return (
		bands.find((band) => score >= band.min && score <= band.max) ?? null
	);
}

/** Finds overlapping or missing ranges between 0 and 100. */
export function findCommentBandIssues(bands: ReportCardCommentBand[]) {
	const issues: string[] = [];
	for (const band of bands) {
		if (band.min > band.max) {
			issues.push(`${band.min}–${band.max} starts after it ends.`);
		}
	}
	const sorted = [...bands].sort((a, b) => a.min - b.min);
	let expected = 0;
	for (const band of sorted) {
		if (band.min > expected) {
			issues.push(`No comment covers ${expected}–${band.min - 1}.`);
		}
		if (band.min < expected) {
			issues.push(`${band.min}–${band.max} overlaps another range.`);
		}
		expected = Math.max(expected, band.max + 1);
	}
	if (sorted.length && expected <= 100) {
		issues.push(`No comment covers ${expected}–100.`);
	}
	return issues;
}
