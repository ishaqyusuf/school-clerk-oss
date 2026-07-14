export type StudentImportAction =
  "import_new" | "keep_match" | "update_match_with_name" | "skip";

export type StudentImportDecision = {
  action?: StudentImportAction;
  existingStudentId?: string | null;
  touched?: boolean;
};

export type StudentImportReviewRow = {
  lineNumber?: number;
  classroomDepartmentId?: string | null;
  fullMatch?: {
    id?: string | null;
    isCurrentTermMatch?: boolean | null;
  } | null;
  suspectedMatches?: unknown[] | null;
  needsGender?: boolean | null;
  status?: string | null;
  inputGender?: string | null;
  inferredGender?: string | null;
};

export type StudentImportReviewSection = {
  key: "attention" | "matched" | "ready";
  title: string;
  rows: StudentImportReviewRow[];
  checkedRows: number;
};

export type StudentImportReviewCounts = {
  totalRows: number;
  checkedRows: number;
  executableRows: number;
  blockedCheckedRows: number;
  uncheckedRows: number;
  skippedRows: number;
  importedRows: number;
};

export type StudentImportReviewModel<
  Row extends StudentImportReviewRow = StudentImportReviewRow,
> = {
  readyRows: Row[];
  exactRows: Row[];
  suspectedRows: Row[];
  matchedRows: Row[];
  attentionRows: Row[];
  sections: Array<Omit<StudentImportReviewSection, "rows"> & { rows: Row[] }>;
  counts: StudentImportReviewCounts;
  canStartImport: boolean;
  disabledReason: string | null;
  blockedLineNumbers: number[];
};

export function isStudentImportRowChecked(
  checkedRows: Record<number, boolean>,
  lineNumber: number | undefined,
) {
  if (lineNumber == null) return false;
  return checkedRows[lineNumber] !== false;
}

export function resolveStudentImportGender(
  row: Pick<StudentImportReviewRow, "inputGender" | "inferredGender">,
  manualGender?: "Male" | "Female",
): "Male" | "Female" | null {
  const gender = manualGender || row.inferredGender || row.inputGender;

  if (gender === "Male" || gender === "M") return "Male";
  if (gender === "Female" || gender === "F") return "Female";

  return null;
}

export function getStudentImportRowClassroomDepartmentId(
  row: Pick<StudentImportReviewRow, "classroomDepartmentId" | "lineNumber">,
  fallbackClassroomDepartmentId: string,
  manualClassroomRequiredLineNumbers: Set<number> = new Set(),
) {
  if (row.classroomDepartmentId) return row.classroomDepartmentId;
  if (
    row.lineNumber != null &&
    manualClassroomRequiredLineNumbers.has(row.lineNumber)
  ) {
    return "";
  }
  return fallbackClassroomDepartmentId || "";
}

export function getStudentImportRowBlockReason({
  decision,
  fallbackClassroomDepartmentId,
  manualClassroomRequiredLineNumbers,
  manualGender,
  row,
}: {
  row: StudentImportReviewRow;
  decision?: StudentImportDecision;
  manualGender?: "Male" | "Female";
  fallbackClassroomDepartmentId: string;
  manualClassroomRequiredLineNumbers: Set<number>;
}) {
  const classroomDepartmentId = getStudentImportRowClassroomDepartmentId(
    row,
    fallbackClassroomDepartmentId,
    manualClassroomRequiredLineNumbers,
  );
  const gender = resolveStudentImportGender(row, manualGender);
  const action = decision?.action;
  const needsExisting =
    action === "keep_match" || action === "update_match_with_name";

  if (!classroomDepartmentId) return "needs_classroom" as const;
  if (!gender) return "needs_gender" as const;
  if (!action) return "needs_action" as const;
  if (isStudentImportAutoSkippedRow(row, decision)) return null;
  if (needsExisting && !decision?.existingStudentId) {
    return "needs_match" as const;
  }

  return null;
}

export function isStudentImportAutoSkippedRow(
  row: StudentImportReviewRow,
  decision?: StudentImportDecision,
) {
  return (
    decision?.action === "keep_match" &&
    Boolean(row.fullMatch?.isCurrentTermMatch)
  );
}

export function buildStudentImportReviewModel<
  Row extends StudentImportReviewRow,
