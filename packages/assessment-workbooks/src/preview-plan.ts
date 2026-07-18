import type {
  AssessmentWorkbookColumnResolution,
  ParsedAssessmentWorkbook,
} from "./contracts";
import {
  classifyAssessmentScoreChange,
  type AssessmentScoreChange,
} from "./import-plan";
import { normalizeAssessmentScoreCell } from "./score-normalization";

export type AssessmentWorkbookLiveContext = {
  students: Array<{
    studentId: string;
    studentTermFormId: string;
    displayName: string;
  }>;
  subjects: Array<{
    departmentSubjectId: string;
    subjectTitle: string;
    assessments: Array<{
      id: number;
      title: string;
      obtainable: number;
      currentScores: Record<string, number | null>;
    }>;
  }>;
};

export type AssessmentWorkbookPreviewBlocker = {
  code:
    | "unresolved-column"
    | "invalid-resolution"
    | "unavailable-subject"
    | "unavailable-assessment"
    | "invalid-score"
    | "score-conflict"
    | "stale-student";
  message: string;
  columnKey?: string;
  studentTermFormId?: string;
};

export type AssessmentWorkbookPreviewChange = {
  columnKey: string;
  departmentSubjectId: string;
  subjectTitle: string;
  assessmentId: number | null;
  assessmentTitle: string;
  studentId: string;
  studentTermFormId: string;
  studentName: string;
  downloaded: number | null;
  uploaded: number;
  current: number | null;
  status: "create" | "update" | "conflict";
};

type ResolvedColumn = {
  key: string;
  departmentSubjectId: string;
  subjectTitle: string;
  assessmentId: number | null;
  assessmentTitle: string;
  obtainable: number;
  originalScores: Record<string, number | null>;
  resolution: AssessmentWorkbookColumnResolution | null;
};

export type AssessmentWorkbookPreview = {
  identity: ParsedAssessmentWorkbook["identity"];
  columns: Array<
    ResolvedColumn & {
      availableAssessments: Array<{
        id: number;
        title: string;
        obtainable: number;
      }>;
    }
  >;
  changes: AssessmentWorkbookPreviewChange[];
  blockers: AssessmentWorkbookPreviewBlocker[];
  summary: {
    blank: number;
    unchanged: number;
    create: number;
    update: number;
    conflict: number;
    invalid: number;
    stale: number;
  };
};

function blockerForChange(
  change: AssessmentScoreChange,
  columnKey: string,
  studentTermFormId: string,
): AssessmentWorkbookPreviewBlocker | null {
  if (change.status === "invalid") {
    return {
      code: "invalid-score",
      columnKey,
      studentTermFormId,
      message:
        change.reason === "above-maximum"
          ? `Score exceeds the assessment maximum of ${change.maximum}.`
          : `Score is not a supported literal number (${change.reason}).`,
    };
  }
  if (change.status === "conflict") {
    return {
      code: "score-conflict",
      columnKey,
      studentTermFormId,
      message:
        "This score changed online after the workbook was downloaded. Resolve it online and upload again.",
    };
  }
  return null;
}

