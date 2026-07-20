export const STUDENT_NAME_FORMATS = [
	"FIRST_SURNAME_OTHER",
	"SURNAME_FIRST_OTHER",
	"FIRST_OTHER_SURNAME",
] as const;

export type StudentNameFormat = (typeof STUDENT_NAME_FORMATS)[number];

export const DEFAULT_STUDENT_NAME_FORMAT: StudentNameFormat =
	"FIRST_SURNAME_OTHER";

export type StudentNameParts = {
	firstName?: string | null;
	name?: string | null;
	surname?: string | null;
	otherName?: string | null;
};

const NAME_PART_ORDER: Record<
	StudentNameFormat,
	readonly [
		"firstName" | "surname" | "otherName",
		"firstName" | "surname" | "otherName",
		"firstName" | "surname" | "otherName",
	]
> = {
	FIRST_SURNAME_OTHER: ["firstName", "surname", "otherName"],
	SURNAME_FIRST_OTHER: ["surname", "firstName", "otherName"],
	FIRST_OTHER_SURNAME: ["firstName", "otherName", "surname"],
};

export function normalizeStudentNameFormat(
	value?: string | null,
): StudentNameFormat {
	return STUDENT_NAME_FORMATS.includes(value as StudentNameFormat)
		? (value as StudentNameFormat)
		: DEFAULT_STUDENT_NAME_FORMAT;
}

export function getStudentNameParts(
	student: StudentNameParts | null | undefined,
	format: StudentNameFormat = DEFAULT_STUDENT_NAME_FORMAT,
) {
	if (!student) return [];

	const values = {
		firstName: student.firstName ?? student.name,
		surname: student.surname,
		otherName: student.otherName,
	};

	return NAME_PART_ORDER[normalizeStudentNameFormat(format)]
		.map((part) => values[part]?.trim())
		.filter((part): part is string => Boolean(part));
}

export function formatStudentName(
	student: StudentNameParts | null | undefined,
	format: StudentNameFormat = DEFAULT_STUDENT_NAME_FORMAT,
) {
	return getStudentNameParts(student, format).join(" ");
}
