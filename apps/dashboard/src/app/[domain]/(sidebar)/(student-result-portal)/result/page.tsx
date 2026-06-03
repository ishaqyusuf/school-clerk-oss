"use client";

import { PDFViewer } from "@school-clerk/pdf";
import { ResultTemplate } from "@school-clerk/pdf/result-template";
import { cn } from "@school-clerk/ui/cn";

export default function Page() {
  return (
    <div
      className={cn(
        "flex flex-col",
        "whitespace-nowrap"
        // numPages && "bg-white"
      )}
    >
      <PDFViewer className="h-screen">
        <ResultTemplate />
      </PDFViewer>
    </div>
  );
}
