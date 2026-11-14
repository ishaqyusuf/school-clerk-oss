import { fileURLToPath } from "node:url";
import { Font } from "@react-pdf/renderer";

let registered = false;

export function ensureResultFontsRegistered() {
	if (registered) return;

	Font.register({
		family: "Amiri",
		src: fileURLToPath(
			new URL("../../public/fonts/Amiri-Regular.ttf", import.meta.url),
		),
	});

	Font.register({
		family: "DancingScript",
		src: fileURLToPath(
			new URL("../../public/fonts/DancingScript-Regular.ttf", import.meta.url),
		),
	});

	registered = true;
}
