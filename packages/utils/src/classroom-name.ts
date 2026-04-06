const ARABIC_DIACRITICS_REGEX = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const TATWEEL_REGEX = /\u0640/g;

export function normalizeClassroomNamePart(value?: string | null) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(ARABIC_DIACRITICS_REGEX, "")
    .replace(TATWEEL_REGEX, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

export function classroomNameContains(
  value?: string | null,
  part?: string | null,
) {
  const normalizedValue = normalizeClassroomNamePart(value);
  const normalizedPart = normalizeClassroomNamePart(part);

  if (!normalizedValue || !normalizedPart) return false;

  return normalizedValue.includes(normalizedPart);
}

export function classroomDisplayName(input?: {
  className?: string | null;
  departmentName?: string | null;
}) {
  const className = input?.className?.trim();
  const departmentName = input?.departmentName?.trim();

  if (!className) return departmentName ?? "";
  if (!departmentName) return className;

  if (classroomNameContains(departmentName, className)) {
    return departmentName;
  }

  return `${className} ${departmentName}`;
}
