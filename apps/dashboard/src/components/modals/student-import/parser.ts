export interface ParsedStudent {
  name: string;
  surname: string;
  otherName?: string;
  gender?: string;
  classRoom: string;
  classroomDepartmentId: string;
  lineNumber: number;
  originalText: string;
  parsedGender?: "M" | "F";
}

export interface ParsedWarning {
  lineNumber: number;
  text: string;
  warning: string;
}

function parseGenderAlias(value: string): "M" | "F" | undefined {
  const lowerGender = value.trim().toLowerCase();

  if (lowerGender === "m" || lowerGender === "male") {
    return "M";
  }

  if (lowerGender === "f" || lowerGender === "female") {
    return "F";
  }

  return undefined;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeArabic(str: string): string {
  if (!str) return "";
  str = str
    .normalize("NFC")
    .replace(
      /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF\u0640]/g,
      "",
    );
  const map: Record<string, string> = {
    "أ": "ا",
    "إ": "ا",
    "آ": "ا",
    "ٱ": "ا",
    "ى": "ي",
    "ئ": "ي",
    "ؤ": "و",
    "ة": "ه",
  };
  str = str.replace(/[\u0621-\u06D3\u06FA-\u06FF]/g, (ch) => map[ch] || ch);
  return normalizeWhitespace(str);
}

function normalizeNameGuideValue(value: string) {
  return normalizeArabic(value).toLowerCase();
}

function buildNameGuide(nameGuide: string[]) {
  const seen = new Set<string>();

  return nameGuide
    .map((name) => normalizeWhitespace(name))
    .filter(Boolean)
    .map((original) => {
      const normalized = normalizeNameGuideValue(original);
      const tokens = normalized.split(" ").filter(Boolean);

      return {
        original,
        normalized,
        tokens,
      };
    })
    .filter((entry) => {
      if (!entry.normalized || seen.has(entry.normalized)) return false;
      seen.add(entry.normalized);
      return true;
    })
    .sort((a, b) => {
      if (b.tokens.length !== a.tokens.length) {
        return b.tokens.length - a.tokens.length;
      }

      return b.normalized.length - a.normalized.length;
    });
}

function splitNameWithGuide(source: string, nameGuide: string[]) {
  const normalizedSource = normalizeWhitespace(source);
  if (!normalizedSource) return [];

  const tokens = normalizedSource.split(" ").filter(Boolean);
  const normalizedTokens = tokens.map((token) => normalizeNameGuideValue(token));
  const guide = buildNameGuide(nameGuide);

  if (!guide.length) {
    return tokens;
  }

  const nameParts: string[] = [];
  let cursor = 0;

  while (cursor < tokens.length) {
    const match = guide.find((entry) => {
      if (!entry.tokens.length) return false;
      if (entry.tokens.length > tokens.length - cursor) return false;

      return entry.tokens.every(
        (token, index) => normalizedTokens[cursor + index] === token,
      );
    });

    if (!match) {
      nameParts.push(tokens[cursor] || "");
      cursor += 1;
      continue;
    }

    nameParts.push(tokens.slice(cursor, cursor + match.tokens.length).join(" "));
    cursor += match.tokens.length;
  }

  return nameParts.filter(Boolean);
}

export function parseRawInput(
  rawText: string,
  classRoomName: string,
  classRoomId: string,
  globalGender?: "Male" | "Female" | "unset" | "",
  nameGuide: string[] = [],
): { students: ParsedStudent[]; warnings: ParsedWarning[] } {
  const students: ParsedStudent[] = [];
  const warnings: ParsedWarning[] = [];

  if (!rawText) {
    return { students, warnings };
  }

  const lines = rawText.split("\n");
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();
    if (!trimmed) return;

    const hasPunctuationNameDelimiter = /[,.،]/.test(trimmed);
    const delimitedParts = hasPunctuationNameDelimiter
      ? trimmed
          .split(/[,.،]/)
          .map((part) => part.trim())
          .filter(Boolean)
      : [];
    const lastDelimitedPart = delimitedParts[delimitedParts.length - 1] || "";
    const parsedGenderFromDelimitedPart = lastDelimitedPart
      ? parseGenderAlias(lastDelimitedPart)
      : undefined;
    const nameSourceParts = parsedGenderFromDelimitedPart
      ? delimitedParts.slice(0, -1)
      : delimitedParts;
    const nameTokens =
      hasPunctuationNameDelimiter && nameSourceParts.length > 1
        ? nameSourceParts
        : splitNameWithGuide(nameSourceParts[0] || trimmed, nameGuide);

    if (!nameTokens.length) {
      warnings.push({
        lineNumber,
        text: trimmed,
        warning: "Empty student name part on line",
      });
      return;
    }

    const parsedGender: "M" | "F" | undefined = parsedGenderFromDelimitedPart;

    const effectiveGender =
      parsedGender ||
      (globalGender === "Male"
        ? "M"
        : globalGender === "Female"
          ? "F"
          : undefined);

    const name = nameTokens[0] || "";
    const surname = nameTokens[1] || "";
    const otherName = nameTokens.slice(2).join(" ") || undefined;

    if (!surname) {
      warnings.push({
        lineNumber,
        text: trimmed,
        warning: "Surname missing",
      });
    }

    students.push({
      name,
      surname,
      otherName,
      gender: effectiveGender,
      classRoom: classRoomName,
      classroomDepartmentId: classRoomId,
      lineNumber,
      originalText: trimmed,
      parsedGender,
    });
  });

  return { students, warnings };
}
