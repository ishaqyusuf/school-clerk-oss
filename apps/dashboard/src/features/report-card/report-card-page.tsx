"use client";

import { arabic, moonDance } from "@/fonts";
import type { ReportCardRenderProps } from "@school-clerk/pdf/report-card";
import { HtmlReportCard } from "@school-clerk/pdf/report-card/html";

const fonts = { body: arabic.className, script: moonDance.className };

/** The HTML render of the school's report card template, with the dashboard's fonts. */
export function ReportCardPage(
	props: ReportCardRenderProps & { className?: string },
) {
	return <HtmlReportCard {...props} fonts={fonts} />;
}
