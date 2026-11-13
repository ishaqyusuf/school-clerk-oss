import type { StudentReportRecord } from "@/features/student-report/report-model";
import type {
	ReportCardData,
	ReportCardRenderProps,
} from "@school-clerk/pdf/report-card";
import {
	type ReportCardConfig,
	type ReportCardTemplateId,
	isReportCardTemplateId,
} from "@school-clerk/utils/report-card";
import {
	type StudentNameFormat,
	getStudentNameParts,
} from "@school-clerk/utils/student-name";

/** Maps a Student Report record to the data every report card template draws. */
export function toReportCardData(
	record: StudentReportRecord,
	nameFormat?: StudentNameFormat | null,
	fallbackClassroomName?: string | null,
): ReportCardData {
	return {
		id: record.termFormId,
		nameParts: getStudentNameParts(
			record.student,
			nameFormat ?? undefined,
		).filter((part): part is string => !!part),
		classroomName: record.departmentName || fallbackClassroomName || "",
		tables: record.tables,
		grade: record.grade,
	};
}

/** The `reportCards.getPrintContext` result (fields are loose under this app's compiler settings). */
export type ReportCardPrintContextLike = {
	templateId?: string;
	config?: unknown;
	term?: ReportCardRenderProps["term"];
	teacherByDepartment?: Record<
		string,
		{ signatureUrl?: string | null } | undefined
	>;
};

/** Everything one page needs: the school's template, the term and the class teacher's signature. */
export function toReportCardRenderProps(
	record: StudentReportRecord,
	context: ReportCardPrintContextLike,
	nameFormat?: StudentNameFormat | null,
	fallbackClassroomName?: string | null,
): ReportCardRenderProps {
	const templateId: ReportCardTemplateId = isReportCardTemplateId(
		context.templateId,
	)
		? context.templateId
		: "bilingual-classic";
	return {
		templateId,
		config: context.config as ReportCardConfig,
		report: toReportCardData(record, nameFormat, fallbackClassroomName),
		term: context.term ?? {},
		teacherSignatureUrl: record.departmentId
			? context.teacherByDepartment?.[record.departmentId]?.signatureUrl
			: null,
	};
}
