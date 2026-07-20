import {
	type StudentNameFormat,
	formatStudentName,
} from "@school-clerk/utils/student-name";
import { z } from "zod";

const subAssessmentSchema = z.object({
  id: z.number().optional().nullable(),
  title: z.string().min(1),
  obtainable: z.number().finite().positive(),
  percentageObtainable: z.number().finite().min(0),
});

export const assessmentPrintModeSchema = z
  .enum(["expanded", "total"])
  .default("expanded");

export type AssessmentPrintMode = z.infer<typeof assessmentPrintModeSchema>;

export const saveAssessementSchema = z
  .object({
    id: z.number().optional().nullable(),
    title: z.string().min(1),
    obtainable: z.number().finite().min(0).nullable(),
    index: z.number(),
    percentageObtainable: z.number().finite().min(0),
    departmentSubjectId: z.string(),
    isGroup: z.boolean().optional().default(false),
    printMode: assessmentPrintModeSchema,
    parentAssessmentId: z.number().optional().nullable(),
    childAssessments: z.array(subAssessmentSchema).optional().default([]),
  })
  .superRefine((value, ctx) => {
    if (value.isGroup && !value.childAssessments?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["childAssessments"],
        message: "Add at least one sub-assessment for grouped items.",
      });
    }

    if (
      !value.isGroup &&
      value.percentageObtainable > 0 &&
      (value.obtainable == null || value.obtainable <= 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["obtainable"],
        message: "Weighted assessments require a positive obtainable score.",
      });
    }
  });

export type SaveAssessementSchema = z.infer<typeof saveAssessementSchema>;

export const saveSubjectSchema = z.object({
  title: z.string(),
  description: z.string().optional().nullable(),
  subjectId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  departmentSubjectId: z.string().optional().nullable(),
  sessionTermId: z.string().optional().nullable(),
});

export type SaveSubjectSchema = z.infer<typeof saveSubjectSchema>;

export const entrollStudentToTermSchema = z.object({
  studentId: z.string(),
  classroomDepartmentId: z.string().optional().nullable(),
  studentSessionFormId: z.string().optional().nullable(),
  schoolSessionId: z.string(),
  sessionTermId: z.string(),
});

export type EntrollStudentToTerm = z.infer<typeof entrollStudentToTermSchema>;

export const applyPaymentSchema = z.any();
export const cancelStudentFeeSchema = z.any();
export const cancelStudentPaymentSchema = z.any();
export const createSchoolFeeSchema = z.any();
export const createStudentFeeSchema = z.any();

export function getScoreKey(assessmentId: number, studentTermId: string) {
  return `${assessmentId}-${studentTermId}`;
}

export function getResultComment(score: number) {
  const comments = [
    {
      min: 90,
      max: 100,
      arabic: "ممتاز! أداء رائع واستثنائي.",
      english: "Excellent! Outstanding and exceptional performance.",
    },
    {
      min: 80,
      max: 89,
      arabic: "جيد جدًا! أداء قوي وجهد ملحوظ.",
      english: "Very good! Strong performance and great effort.",
    },
    {
      min: 70,
      max: 79,
      arabic: "جيد! عمل جيد ولكن هناك مجال للتحسين.",
      english: "Good! Well done, but there is room for improvement.",
    },
    {
      min: 60,
      max: 69,
      arabic: "مقبول! تحتاج إلى بذل المزيد من الجهد.",
      english: "Satisfactory! Needs more effort.",
    },
    {
      min: 50,
      max: 59,
      arabic: "ضعيف! حاول تحسين أدائك في المستقبل.",
      english: "Weak! Try to improve your performance in the future.",
    },
    {
      min: 0,
      max: 49,
      arabic: "راسب! بحاجة إلى العمل الجاد والمثابرة.",
      english: "Fail! Needs hard work and persistence.",
    },
  ];

  const comment = comments.find((c) => score > c.min - 1 && score < c.max + 1);
  return comment
    ? comment
    : { arabic: "درجة غير صالحة", english: "Invalid score" };
}

export type AssessmentResultRecord = {
  id?: number | null;
  obtained?: number | null;
  percentageScore?: number | null;
  studentTermFormId?: string | null;
  studentId?: string | null;
};

export type AssessmentRecord = {
  id: number;
  title: string;
  obtainable: number | null;
  percentageObtainable?: number | null;
  index?: number | null;
  parentAssessment?: {
    id?: number | null;
    title?: string | null;
    index?: number | null;
    printMode?: string | null;
  } | null;
  assessmentResults?: AssessmentResultRecord[];
};