>({
  checkedRows,
  fallbackClassroomDepartmentId,
  importedLineNumbers = {},
  manualClassroomRequiredLineNumbers,
  manualGenders,
  rowDecisions,
  rows,
}: {
  rows: Row[];
  checkedRows: Record<number, boolean>;
  rowDecisions: Record<number, StudentImportDecision>;
  manualGenders: Record<number, "Male" | "Female">;
  fallbackClassroomDepartmentId: string;
  manualClassroomRequiredLineNumbers: Set<number>;
  importedLineNumbers?: Record<number, boolean>;
}): StudentImportReviewModel<Row> {
  const getManualGender = (row: Row) =>
    row.lineNumber == null ? undefined : manualGenders[row.lineNumber];
  const getBlockReason = (row: Row) =>
    getStudentImportRowBlockReason({
      row,
      decision:
        row.lineNumber == null ? undefined : rowDecisions[row.lineNumber],
      manualGender: getManualGender(row),
      fallbackClassroomDepartmentId,
      manualClassroomRequiredLineNumbers,
    });
  const hasResolvedClassroom = (row: Row) =>
    Boolean(
      getStudentImportRowClassroomDepartmentId(
        row,
        fallbackClassroomDepartmentId,
        manualClassroomRequiredLineNumbers,
      ),
    );

  const attentionRows = rows.filter((row) => Boolean(getBlockReason(row)));
  const readyRows = rows.filter(
    (row) =>
      !getBlockReason(row) &&
      hasResolvedClassroom(row) &&
      !row.fullMatch &&
      getSuspectedMatchCount(row) === 0,
  );
  const exactRows = rows.filter(
    (row) =>
      !getBlockReason(row) &&
      Boolean(row.fullMatch) &&
      hasResolvedClassroom(row),
  );
  const suspectedRows = rows.filter(
    (row) =>
      !getBlockReason(row) &&
      hasResolvedClassroom(row) &&
      !row.fullMatch &&
      getSuspectedMatchCount(row) > 0,
  );
  const matchedRows = [...exactRows, ...suspectedRows];
  const counts: StudentImportReviewCounts = {
    totalRows: rows.length,
    checkedRows: 0,
    executableRows: 0,
    blockedCheckedRows: 0,
    uncheckedRows: 0,
    skippedRows: 0,
    importedRows: 0,
  };
  const blockedLineNumbers: number[] = [];

  for (const row of rows) {
    const lineNumber = row.lineNumber;
    if (lineNumber == null) continue;

    if (importedLineNumbers[lineNumber]) {
      counts.importedRows += 1;
      continue;
    }

    const checked = isStudentImportRowChecked(checkedRows, lineNumber);

    if (!checked) {
      counts.uncheckedRows += 1;
      continue;
    }

    counts.checkedRows += 1;

    const decision = rowDecisions[lineNumber];
    const blockReason = getStudentImportRowBlockReason({
      row,
      decision,
      manualGender: manualGenders[lineNumber],
      fallbackClassroomDepartmentId,
      manualClassroomRequiredLineNumbers,
    });

    if (blockReason) {
      counts.blockedCheckedRows += 1;
      blockedLineNumbers.push(lineNumber);
      continue;
    }

    if (
      decision?.action === "skip" ||
      isStudentImportAutoSkippedRow(row, decision)
    ) {
      counts.skippedRows += 1;
      continue;
    }

    counts.executableRows += 1;
  }

  const disabledReason = getStudentImportDisabledReason(
    counts,
    blockedLineNumbers,
  );

  return {
    readyRows,
    exactRows,
    suspectedRows,
    matchedRows,
    attentionRows,
    sections: [
      {
        key: "attention",
        title: "Needs attention",
        rows: attentionRows,
        checkedRows: countCheckedRows(attentionRows, checkedRows),
      },
      {
        key: "matched",
        title: "Match found",
        rows: matchedRows,
        checkedRows: countCheckedRows(matchedRows, checkedRows),
      },
      {
        key: "ready",
        title: "Ready to import",
        rows: readyRows,
        checkedRows: countCheckedRows(readyRows, checkedRows),
      },
    ],
    counts,
    canStartImport: !disabledReason,
    disabledReason,
    blockedLineNumbers,
  };
}

function countCheckedRows(
  rows: StudentImportReviewRow[],
  checkedRows: Record<number, boolean>,
) {
  return rows.filter((row) =>
    isStudentImportRowChecked(checkedRows, row.lineNumber),
  ).length;
}

function getSuspectedMatchCount(row: StudentImportReviewRow) {
  return row.suspectedMatches?.length ?? 0;
}

function getStudentImportDisabledReason(
  counts: StudentImportReviewCounts,
  blockedLineNumbers: number[],
) {
  if (counts.blockedCheckedRows > 0) {
    return `Resolve checked line${counts.blockedCheckedRows === 1 ? "" : "s"} ${blockedLineNumbers.join(", ")} before importing.`;
  }

  if (counts.executableRows === 0) {
    if (counts.skippedRows > 0) {
      return null;
    }

    return "Check at least one executable row before importing.";
  }

  return null;
}
