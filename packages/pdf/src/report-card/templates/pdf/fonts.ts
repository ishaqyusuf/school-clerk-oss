import { fileURLToPath } from "node:url";
import { Font } from "@react-pdf/renderer";

export const REPORT_CARD_PDF_FONT = "ReportCardAmiri";
export const REPORT_CARD_PDF_SCRIPT_FONT = "ReportCardMoonDance";

let registered = false;

export function registerReportCardFonts() {
	if (registered) return;

	Font.register({
		family: REPORT_CARD_PDF_FONT,
		fonts: [
			{
				src: fileURLToPath(
					new URL(
						"../../../../public/fonts/Amiri-Regular.ttf",
						import.meta.url,
					),
				),
				fontWeight: 400,
			},
			{
				src: fileURLToPath(
					new URL("../../../../public/fonts/Amiri-Bold.ttf", import.meta.url),
				),
				fontWeight: 700,
			},
		],
	});
	Font.register({
		family: REPORT_CARD_PDF_SCRIPT_FONT,
		src: fileURLToPath(
			new URL(
				"../../../../public/fonts/MoonDance-Regular.ttf",
				import.meta.url,
			),
		),
	});
	registered = true;
}