export type SubjectRecord = {
  id: string;
  subject: {
    title: string;
  };
  assessments?: AssessmentRecord[];
};

export type StudentTermRecord = {
  id: string;
  student?: {
    id?: string | null;
    gender?: string | null;
    name?: string | null;
    otherName?: string | null;
    surname?: string | null;
  } | null;
};

export type ResultSubject = SubjectRecord & {
  assessments: AssessmentRecord[];
};

export type ResultCell = {
  assessment: AssessmentRecord;
  result?: AssessmentResultRecord | null;
  obtained: number | null;
  score: number | null;
};

export type ResultSubjectTotal = {
  subject: ResultSubject;
  cells: ResultCell[];
  total: number;
};

export type ResultRow<TStudent extends StudentTermRecord = StudentTermRecord> =
  {
    student: TStudent;
    studentName: string;
    subjectTotals: ResultSubjectTotal[];
    grandTotal: number;
    percentage: number;
  };

export function getAssessmentDisplayTitle(assessment: AssessmentRecord) {
  return assessment.parentAssessment?.title
    ? `${assessment.parentAssessment.title} - ${assessment.title}`
    : assessment.title;
}

type PrintableAssessmentInput = {
  percentageObtainable?: number | null;
};

export function isPrintableAssessment(assessment: PrintableAssessmentInput) {
  return (assessment.percentageObtainable ?? 0) > 0;
}

export type AssessmentPrintStatusInput = PrintableAssessmentInput & {
  id?: number | null;
  title?: string | null;
  index?: number | null;
  isGroup?: boolean | null;
  printMode?: AssessmentPrintMode | "EXPANDED" | "TOTAL" | string | null;
  childAssessments?: AssessmentPrintStatusInput[] | null;
};

export type AssessmentPrintStatus = {
  isGrouped: boolean;
  printable: boolean;
  printableWeight: number;
  label: "Print column" | "Print expanded" | "Print total only" | "No print";
  warnings: string[];
};

export function normalizeAssessmentPrintMode(
  printMode?: AssessmentPrintStatusInput["printMode"],
): AssessmentPrintMode {
  return printMode === "total" || printMode === "TOTAL" ? "total" : "expanded";
}

export function getAssessmentPrintableWeight(
  assessment: AssessmentPrintStatusInput,
) {
  const children = assessment.childAssessments ?? [];
  if (assessment.isGroup || children.length > 0) {
    return sum(children.map((child) => child.percentageObtainable));
  }

  return assessment.percentageObtainable ?? 0;
}

export function getAssessmentPrintStatus(
  assessment: AssessmentPrintStatusInput,
): AssessmentPrintStatus {
  const children = assessment.childAssessments ?? [];
  const isGrouped = !!assessment.isGroup || children.length > 0;
  const printMode = normalizeAssessmentPrintMode(assessment.printMode);
  const printableWeight = getAssessmentPrintableWeight(assessment);
  const printable = printableWeight > 0;
  const warnings: string[] = [];

  if (isGrouped && !children.length) {
    warnings.push("Grouped assessments need at least one sub-assessment.");
  }

  if (!printable) {
    warnings.push(
      isGrouped
        ? "This group has no printable weight and will not appear on printed results."
        : "This assessment can be recorded but will not appear on printed results.",
    );
  }

  if (isGrouped && children.some((child) => !isPrintableAssessment(child))) {
    warnings.push(
      "Sub-assessments with 0% weight can be recorded but will not print.",
    );
  }

  return {
    isGrouped,
    printable,
    printableWeight,
    label: printable
      ? isGrouped
        ? printMode === "total"
          ? "Print total only"
          : "Print expanded"
        : "Print column"
      : "No print",
    warnings,
  };
}

export type AssessmentPrintColumn = {
  id?: number | null;
  label: string;
  weight: number;
};

export function getAssessmentPrintColumns(
  assessments: AssessmentPrintStatusInput[] = [],
): AssessmentPrintColumn[] {
  return assessments.flatMap((assessment) => {
    const status = getAssessmentPrintStatus(assessment);
    if (!status.printable) return [];

    const title = assessment.title ?? "Assessment";
    if (status.isGrouped) {
      if (normalizeAssessmentPrintMode(assessment.printMode) === "total") {
        return [
          {
            id: assessment.id,
            label: title,
            weight: status.printableWeight,
          },
        ];
      }

      return (assessment.childAssessments ?? [])
        .filter(isPrintableAssessment)
        .map((child) => ({
          id: child.id,
          label: `${title} - ${child.title ?? "Sub-assessment"}`,
          weight: child.percentageObtainable ?? 0,
        }));
    }

    return [
      {
        id: assessment.id,
        label: title,
        weight: assessment.percentageObtainable ?? 0,
      },
    ];
  });
}

