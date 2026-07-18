export type AssessmentScoreCellResult =
  | {
      status: "blank";
    }
  | {
      status: "value";
      value: number;
      normalizedText: string;
    }
  | {
      status: "invalid";
      reason:
        | "formula"
        | "percentage"
        | "exponent"
        | "grouping-separator"
        | "negative"
        | "not-numeric"
        | "not-finite";
    };

const ARABIC_INDIC_ZERO = "٠".codePointAt(0)!;
const EASTERN_ARABIC_INDIC_ZERO = "۰".codePointAt(0)!;

function normalizeDigit(character: string) {
  const codePoint = character.codePointAt(0)!;

  if (codePoint >= ARABIC_INDIC_ZERO && codePoint <= ARABIC_INDIC_ZERO + 9) {
    return String(codePoint - ARABIC_INDIC_ZERO);
  }

  if (
    codePoint >= EASTERN_ARABIC_INDIC_ZERO &&
    codePoint <= EASTERN_ARABIC_INDIC_ZERO + 9
  ) {
    return String(codePoint - EASTERN_ARABIC_INDIC_ZERO);
  }

  return character;
}

function normalizeNumericText(value: string) {
  return Array.from(value, normalizeDigit).join("").replaceAll("٫", ".");
}

export function normalizeAssessmentScoreCell(
  input: unknown,
): AssessmentScoreCellResult {
  if (input == null) {
    return { status: "blank" };
  }

  if (typeof input === "number") {
    if (!Number.isFinite(input)) {
      return { status: "invalid", reason: "not-finite" };
    }
    if (input < 0) {
      return { status: "invalid", reason: "negative" };
    }

    return {
      status: "value",
      value: input,
      normalizedText: String(input),
    };
  }

  if (typeof input !== "string") {
    return { status: "invalid", reason: "not-numeric" };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return { status: "blank" };
  }
  if (trimmed.startsWith("=")) {
    return { status: "invalid", reason: "formula" };
  }
  if (trimmed.includes("%") || trimmed.includes("٪")) {
    return { status: "invalid", reason: "percentage" };
  }
  if (/[,٬]/.test(trimmed)) {
    return { status: "invalid", reason: "grouping-separator" };
  }

  const normalizedText = normalizeNumericText(trimmed);
  if (/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)[eE][+-]?\d+$/.test(normalizedText)) {
    return { status: "invalid", reason: "exponent" };
  }
  if (normalizedText.startsWith("-")) {
    return { status: "invalid", reason: "negative" };
  }
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalizedText)) {
    return { status: "invalid", reason: "not-numeric" };
  }

  const value = Number(normalizedText);
  if (!Number.isFinite(value)) {
    return { status: "invalid", reason: "not-finite" };
  }

  return {
    status: "value",
    value,
    normalizedText: String(value),
  };
}
