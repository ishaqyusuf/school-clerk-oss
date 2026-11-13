import { DEFAULT_CALLIGRAPHY_DICTIONARY } from "./calligraphy-dictionary";

export { DEFAULT_CALLIGRAPHY_DICTIONARY };

export type CalligraphyMode = "off" | "dictionary" | "auto";

export type CalligraphyOptions = {
	mode?: CalligraphyMode;
	/** Number of tatweel characters inserted by the automatic stretch. */
	kashidaLength?: number;
	/** School overrides, applied before the built-in dictionary. */
	dictionary?: Record<string, string>;
	/** Whether the built-in Darul Hadith dictionary is consulted. */
	useDefaultDictionary?: boolean;
};

const TATWEEL = "ـ";
const ARABIC_LETTER = /[ء-غف-يٱ-ۓ]/;
const ARABIC_MARK = /[ً-ٰٟۖ-ۭ]/;
// Letters that join to the previous letter but never to the next one, plus hamza.
const NON_LEFT_JOINING = new Set([
	"ء", // ء
	"آ", // آ
	"أ", // أ
	"ؤ", // ؤ
	"إ", // إ
	"ا", // ا
	"ة", // ة
	"د", // د
	"ذ", // ذ
	"ر", // ر
	"ز", // ز
	"و", // و
	"ى", // ى
	"ٱ", // ٱ
]);
const ALEF_FORMS = new Set(["آ", "أ", "إ", "ا", "ٱ"]);
const LAM = "ل";

type Cluster = { letter: string; text: string };

function toClusters(word: string): Cluster[] | null {
	const clusters: Cluster[] = [];
	for (const char of word) {
		if (ARABIC_MARK.test(char)) {
			const last = clusters.at(-1);
			if (!last) return null;
			last.text += char;
			continue;
		}
		if (!ARABIC_LETTER.test(char)) return null;
		clusters.push({ letter: char, text: char });
	}
	return clusters;
}

/**
 * Stretches one Arabic word with tatweel at its last joinable gap. Gaps that
 * would split a lam-alef ligature are skipped, so "بلال" becomes "بـلال".
 * Returns the word unchanged when it is not purely Arabic or cannot stretch.
 */
export function stretchArabicWord(word: string, kashidaLength: number) {
	if (!word || word.includes(TATWEEL) || kashidaLength <= 0) return word;
	const clusters = toClusters(word);
	if (!clusters || clusters.length < 2) return word;

	for (let index = clusters.length - 2; index >= 0; index -= 1) {
		const current = clusters[index]!;
		const next = clusters[index + 1]!;
		if (NON_LEFT_JOINING.has(current.letter)) continue;
		if (current.letter === LAM && ALEF_FORMS.has(next.letter)) continue;
		return [
			...clusters.slice(0, index + 1).map((cluster) => cluster.text),
			TATWEEL.repeat(Math.round(kashidaLength)),
			...clusters.slice(index + 1).map((cluster) => cluster.text),
		].join("");
	}
	return word;
}

/** Applies dictionary and automatic calligraphy to each word of a name. */
export function applyNameCalligraphy(
	name: string | null | undefined,
	options: CalligraphyOptions,
) {
	if (!name) return "";
	const mode = options.mode ?? "dictionary";
	if (mode === "off") return name;
	return name
		.split(/\s+/)
		.filter(Boolean)
		.map((word) => {
			const custom = options.dictionary?.[word];
			if (custom) return custom;
			if (options.useDefaultDictionary !== false) {
				const builtIn = DEFAULT_CALLIGRAPHY_DICTIONARY[word];
				if (builtIn) return builtIn;
			}
			if (mode === "auto") {
				return stretchArabicWord(word, options.kashidaLength ?? 10);
			}
			return word;
		})
		.join(" ");
}

/** Parses "word = stretched" lines from the template form. */
export function parseCalligraphyDictionary(text: string) {
	const dictionary: Record<string, string> = {};
	for (const line of text.split(/\r?\n/)) {
		const [rawWord, ...rest] = line.split("=");
		const word = rawWord?.trim();
		const value = rest.join("=").trim();
		if (word && value) dictionary[word] = value;
	}
	return dictionary;
}

export function formatCalligraphyDictionary(dictionary: Record<string, string>) {
	return Object.entries(dictionary)
		.map(([word, value]) => `${word} = ${value}`)
		.join("\n");
}
