import { Text as PdfText } from "@react-pdf/renderer";
import React from "react";
// import { usePdfMode } from "../context";
import { detectPdfEnv } from "../utils";

export const Text = ({ children, ...props }: any) => {
  // const { isPdf } = usePdfMode();
  // const inPdf = detectPdfEnv();
  // const inPdf = isPdf || detectPdfEnv();

  return <PdfText {...props}>{children}</PdfText>;
  // return inPdf ? (
  // ) : (
  //   <p {...props}>{children}</p>
  // );
};
