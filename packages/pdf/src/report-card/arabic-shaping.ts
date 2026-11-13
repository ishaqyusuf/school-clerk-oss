/**
 * react-pdf shapes every run left-to-right, which breaks the contextual
 * lookups in Arabic fonts such as Amiri (letters drop or overlap). Converting
 * Arabic letters to their joined presentation forms first means the font only
 * has to draw fixed glyphs, so names and labels render correctly. Bidi
 * reordering still happens in react-pdf because presentation forms keep their
 * right-to-left bidi class.
 */

// [isolated, final, initial, medial]; right-joining letters have no initial or medial.
const FORMS: Record<string, readonly number[]> = {
	ء: [0xfe80],
	آ: [0xfe81, 0xfe82],
	أ: [0xfe83, 0xfe84],
	ؤ: [0xfe85, 0xfe86],
	إ: [0xfe87, 0xfe88],
	ئ: [0xfe89, 0xfe8a, 0xfe8b, 0xfe8c],
	ا: [0xfe8d, 0xfe8e],
	ب: [0xfe8f, 0xfe90, 0xfe91, 0xfe92],
	ة: [0xfe93, 0xfe94],
	ت: [0xfe95, 0xfe96, 0xfe97, 0xfe98],
	ث: [0xfe99, 0xfe9a, 0xfe9b, 0xfe9c],
	ج: [0xfe9d, 0xfe9e, 0xfe9f, 0xfea0],
	ح: [0xfea1, 0xfea2, 0xfea3, 0xfea4],
	خ: [0xfea5, 0xfea6, 0xfea7, 0xfea8],
	د: [0xfea9, 0xfeaa],
	ذ: [0xfeab, 0xfeac],
	ر: [0xfead, 0xfeae],
	ز: [0xfeaf, 0xfeb0],
	س: [0xfeb1, 0xfeb2, 0xfeb3, 0xfeb4],
	ش: [0xfeb5, 0xfeb6, 0xfeb7, 0xfeb8],
	ص: [0xfeb9, 0xfeba, 0xfebb, 0xfebc],
	ض: [0xfebd, 0xfebe, 0xfebf, 0xfec0],
	ط: [0xfec1, 0xfec2, 0xfec3, 0xfec4],
	ظ: [0xfec5, 0xfec6, 0xfec7, 0xfec8],
	ع: [0xfec9, 0xfeca, 0xfecb, 0xfecc],
	غ: [0xfecd, 0xfece, 0xfecf, 0xfed0],
	ف: [0xfed1, 0xfed2, 0xfed3, 0xfed4],
	ق: [0xfed5, 0xfed6, 0xfed7, 0xfed8],
	ك: [0xfed9, 0xfeda, 0xfedb, 0xfedc],
	ل: [0xfedd, 0xfede, 0xfedf, 0xfee0],
	م: [0xfee1, 0xfee2, 0xfee3, 0xfee4],
	ن: [0xfee5, 0xfee6, 0xfee7, 0xfee8],
	ه: [0xfee9, 0xfeea, 0xfeeb, 0xfeec],
	و: [0xfeed, 0xfeee],
	ى: [0xfeef, 0xfef0],
	ي: [0xfef1, 0xfef2, 0xfef3, 0xfef4],
	ٱ: [0xfb50, 0xfb51],
	پ: [0xfb56, 0xfb57, 0xfb58, 0xfb59],
	چ: [0xfb7a, 0xfb7b, 0xfb7c, 0xfb7d],
	ڤ: [0xfb6a, 0xfb6b, 0xfb6c, 0xfb6d],
	ک: [0xfb8e, 0xfb8f, 0xfb90, 0xfb91],
	گ: [0xfb92, 0xfb93, 0xfb94, 0xfb95],
	ی: [0xfbfc, 0xfbfd, 0xfbfe, 0xfbff],
};

// Lam followed by an alef: [isolated, final].
const LAM_ALEF: Record<string, readonly [number, number]> = {
	آ: [0xfef5, 0xfef6],
	أ: [0xfef7, 0xfef8],
	إ: [0xfef9, 0xfefa],
	ا: [0xfefb, 0xfefc],
};

