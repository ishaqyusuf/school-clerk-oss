"use client";

import { useStudentNameFormat } from "@/components/student-name-format/provider";
import { toReportCardRenderProps } from "@/features/report-card/report-card-data";
import { ReportCardPage } from "@/features/report-card/report-card-page";
import { useReportPageContext } from "@/hooks/use-report-page";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { useMemo } from "react";

export type ReportCardPrintContext =
	RouterOutputs["reportCards"]["getPrintContext"];

/** One student's report card, drawn with the school's chosen template. */
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

	const props = useMemo(
		() =>
			record
				? toReportCardRenderProps(
						record,
						printContext,
						studentNameFormat,
						ctx.classroomName,
					)
				: null,
		[ctx.classroomName, printContext, record, studentNameFormat],
	);

	if (!props) return null;
	return <ReportCardPage {...props} />;
}
