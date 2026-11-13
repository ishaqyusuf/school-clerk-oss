"use client";

import { useStudentNameFormat } from "@/components/student-name-format/provider";
import { ReportCardPage } from "@/features/report-card/report-card-page";
import type { ReportCardData } from "@/features/report-card/types";
import { useReportPageContext } from "@/hooks/use-report-page";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import type { ReportCardConfig } from "@school-clerk/utils/report-card";
import { getStudentNameParts } from "@school-clerk/utils/student-name";
import { useMemo } from "react";

export type ReportCardPrintContext = RouterOutputs["reportCards"]["getPrintContext"];

/** One student's printed report card, drawn with the school's chosen template. */
export function StudentReportPage({
	studentId,
	printContext,
}: {
	studentId: string;
	printContext: ReportCardPrintContext;
}) {
	const ctx = useReportPageContext();
	const studentNameFormat = useStudentNameFormat();
	const record = ctx?.reportsById?.[studentId];

	const report = useMemo<ReportCardData | null>(() => {
		if (!record) return null;
		return {
			id: record.termFormId,
			nameParts: getStudentNameParts(record.student, studentNameFormat).filter(
				(part): part is string => !!part,
			),
			classroomName: record.departmentName || ctx.classroomName || "",
			tables: record.tables,
			grade: record.grade,
		};
	}, [ctx.classroomName, record, studentNameFormat]);

	if (!report) return null;

	const teacher = record?.departmentId
		? printContext.teacherByDepartment[record.departmentId]
		: undefined;

	return (
		<ReportCardPage
			templateId={printContext.templateId}
			config={printContext.config as ReportCardConfig}
			report={report}
			term={printContext.term}
			teacherSignatureUrl={teacher?.signatureUrl}
		/>
	);
}
