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
  obtainable: number;
  percentageObtainable?: number | null;
  index?: number | null;
  parentAssessment?: {
    title?: string | null;
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

export type ResultRow<TStudent extends StudentTermRecord = StudentTermRecord> = {
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

export function getStudentDisplayName(student?: StudentTermRecord["student"]) {
  return [student?.surname, student?.name, student?.otherName]
    .filter(Boolean)
    .join(" ")
    .trim();
}

export function getStudentSearchKey(student?: StudentTermRecord["student"]) {
  return getStudentDisplayName(student).toLowerCase();
}

export function getResultScore(
  assessment: AssessmentRecord,
  result?: AssessmentResultRecord | null,
) {
  const obtained = result?.obtained ?? null;
  if (obtained === null) return null;

  const percentageObtainable = assessment.percentageObtainable;
  if (
    percentageObtainable &&
    percentageObtainable !== assessment.obtainable &&
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
}: {
  students: TStudent[];
  search?: string | null;
}) {
  const query = search?.trim().toLowerCase();
  if (!query) return students;

  return students.filter((student) =>
    getStudentSearchKey(student.student).includes(query),
  );
}

export function buildResultRows<TStudent extends StudentTermRecord>({
  subjects,
  students,
}: {
  subjects: ResultSubject[];
  students: TStudent[];
}) {
  const totalObtainable = subjects.reduce<number>(
    (total, subject) =>
      total +
      sum(
        subject.assessments.map(
          (assessment) =>
            assessment.percentageObtainable || assessment.obtainable,
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
      studentName: getStudentDisplayName(student.student),
      subjectTotals,
      grandTotal,
      percentage,
    };
  });
}

export function getDuplicateStudentNameKeys(students: StudentTermRecord[]) {
  const counts = new Map<string, number>();

  for (const student of students) {
    const key = getStudentSearchKey(student.student);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return new Set(
    Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([key]) => key),
  );
}