export function buildAssessmentWorkbookPreview({
  workbook,
  live,
  resolutions,
}: {
  workbook: ParsedAssessmentWorkbook;
  live: AssessmentWorkbookLiveContext;
  resolutions: Record<string, AssessmentWorkbookColumnResolution>;
}): AssessmentWorkbookPreview {
  const blockers: AssessmentWorkbookPreviewBlocker[] = [];
  const liveStudents = new Map(
    live.students.map((student) => [student.studentTermFormId, student]),
  );
  const liveSubjects = new Map(
    live.subjects.map((subject) => [subject.departmentSubjectId, subject]),
  );
  const metadataStudents = new Map(
    workbook.metadata.studentRows.map((student) => [
      student.studentTermFormId,
      student,
    ]),
  );

  const resolvedColumns = new Map<string, ResolvedColumn>();
  const columns: AssessmentWorkbookPreview["columns"] =
    workbook.metadata.columns.map((column) => {
      const subject = liveSubjects.get(column.departmentSubjectId);
      const availableAssessments =
        subject?.assessments.map(({ id, title, obtainable }) => ({
          id,
          title,
          obtainable,
        })) ?? [];
      const requestedResolution = resolutions[column.key] ?? null;
      let resolved: ResolvedColumn | null = null;

      if (!subject) {
        blockers.push({
          code: "unavailable-subject",
          columnKey: column.key,
          message: `${column.subjectTitle} is no longer available in this classroom and term.`,
        });
      } else if (column.assessmentId != null) {
        const assessment = subject.assessments.find(
          (candidate) => candidate.id === column.assessmentId,
        );
        if (!assessment) {
          blockers.push({
            code: "unavailable-assessment",
            columnKey: column.key,
            message: `${column.assessmentTitle ?? "Assessment"} is no longer scoreable for ${subject.subjectTitle}.`,
          });
        } else {
          resolved = {
            key: column.key,
            departmentSubjectId: column.departmentSubjectId,
            subjectTitle: subject.subjectTitle,
            assessmentId: assessment.id,
            assessmentTitle: assessment.title,
            obtainable: assessment.obtainable,
            originalScores: column.originalScores,
            resolution: null,
          };
        }
      } else if (!requestedResolution) {
        blockers.push({
          code: "unresolved-column",
          columnKey: column.key,
          message: `Choose or create an assessment for ${subject.subjectTitle}.`,
        });
      } else if (requestedResolution.kind === "existing") {
        const assessment = subject.assessments.find(
          (candidate) => candidate.id === requestedResolution.assessmentId,
        );
        if (!assessment) {
          blockers.push({
            code: "invalid-resolution",
            columnKey: column.key,
            message: `The selected assessment is not scoreable for ${subject.subjectTitle}.`,
          });
        } else {
          resolved = {
            key: column.key,
            departmentSubjectId: column.departmentSubjectId,
            subjectTitle: subject.subjectTitle,
            assessmentId: assessment.id,
            assessmentTitle: assessment.title,
            obtainable: assessment.obtainable,
            originalScores: column.originalScores,
            resolution: requestedResolution,
          };
        }
      } else {
        resolved = {
          key: column.key,
          departmentSubjectId: column.departmentSubjectId,
          subjectTitle: subject.subjectTitle,
          assessmentId: null,
          assessmentTitle: requestedResolution.title,
          obtainable: requestedResolution.obtainable,
          originalScores: column.originalScores,
          resolution: requestedResolution,
        };
      }

      if (resolved) resolvedColumns.set(column.key, resolved);
      return {
        ...(resolved ?? {
          key: column.key,
          departmentSubjectId: column.departmentSubjectId,
          subjectTitle: column.subjectTitle,
          assessmentId: column.assessmentId,
          assessmentTitle: column.assessmentTitle ?? "Assessment",
          obtainable: column.obtainable ?? 0,
          originalScores: column.originalScores,
          resolution: requestedResolution,
        }),
        availableAssessments,
      };
    });

  const summary = {
    blank: 0,
    unchanged: 0,
    create: 0,
    update: 0,
    conflict: 0,
    invalid: 0,
    stale: 0,
  };
  const changes: AssessmentWorkbookPreviewChange[] = [];
  const stalePopulatedStudents = new Set<string>();

  for (const cell of workbook.scoreCells) {
    const student = liveStudents.get(cell.studentTermFormId);
    if (!student) {
      if (
        normalizeAssessmentScoreCell(cell.uploaded).status !== "blank" &&
        !stalePopulatedStudents.has(cell.studentTermFormId)
      ) {
        stalePopulatedStudents.add(cell.studentTermFormId);
        summary.stale += 1;
        blockers.push({
          code: "stale-student",
          studentTermFormId: cell.studentTermFormId,
          message: `${metadataStudents.get(cell.studentTermFormId)?.displayName ?? "A workbook student"} is no longer enrolled in this classroom. Clear the populated row before importing.`,
        });
      }
      continue;
    }

    const column = resolvedColumns.get(cell.columnKey);
    if (!column) continue;
    const liveSubject = liveSubjects.get(column.departmentSubjectId)!;
    const liveAssessment =
      column.assessmentId == null
        ? null
        : liveSubject.assessments.find(
            (assessment) => assessment.id === column.assessmentId,
          );
    const current =
      liveAssessment?.currentScores[cell.studentTermFormId] ?? null;
    const downloaded = column.originalScores[cell.studentTermFormId] ?? null;
    const change = classifyAssessmentScoreChange({
      downloaded,
      uploaded: cell.uploaded,
      current,
      obtainable: column.obtainable,
    });

    summary[change.status] += 1;
    const blocker = blockerForChange(
      change,
      cell.columnKey,
      cell.studentTermFormId,
    );
    if (blocker) blockers.push(blocker);

    if (
      change.status === "create" ||
      change.status === "update" ||
      change.status === "conflict"
    ) {
      changes.push({
        columnKey: cell.columnKey,
        departmentSubjectId: column.departmentSubjectId,
        subjectTitle: column.subjectTitle,
        assessmentId: column.assessmentId,
        assessmentTitle: column.assessmentTitle,
        studentId: student.studentId,
        studentTermFormId: student.studentTermFormId,
        studentName: student.displayName,
        downloaded,
        uploaded: change.status === "conflict" ? change.uploaded : change.value,
        current,
        status: change.status,
      });
    }
  }

  return {
    identity: workbook.identity,
    columns,
    changes,
    blockers,
    summary,
  };
}
