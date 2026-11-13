import fs from "node:fs";
import path from "node:path";
import { Font } from "@react-pdf/renderer";

export const REPORT_CARD_PDF_FONT = "ReportCardAmiri";
export const REPORT_CARD_PDF_SCRIPT_FONT = "ReportCardMoonDance";

const FILES = {
	regular: "Amiri-Regular.ttf",
	bold: "Amiri-Bold.ttf",
	script: "MoonDance-Regular.ttf",
};

let registeredFrom: string | null = null;

function localFontsDir() {
	const cwd = process.cwd();
	const candidates = [
		path.join(cwd, "public", "fonts"),
		path.join(cwd, "packages", "pdf", "public", "fonts"),
		path.join(cwd, "..", "..", "packages", "pdf", "public", "fonts"),
	];
	return candidates.find((dir) => fs.existsSync(path.join(dir, FILES.regular)));
}

/**
 * Registers the report card fonts once. Fonts are read from disk when the
 * process can see them (local dev, tests); otherwise from `fontBaseUrl`, the
 * public `/fonts/` folder the dashboard serves.
 */
export function registerReportCardFonts(fontBaseUrl?: string | URL) {
	const dir = localFontsDir();
	const base = dir ?? (fontBaseUrl ? String(fontBaseUrl) : null);
	if (!base) {
		throw new Error("Report card fonts were not found.");
	}
	if (registeredFrom === base) return;
	const source = (file: string) =>
		dir
			? path.join(dir, file)
			: new URL(file, base.endsWith("/") ? base : `${base}/`).toString();

	Font.register({
		family: REPORT_CARD_PDF_FONT,
		fonts: [
			{ src: source(FILES.regular), fontWeight: 400 },
			{ src: source(FILES.bold), fontWeight: 700 },
		],
	});
	Font.register({
		family: REPORT_CARD_PDF_SCRIPT_FONT,
		src: source(FILES.script),
	});
	registeredFrom = base;
}
