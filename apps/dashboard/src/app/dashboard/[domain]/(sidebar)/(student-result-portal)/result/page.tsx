"use client";

import { PDFViewer } from "@school-clerk/pdf";
import { ResultTemplate } from "@school-clerk/pdf/result-template";
import { cn } from "@school-clerk/ui/cn";
import {
	previewResultTemplateConfig,
	previewResultTemplateReports,
} from "@/features/result-pdf/preview-data";

export default function Page() {
	return (
		<div
			className={cn(
				"flex flex-col",
				"whitespace-nowrap",
				// numPages && "bg-white"
			)}
		>
			<PDFViewer className="h-screen">
				<ResultTemplate
					config={previewResultTemplateConfig}
					reports={previewResultTemplateReports}
					template="template-1"
					title="Result Template 1 Preview"
				/>
			</PDFViewer>
		</div>
	);
}
