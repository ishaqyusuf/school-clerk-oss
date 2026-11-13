import {
	type ReportCardConfig,
	applyNameCalligraphy,
	formatReportAcademicYear,
	formatReportDate,
	formatReportNumerals,
	formatReportPosition,
	formatReportTermLabel,
	reportDensity,
	resolveReportComment,
} from "@school-clerk/utils/report-card";
import type { ReportCardRenderProps, ReportCardTable } from "./types";

/**
 * Text sizes per density tier, in multiples of the page's base font size. Both
 * renderers use the same tiers so the HTML preview matches the PDF.
 */
export const REPORT_CARD_DENSITY_SIZES = {
	spacious: { cell: 1.5, school: 1.9, address: 1.45, info: 1.25 },
	relaxed: { cell: 1.45, school: 1.85, address: 1.3, info: 1.25 },
	regular: { cell: 1.25, school: 1.55, address: 1.2, info: 1.2 },
	dense: { cell: 1.1, school: 1.45, address: 1.05, info: 1.1 },
} as const;

export type ReportCardSizes =
	(typeof REPORT_CARD_DENSITY_SIZES)[keyof typeof REPORT_CARD_DENSITY_SIZES];

/** Base page font size in CSS px at 100% (the PDF uses the same size in pt × 0.75). */
export const REPORT_CARD_BASE_FONT_PX = 16;
/** Vertical padding of a subject cell before the page is fitted, in px. */
export const REPORT_BASE_ROW_PAD = 6;
/** Spacing between page sections before any extra space is added, in px. */
export const REPORT_BASE_GAP = 12;

/** Header rows plus subject rows across every table. */
export function reportCardLineCount(tables: ReportCardTable[]) {
	return tables.reduce((total, table) => total + 1 + table.rows.length, 0);
}

export function reportCardRowCount(tables: ReportCardTable[]) {
	return tables.reduce((total, table) => total + table.rows.length, 0);
}

export function reportCardSizes(tables: ReportCardTable[]) {
	return REPORT_CARD_DENSITY_SIZES[reportDensity(reportCardLineCount(tables))];
}

export function reportCardSections(config: ReportCardConfig) {
	const hasComments =
		config.comments.enabled &&
		(config.comments.showPrimary || config.comments.showSecondary);
	const hasSignatures =
		config.signatures.showHead || config.signatures.showTeacher;
	return {
		hasComments,
		hasSignatures,
		/** Growable gaps: before the tables, the comments and the signatures. */
		gaps: 1 + (hasComments ? 1 : 0) + (hasSignatures ? 1 : 0),
	};
}

/** Every piece of text printed on one report card, already formatted. */
export function buildReportCardText({
	config,
	report,
	term,
}: ReportCardRenderProps) {
	const numerals = config.layout.numerals;
	const comment =
		config.comments.mode === "auto"
			? resolveReportComment(report.grade.percentage, config.comments.bands)
			: null;
	return {
		name: report.nameParts
			.filter(Boolean)
			.map((part) => applyNameCalligraphy(part, config.calligraphy)),
		academicYear: formatReportAcademicYear(term.sessionTitle, config),
		term: formatReportTermLabel(term.title, config.header),
		percentage: `${formatReportNumerals(report.grade.percentage, numerals)}%`,
		totalScore: `${formatReportNumerals(report.grade.obtained, numerals)}/${formatReportNumerals(report.grade.obtainable, numerals)}`,
		position: formatReportPosition(
			report.grade.position,
			report.grade.totalStudents,
			config,
		),
		resumption: formatReportDate(term.resumptionDate, config),
		comment,
	};
}

export type ReportCardText = ReturnType<typeof buildReportCardText>;

export type ReportCardInfoField = { key: string; label: string; value: string };

/** The short label/value pairs printed under the student's name. */
export function reportCardInfoFields(
	config: ReportCardConfig,
	text: ReportCardText,
	classroomName: string,
): ReportCardInfoField[] {
	const { header, labels } = config;
	return [
		{
			key: "classroom",
			label: labels.classroom,
			value: classroomName,
			show: true,
		},
		{
			key: "term",
			label: labels.term,
			value: text.term,
			show: header.showTerm,
		},
		{
			key: "percentage",
			label: labels.percentage,
			value: text.percentage,
			show: header.showPercentage,
		},
		{
			key: "total",
			label: labels.totalScore,
			value: text.totalScore,
			show: header.showTotalScore,
		},
		{
			key: "position",
			label: labels.position,
			value: text.position,
			show: header.showPosition && !!text.position,
		},
		{
			key: "resumption",
			label: labels.resumptionDate,
			value: text.resumption,
			show: header.showResumptionDate,
		},
	]
		.filter((field) => field.show)
		.map(({ show: _show, ...field }) => field);
}

/** Header label for a column: the school's wording for "Subjects" and "Total". */
export function reportCardColumnLabel(
	config: ReportCardConfig,
	table: ReportCardTable,
	columnIndex: number,
) {
	const column = table.columns[columnIndex];
	const lastColumn = table.columns.length - 1;
	if (columnIndex === 0) return config.labels.subjects || column?.label || "";
	if (columnIndex === lastColumn && lastColumn > 1) {
		return config.labels.total || column?.label || "";
	}
	return column?.label ?? "";
}

/** Subject cells arrive as "3. Title"; split the number from the title. */
export function splitSubjectCell(value: string | number | null | undefined) {
	const match =
		typeof value === "string" ? value.match(/^\s*(\d+)\.\s*(.*)$/) : null;
	return {
		number: match ? (match[1] as string) : null,
		title: match ? (match[2] as string) : String(value ?? ""),
	};
}

export function isEmptyScore(value: string | number | null | undefined) {
	return value === null || value === undefined || value === "" || value === 0;
}

/** A score cell's printed value. */
export function reportCardScoreText(
	config: ReportCardConfig,
	value: string | number | null | undefined,
) {
	return isEmptyScore(value)
		? config.table.emptyCell
		: formatReportNumerals(value ?? "", config.layout.numerals);
}

export type ReportCardCommentLine = {
	key: "primary" | "secondary";
	label: string;
	value?: string;
	dir: "rtl" | "ltr";
};

export function reportCardCommentLines(
	config: ReportCardConfig,
	text: ReportCardText,
): ReportCardCommentLine[] {
	const { comments, labels, layout } = config;
	if (!comments.enabled) return [];
	const lines: ReportCardCommentLine[] = [];
	if (comments.showPrimary) {
		lines.push({
			key: "primary",
			label: labels.commentPrimary,
			value: text.comment?.primary,
			dir: layout.direction,
		});
	}
	if (comments.showSecondary) {
		lines.push({
			key: "secondary",
			label: labels.commentSecondary,
			value: text.comment?.secondary,
			dir: comments.secondaryDirection,
		});
	}
	return lines;
}
