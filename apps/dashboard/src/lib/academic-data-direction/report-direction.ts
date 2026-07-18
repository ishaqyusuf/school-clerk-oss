export type ReportDataDirection = "ltr" | "rtl";

export function resolveReportDataDirection(
	reportDirection: ReportDataDirection | null | undefined,
	academicDataDirection: ReportDataDirection | null | undefined,
): ReportDataDirection {
	return reportDirection ?? academicDataDirection ?? "ltr";
}
