import { View as PdfView, ViewProps } from "@react-pdf/renderer";
import React from "react";
import { usePdfMode } from "../context";
import { detectPdfEnv } from "../utils";
import { cn } from "../cn";
import { classNameToStyle } from "../class-name-to-style";
interface Props extends ViewProps {
  className?: string;
  dir?: "ltr" | "rtl";
}
export const View = ({ children, style, className, dir, ...props }: any) => {
  // const { isPdf } = usePdfMode();
  // const inPdf = isPdf || detectPdfEnv();
  const inPdf = detectPdfEnv();
  const merged = cn(className);
  const computed = classNameToStyle(merged, dir);
  console.log({ computed, className });

  return (
    <PdfView {...props} style={[...computed, style]}>
      {children}
    </PdfView>
  );
  return inPdf ? (
    <PdfView {...props} style={[...computed, style]}>
      {children}
    </PdfView>
  ) : (
    <div {...props}>{children}</div>
  );
};
