import { enToAr } from "@school-clerk/utils";
import type {
	ResultTemplateConfig,
	ResultTemplateReport,
	ResultTemplateStudent,
	ResultTemplateValue,
} from "./types";

export function getLineCount(report: ResultTemplateReport) {
	if (report.lineCount) {
		return report.lineCount;
	}

	return report.tables.reduce(
		(count, table) => count + 1 + table.rows.length,
		0,
	);
}

export function formatResultValue(value: ResultTemplateValue) {
	if (value === null || value === undefined || value === "") {
		return "-";
	}

	if (typeof value === "number") {
		return enToAr(value);
	}

	return enToAr(String(value));
}

export function formatStudentName(
	student: ResultTemplateStudent,
	calligraphs?: ResultTemplateConfig["calligraphs"],
) {
	return [student.name, student.surname, student.otherName]
		.filter(Boolean)
		.map((part) =>
			String(part)
				.split(" ")
				.filter(Boolean)
				.map((segment) => calligraphs?.[segment] || segment)
				.join(" "),
		);
}

export function getGradePositionText(report: ResultTemplateReport) {
	const position = report.grade?.position;
	const totalStudents = report.grade?.totalStudents;

	if (position == null || totalStudents == null) {
		return "-";
	}

	return `${enToAr(position)} من ${enToAr(totalStudents)} ${getStudentCountNoun(totalStudents)}`;
}

export function getDensity(lineCount: number) {
	if (lineCount > 8) {
		return {
			metaFontSize: 12,
			tableFontSize: 9,
			tableHeaderFontSize: 8,
			rowPaddingY: 4,
			sectionGap: 10,
		};
	}

	if (lineCount > 5) {
		return {
			metaFontSize: 13,
			tableFontSize: 10,
			tableHeaderFontSize: 9,
			rowPaddingY: 5,
			sectionGap: 14,
		};
	}

	return {
		metaFontSize: 14,
		tableFontSize: 10.5,
		tableHeaderFontSize: 9.5,
		rowPaddingY: 6,
		sectionGap: 18,
	};
}

function getStudentCountNoun(totalStudents: number) {
	if (totalStudents === 1) {
		return "طالب";
	}

	if (totalStudents === 2) {
		return "طالبين";
	}

	if (totalStudents <= 10) {
		return "طلابا";
	}

	return "طالبا";
}