const TATWEEL = "ـ";
const LAM = "ل";

function isMark(char: string) {
	const code = char.charCodeAt(0);
	return (
		(code >= 0x0610 && code <= 0x061a) ||
		(code >= 0x064b && code <= 0x065f) ||
		code === 0x0670 ||
		(code >= 0x06d6 && code <= 0x06ed)
	);
}

/** Can this character connect to the letter that follows it? */
function joinsForward(char: string | undefined) {
	if (!char) return false;
	if (char === TATWEEL) return true;
	return (FORMS[char]?.length ?? 0) === 4;
}

/** Can this character connect to the letter before it? */
function joinsBackward(char: string | undefined) {
	if (!char) return false;
	if (char === TATWEEL) return true;
	return (FORMS[char]?.length ?? 0) >= 2;
}

const ARABIC_LETTER = /[ء-يٱ-ۓ]/;

export function hasArabic(text: string) {
	return ARABIC_LETTER.test(text);
}

/** Converts Arabic letters to joined presentation forms for react-pdf. */
export function shapeArabicForPdf(text: string | null | undefined) {
	if (!text) return "";
	if (!hasArabic(text)) return text;
	const chars = Array.from(text);
	const neighbour = (from: number, step: 1 | -1) => {
		for (let i = from + step; i >= 0 && i < chars.length; i += step) {
			const char = chars[i] as string;
			if (!isMark(char)) return { char, index: i };
		}
		return null;
	};

	let output = "";
	for (let i = 0; i < chars.length; i++) {
		const char = chars[i] as string;
		const forms = FORMS[char];
		if (!forms) {
			output += char;
			continue;
		}
		const previous = neighbour(i, -1)?.char;
		const next = neighbour(i, 1);
		const connectsBefore = joinsForward(previous);

		if (char === LAM && next && LAM_ALEF[next.char]) {
			const ligature = LAM_ALEF[next.char] as readonly [number, number];
			output += String.fromCodePoint(ligature[connectsBefore ? 1 : 0]);
			// Keep any marks that sat on the lam or the alef.
			for (let j = i + 1; j < next.index; j++) output += chars[j];
			i = next.index;
			continue;
		}

		const connectsAfter = forms.length === 4 && joinsBackward(next?.char);
		const form =
			connectsBefore && connectsAfter
				? 3
				: connectsBefore
					? 1
					: connectsAfter
						? 2
						: 0;
		output += String.fromCodePoint(
			forms[form] ?? forms[0] ?? char.charCodeAt(0),
		);
	}
	return output;
}

const RTL_CONTENT = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
const EDGE = /^([\s\p{P}\p{S}]*)([\s\S]*?)([\s\p{P}\p{S}]*)$/u;
const MIRROR: Record<string, string> = {
	"(": ")",
	")": "(",
	"[": "]",
	"]": "[",
	"{": "}",
	"}": "{",
	"<": ">",
	">": "<",
	"«": "»",
	"»": "«",
};

const reverseMirrored = (value: string) =>
	Array.from(value)
		.reverse()
		.map((char) => MIRROR[char] ?? char)
		.join("");

/**
 * Prepares one paragraph of text for react-pdf. react-pdf lays every paragraph
 * out left-to-right, so in a right-to-left paragraph any punctuation at the
 * start or end (a trailing colon, full stop or percent sign) would land on the
 * wrong side. Moving those edge characters across, mirrored, gives the same
 * result a browser shows for `dir="rtl"`.
 */
export function toPdfParagraph(
	text: string | number | null | undefined,
	direction: "rtl" | "ltr",
) {
	const shaped = shapeArabicForPdf(text == null ? "" : String(text)).trim();
	if (direction === "ltr" || !RTL_CONTENT.test(shaped)) return shaped;
	const match = shaped.match(EDGE);
	if (!match) return shaped;
	const [, lead = "", core = "", trail = ""] = match;
	if (!core) return shaped;
	return `${reverseMirrored(trail.trim())}${core}${reverseMirrored(lead.trim())}`;
}
