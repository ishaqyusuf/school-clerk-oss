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
  batchGender?: "M" | "F";
  classroomSource?: "selected" | "header" | "missing";
  classroomLabel?: string;
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

function parseGenderMarker(value: string): "M" | "F" | undefined {
  const parts = value
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length || parts.length > 2) return undefined;

  const aliases = parts.map(parseGenderAlias);
  const first = aliases[0];

  if (!first || aliases.some((alias) => alias !== first)) {
    return undefined;
  }

  return first;
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
    أ: "ا",
    إ: "ا",
    آ: "ا",
    ٱ: "ا",
    ى: "ي",
    ئ: "ي",
    ؤ: "و",
    ة: "ه",
  };
  str = str.replace(/[\u0621-\u06D3\u06FA-\u06FF]/g, (ch) => map[ch] || ch);
  return normalizeWhitespace(str);
}

function normalizeNameGuideValue(value: string) {
  return normalizeArabic(value).toLowerCase();
}

function normalizeClassroomLabel(value: string) {
  return normalizeNameGuideValue(value)
    .replace(/[()[\]{}]/g, "")
    .replace(/[-–—_:;|/\\]+/g, "")
    .replace(/\s+/g, "")
    .trim();
}

export interface ImportClassroomOption {
  id: string;
  departmentName: string;
  classRoom?: {
    name?: string | null;
  } | null;
}

function getClassroomDisplayName(classroom: ImportClassroomOption) {
  const className = classroom.classRoom?.name?.trim();
  const departmentName = classroom.departmentName?.trim();

  if (className && departmentName && className !== departmentName) {
    return `${className} - ${departmentName}`;
  }

  return departmentName || className || "";
}

function buildClassroomResolver(classrooms: ImportClassroomOption[]) {
  const labelMap = new Map<string, ImportClassroomOption[]>();

  for (const classroom of classrooms) {
    const displayName = getClassroomDisplayName(classroom);
    const labels = [
      displayName,
      classroom.departmentName,
      classroom.classRoom?.name || "",
      `${classroom.classRoom?.name || ""} ${classroom.departmentName || ""}`,
    ];

    for (const label of labels) {
      const normalized = normalizeClassroomLabel(label);
      if (!normalized) continue;

      const current = labelMap.get(normalized) || [];
      if (!current.some((item) => item.id === classroom.id)) {
        current.push(classroom);
      }
      labelMap.set(normalized, current);
    }
  }

  return (label: string) => {
    const matches = labelMap.get(normalizeClassroomLabel(label)) || [];
    return matches.length === 1 ? matches[0] : null;
  };
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
  const normalizedTokens = tokens.map((token) =>
    normalizeNameGuideValue(token),
  );
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

    nameParts.push(
      tokens.slice(cursor, cursor + match.tokens.length).join(" "),
    );
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
  classrooms: ImportClassroomOption[] = [],
): { students: ParsedStudent[]; warnings: ParsedWarning[] } {
  const students: ParsedStudent[] = [];
  const warnings: ParsedWarning[] = [];
  const resolveClassroom = buildClassroomResolver(classrooms);
  let activeClassRoomName = classRoomName;
  let activeClassRoomId = classRoomId;
  let activeClassroomSource: ParsedStudent["classroomSource"] = classRoomId
    ? "selected"
    : "missing";
  let activeBatchGender: "M" | "F" | undefined;

  if (!rawText) {
    return { students, warnings };
  }

  const lines = rawText.split("\n");
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();
    if (!trimmed) return;

    const matchedClassroom = resolveClassroom(trimmed);
    if (matchedClassroom) {
      activeClassRoomName = getClassroomDisplayName(matchedClassroom);
      activeClassRoomId = matchedClassroom.id;
      activeClassroomSource = "header";
      activeBatchGender = undefined;
      return;
    }

    const genderMarker = parseGenderMarker(trimmed);
    if (genderMarker) {
      activeBatchGender = genderMarker;
      return;
    }

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
      activeBatchGender ||
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

    if (!activeClassRoomId) {
      warnings.push({
        lineNumber,
        text: trimmed,
        warning:
          "Classroom missing; add a class name header or choose a default classroom",
      });
    }

    students.push({
      name,
      surname,
      otherName,
      gender: effectiveGender,
      classRoom: activeClassRoomName,
      classroomDepartmentId: activeClassRoomId,
      lineNumber,
      originalText: trimmed,
      parsedGender,
      batchGender: parsedGender ? undefined : activeBatchGender,
      classroomSource: activeClassroomSource,
      classroomLabel: activeClassRoomName,
    });
  });

  return { students, warnings };
}