export function getStudentDisplayName(
	student?: StudentTermRecord["student"],
	nameFormat?: StudentNameFormat,
) {
	return formatStudentName(student, nameFormat);
}

export function getStudentSearchKey(
	student?: StudentTermRecord["student"],
	nameFormat?: StudentNameFormat,
) {
	return getStudentDisplayName(student, nameFormat).toLowerCase();
}

export function getResultScore(
  assessment: AssessmentRecord,
  result?: AssessmentResultRecord | null,
) {
  const obtained = result?.obtained ?? null;
  if (obtained === null) return null;

  const percentageObtainable = assessment.percentageObtainable;
  if (percentageObtainable === 0) return 0;
  if (
    percentageObtainable &&
    percentageObtainable !== assessment.obtainable &&
    assessment.obtainable != null &&
    assessment.obtainable > 0
  ) {
    return (obtained / assessment.obtainable) * percentageObtainable;
  }

  return obtained;
}

function sum(values: Array<number | null | undefined>): number {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

export function filterResultSubjects<TSubject extends SubjectRecord>({
  subjects,
  selectedSubjectIds,
}: {
  subjects: TSubject[];
  selectedSubjectIds?: string[] | null;
}) {
  const selected = new Set((selectedSubjectIds ?? []).filter(Boolean));
  return subjects
    .filter((subject) => !selected.size || selected.has(subject.id))
    .map((subject) => ({
      ...subject,
      assessments: subject.assessments ?? [],
    }));
}

export function filterResultStudents<TStudent extends StudentTermRecord>({
  students,
  search,
	nameFormat,
}: {
  students: TStudent[];
  search?: string | null;
	nameFormat?: StudentNameFormat;
}) {
  const query = search?.trim().toLowerCase();
	const orderedStudents = sortResultRoster(students, nameFormat);
  if (!query) return orderedStudents;

  return orderedStudents.filter((student) =>
		getStudentSearchKey(student.student, nameFormat).includes(query),
  );
}

function getRosterGenderRank(gender?: string | null) {
  if (gender === "Male") return 0;
  if (gender === "Female") return 1;
  return 2;
}

export function sortResultRoster<TStudent extends StudentTermRecord>(
  students: TStudent[],
	nameFormat?: StudentNameFormat,
) {
  return [...students].sort((left, right) => {
    const genderDiff =
      getRosterGenderRank(left.student?.gender) -
      getRosterGenderRank(right.student?.gender);
    if (genderDiff !== 0) return genderDiff;

		return getStudentDisplayName(left.student, nameFormat).localeCompare(
			getStudentDisplayName(right.student, nameFormat),
      undefined,
      { sensitivity: "base" },
    );
  });
}

export function buildResultRows<TStudent extends StudentTermRecord>({
  subjects,
  students,
	nameFormat,
}: {
  subjects: ResultSubject[];
  students: TStudent[];
	nameFormat?: StudentNameFormat;
}) {
  const totalObtainable = subjects.reduce<number>(
    (total, subject) =>
      total +
      sum(
        subject.assessments.map(
          (assessment) =>
            assessment.percentageObtainable ?? assessment.obtainable,
        ),
      ),
    0,
  );

  return students.map((student) => {
    const subjectTotals = subjects.map((subject) => {
      const cells = subject.assessments.map((assessment) => {
        const result = assessment.assessmentResults?.find(
          (record) => record.studentTermFormId === student.id,
        );
        const obtained = result?.obtained ?? null;
        const score = getResultScore(assessment, result);

        return {
          assessment,
          result,
          obtained,
          score,
        };
      });

      return {
        subject,
        cells,
        total: sum(cells.map((cell) => cell.score)),
      };
    });

    const grandTotal = sum(subjectTotals.map((subject) => subject.total));
    const percentage =
      totalObtainable > 0
        ? +((grandTotal / totalObtainable) * 100).toFixed(1)
        : 0;

    return {
      student,
			studentName: getStudentDisplayName(student.student, nameFormat),
      subjectTotals,
      grandTotal,
      percentage,
    };
  });
}

export function getDuplicateStudentNameKeys(
	students: StudentTermRecord[],
	nameFormat?: StudentNameFormat,
) {
  const counts = new Map<string, number>();

  for (const student of students) {
		const key = getStudentSearchKey(student.student, nameFormat);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return new Set(
    Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([key]) => key),
  );
}
