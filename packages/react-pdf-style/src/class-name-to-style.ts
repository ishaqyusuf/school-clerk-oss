import { pdfStyleRules, PdfStyle } from "./pdf-style-rules";

export function classNameToStyle(
  className?: string,
  dir: "ltr" | "rtl" = "ltr"
): PdfStyle[] {
  if (!className) return [];
  const styles: PdfStyle[] = [];

  for (const token of className.trim().split(/\s+/)) {
    for (const [regex, handler] of pdfStyleRules) {
      const match = token.match(regex);
      if (match) {
        const style = handler(match, dir);
        if (style) styles.push(style);
        break;
      }
    }
  }

  return styles;
}
