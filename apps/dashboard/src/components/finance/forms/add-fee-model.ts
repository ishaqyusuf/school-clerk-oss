import type {
  FinanceStudentAudience,
  FinanceStudentGenderAudience,
} from "@school-clerk/utils/constants";

export const closedAddFeeParams = {
	addFee: null,
	addFeeClassroomId: null,
	addFeeStudentId: null,
	addFeeStudentTermFormId: null,
	addFeeTitle: null,
} as const;

type AddFeeDefaultValues = {
	scope: "global" | "classroom" | "student";
	classroomIds: string[];
	streamId: null;
	streamName: string;
	required: boolean;
	studentAudience: FinanceStudentAudience;
  studentGenderAudience: FinanceStudentGenderAudience;
  lines: Array<{
    description: string;
    amount: number;
    studentGenderAudience: FinanceStudentGenderAudience | null;
  }>;
};

export function getAddFeeDefaultValues({
	classroomId,
	studentId,
	title,
}: {
	classroomId?: string | null;
	studentId?: string | null;
	title?: string | null;
}): AddFeeDefaultValues {
	return {
		scope: studentId ? "student" : classroomId ? "classroom" : "global",
		classroomIds: classroomId ? [classroomId] : [],
		streamId: null,
		streamName: title ?? "",
		required: true,
		studentAudience: "ALL_STUDENTS",
    studentGenderAudience: "ALL_GENDERS",
    lines: [
      {
        description: title ?? "",
        amount: 0,
        studentGenderAudience: null,
      },
    ],
	};
}

export function getFeeScopeError({
	scope,
	classroomIds,
}: {
	scope?: "global" | "classroom" | "student";
	classroomIds?: string[];
}) {
	return scope === "classroom" && (classroomIds?.length ?? 0) === 0
		? "Select at least one classroom"
		: null;
}

export function resolveFeeClassroomIds({
	scope,
	selectedIds,
	availableIds,
}: {
	scope: "global" | "classroom" | "student";
	selectedIds: string[];
	availableIds: string[];
}) {
	if (scope !== "classroom") return { ids: [] as string[], error: null };

	const available = new Set(availableIds);
	const ids = selectedIds.filter((id) => available.has(id));
	return ids.length === selectedIds.length
		? { ids, error: null }
		: {
				ids: [] as string[],
				error:
					"Refresh the classroom list and select the fee classrooms again.",
			};
}

export function summarizeFeeBatch<T>(
	lines: T[],
	results: PromiseSettledResult<unknown>[],
) {
	const failedLines: T[] = [];
	let succeededCount = 0;
	let firstErrorMessage: string | undefined;

	results.forEach((result, index) => {
		if (result.status === "fulfilled") {
			succeededCount += 1;
			return;
		}

		const line = lines[index];
		if (line !== undefined) failedLines.push(line);
		if (!firstErrorMessage) {
			firstErrorMessage =
				result.reason instanceof Error
					? result.reason.message
					: "Please try again.";
		}
	});

	return { failedLines, succeededCount, firstErrorMessage };
}

export const feeAudienceOptions: Array<{
	value: FinanceStudentAudience;
	label: string;
}> = [
	{ value: "ALL_STUDENTS", label: "All students" },
	{ value: "NEW_ADMISSIONS_ONLY", label: "New admissions only" },
	{ value: "RETURNING_STUDENTS_ONLY", label: "Returning students only" },
];

export const feeGenderAudienceOptions: Array<{
  value: FinanceStudentGenderAudience;
  label: string;
}> = [
  { value: "ALL_GENDERS", label: "All genders" },
  { value: "MALE_ONLY", label: "Male students only" },
  { value: "FEMALE_ONLY", label: "Female students only" },
];

export function getFeeAssignmentSummary({
	audience,
  genderAudience,
	required,
}: {
	audience: FinanceStudentAudience;
  genderAudience: FinanceStudentGenderAudience;
	required: boolean;
}) {
	const audienceLabel =
		feeAudienceOptions.find((option) => option.value === audience)?.label ??
		"Selected students";
  const genderLabel =
    feeGenderAudienceOptions.find((option) => option.value === genderAudience)
      ?.label ?? "Selected genders";
  const matchingStudents = `${audienceLabel} · ${genderLabel}`;

	return required
    ? `${matchingStudents}: assigned automatically when the student enrolls.`
    : `${matchingStudents}: available in the student form and assigned only when selected.`;
}

export function normalizeFeeLines(
  lines:
    | Array<{
        description?: string | null;
        amount?: number | null;
        studentGenderAudience?: FinanceStudentGenderAudience | null;
      }>
    | null
    | undefined,
) {
  return (lines ?? []).map((line) => ({
    description: line.description ?? "",
    amount: line.amount ?? 0,
    studentGenderAudience: line.studentGenderAudience ?? null,
  }));
}

export function buildFeeItemPayloads({
	streamId,
	streamName,
	required,
	studentAudience,
  studentGenderAudience,
	classRoomDepartmentIds,
	lines,
}: {
	streamId?: string | null;
	streamName: string;
	required: boolean;
	studentAudience: FinanceStudentAudience;
  studentGenderAudience: FinanceStudentGenderAudience;
	classRoomDepartmentIds: string[];
  lines: Array<{
    description: string;
    amount: number;
    studentGenderAudience?: FinanceStudentGenderAudience | null;
  }>;
}) {
	return lines.map((line) => ({
		streamId,
		streamName,
		name: line.description,
		description: line.description,
		amount: line.amount,
		collectable: required,
		studentAudience,
    studentGenderAudience: line.studentGenderAudience ?? studentGenderAudience,
		classRoomDepartmentIds,
	}));
}
