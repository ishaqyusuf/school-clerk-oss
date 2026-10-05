function normalizeArabic(str: string): string {
  if (!str) return "";
  str = str
    .normalize("NFC")
    .replace(
      /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF\u0640]/g,
      "",
    );
  const map: Record<string, string> = {
    أ: "ا",
    إ: "ا",
    آ: "ا",
    ٱ: "ا",
    ى: "ي",
    ئ: "ي",
    ؤ: "w",
    ة: "ه",
  };
  str = str.replace(/[\u0621-\u06D3\u06FA-\u06FF]/g, (ch) => map[ch] || ch);
  return str.replace(/\s+/g, " ").trim();
}

function normalizeName(str: string): string {
  return normalizeArabic(str).toLowerCase().trim();
}

export function normalizeStudentDuplicateNameKey(input: {
  name?: string | null;
  surname?: string | null;
  otherName?: string | null;
}) {
  return normalizeName(
    [input.name, input.surname, input.otherName]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(" "),
  ).replace(/\s+/g, " ");
}
