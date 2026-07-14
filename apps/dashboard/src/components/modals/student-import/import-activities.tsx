import { _qc, _trpc } from "@/components/static-trpc";
import { Arabic } from "@/components/arabic";
import { SubmitButton } from "@/components/submit-button";
import { studentDisplayName } from "@/utils/utils";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Alert, AlertDescription, AlertTitle } from "@school-clerk/ui/alert";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Checkbox } from "@school-clerk/ui/checkbox";
import { cn } from "@school-clerk/ui/cn";
import { ComboboxDropdown } from "@school-clerk/ui/combobox-dropdown";
import { Item, Select, Tabs } from "@school-clerk/ui/composite";
import { Progress } from "@school-clerk/ui/progress";
import { Separator } from "@school-clerk/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@school-clerk/ui/toggle-group";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  Import,
  MinusCircle,
  PencilLine,
  RefreshCw,
  Search,
  UserCheck,
  UserPlus,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  normalizeStudentImportError,
  type NormalizedStudentImportError,
} from "./import-errors";

interface Props {
  classrooms: { title: string }[];
  students: {
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
    classroomSource?: "selected" | "header" | "missing" | "ambiguous";
    classroomLabel?: string;
    classroomResolutionStatus?: "resolved" | "missing" | "ambiguous";
  }[];
  onCancelImport?: () => void;
  onStartNewImport?: () => void;
  onCloseImport?: () => void;
  onPhaseChange?: (phase: "review" | "import") => void;
}

type VerifyResult =
  RouterOutputs["students"]["verifyStudentImport"]["results"][number];
type MatchCandidate = NonNullable<VerifyResult["fullMatch"]>;
type ExistingStudent =
  RouterOutputs["students"]["studentsRecentRecord"]["students"][number];
type ClassDepartment =
  RouterOutputs["students"]["studentsRecentRecord"]["classDepartments"][number];
type ExecuteResult = RouterOutputs["students"]["executeStudentImport"];
type ExecuteRow = {
  lineNumber: number;
  name: string;
  surname: string;
  otherName: string | null;
  gender: "Male" | "Female";
  classroomDepartmentId: string;
  action: "import_new" | "keep_match" | "update_match_with_name";
  existingStudentId: string | null;
};
type ImportAction =
  "import_new" | "keep_match" | "update_match_with_name" | "skip";

type RowDecision = {
  action?: ImportAction;
  existingStudentId?: string | null;
  touched?: boolean;
};
type ClassroomBreakdown = {
  id: string;
  label: string;
  totalRows: number;
  checkedRows: number;
  executableRows: number;
  attentionRows: number;
};
type EditableNamePart = "name" | "surname" | "otherName";
type NameTokenSpan = {
  start: number;
  end: number;
};
type NameOverride = {
  name?: string;
  surname?: string;
  otherName?: string | null;
  lockedSpans?: Partial<Record<EditableNamePart, NameTokenSpan>>;
};
type NamePartOption = {
  value: string;
  as: EditableNamePart;
  start: number;
  end: number;
};
type StudentSearchItem = {
  id: string;
  label: string;
  student: ExistingStudent;
};
type BuildExecuteRowResult =
  | { status: "ready"; row: ExecuteRow }
  | { status: "skipped" }
  | { status: "invalid"; reason: string };

const EMPTY_IMPORT_ROWS: VerifyResult[] = [];
const EMPTY_LOCKED_NAME_SPANS: Partial<
  Record<EditableNamePart, NameTokenSpan>
> = {};

const actionLabels: Record<ImportAction, string> = {
  import_new: "Import new",
  keep_match: "Keep match",
  update_match_with_name: "Update match with name",
  skip: "Skip",
};

export function ImportActivity({
  students,
  onCancelImport,
  onStartNewImport,
  onCloseImport,
  onPhaseChange,
}: Props) {
  const [classroomDeptId, setClassroomDeptId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"ready" | "matched" | "attention">(
    "ready",
  );
  const [rowDecisions, setRowDecisions] = useState<Record<number, RowDecision>>(
    {},
  );
  const [manualGenders, setManualGenders] = useState<
    Record<number, "Male" | "Female">
  >({});
  const [manualClassroomDepartmentIds, setManualClassroomDepartmentIds] =
    useState<Record<number, string>>({});
  const [checkedRows, setCheckedRows] = useState<Record<number, boolean>>({});
  const [nameOverrides, setNameOverrides] = useState<
    Record<number, NameOverride>
  >({});
  const [manualMatches, setManualMatches] = useState<
    Record<number, MatchCandidate>
  >({});
  const [pendingSearchMatches, setPendingSearchMatches] = useState<
    Record<number, MatchCandidate>
  >({});
  const [pendingNameMatches, setPendingNameMatches] = useState<
    Record<number, MatchCandidate>
  >({});
  const [preSubmitError, setPreSubmitError] = useState<string | null>(null);
  const [
    lastSuccessfulVerificationReport,
    setLastSuccessfulVerificationReport,
  ] = useState<RouterOutputs["students"]["verifyStudentImport"] | null>(null);
  const [lastExecutionSkippedRows, setLastExecutionSkippedRows] = useState(0);
  const [importedLineNumbers, setImportedLineNumbers] = useState<
    Record<number, boolean>
  >({});
  const [singleRowErrors, setSingleRowErrors] = useState<
    Record<number, NormalizedStudentImportError | null>
  >({});
  const [importingLineNumber, setImportingLineNumber] = useState<number | null>(
    null,
  );

  const {
    data: records,
    refetch: refetchRecentRecords,
    isPending: isRecentRecordsPending,
  } = useQuery(_trpc.students.studentsRecentRecord.queryOptions({}));

  useEffect(() => {
    setManualClassroomDepartmentIds({});
  }, [students]);

  const manualClassroomRequiredLineNumbers = useMemo(
    () =>
      new Set(
        students
          .filter(
            (student) => student.classroomResolutionStatus === "ambiguous",
          )
          .map((student) => student.lineNumber),
      ),
    [students],
  );

  useEffect(() => {
    if (classroomDeptId) return;
    if (!records?.classDepartments?.length) return;

    const firstStudent = students[0];
    if (!firstStudent) return;

    if (firstStudent.classroomDepartmentId) {
      setClassroomDeptId(firstStudent.classroomDepartmentId);
      return;
    }

    const matched = records.classDepartments.find(
      (cd) =>
        compareArabic(cd.departmentName, firstStudent.classRoom) ||
        compareArabic(cd.classRoom.name, firstStudent.classRoom),
    );

    if (matched?.id) {
      setClassroomDeptId(matched.id);
    }
  }, [classroomDeptId, records, students]);

  const verifyInput = useMemo(() => {
    if (!students.length) return null;

    return {
      classroomDepartmentId: classroomDeptId,
      rows: students.map((student) => ({
        lineNumber: student.lineNumber,
        originalText: student.originalText,
        name: student.name,
        surname: student.surname,
        originalClassRoom: student.classRoom,
        classroomDepartmentId:
          manualClassroomDepartmentIds[student.lineNumber] ||
          student.classroomDepartmentId ||
          (student.classroomResolutionStatus === "ambiguous"
            ? null
            : classroomDeptId) ||
          null,
        otherName: student.otherName || null,
        gender:
          student.gender === "M"
            ? "Male"
            : student.gender === "F"
              ? "Female"
              : student.gender || null,
      })),
    };
  }, [classroomDeptId, manualClassroomDepartmentIds, students]);

  const {
    data: verificationReport,
    isPending: isVerifying,
    mutate: verifyStudents,
    error: verificationError,
    reset: resetVerification,
  } = useMutation(_trpc.students.verifyStudentImportBatch.mutationOptions());

  useEffect(() => {
    if (!verifyInput) return;

    resetVerification();
    verifyStudents(verifyInput);
  }, [resetVerification, verifyInput, verifyStudents]);

  const refetchVerification = () => {
    if (!verifyInput) return;

    verifyStudents(verifyInput);
  };

  useEffect(() => {
    if (verificationReport) {
      setLastSuccessfulVerificationReport(verificationReport);
    }
  }, [verificationReport]);

  const activeVerificationReport =
    verificationReport ?? lastSuccessfulVerificationReport;
  const verificationRows = activeVerificationReport?.results;
  const baseRows = verificationRows ?? EMPTY_IMPORT_ROWS;
  const rows = useMemo<VerifyResult[]>(
    () =>
      baseRows.map((row): VerifyResult => {
        const override = nameOverrides[row.lineNumber];
        const manualMatch = manualMatches[row.lineNumber];
        const editedRow: VerifyResult = {
          ...row,
          name: override?.name ?? row.name,
          surname: override?.surname ?? row.surname,
          otherName:
            override && "otherName" in override
              ? override.otherName
              : row.otherName,
        };

        if (!manualMatch) {
          return editedRow;
        }

        return {
          ...editedRow,
          fullMatch: manualMatch,
          suspectedMatches: [],
          needsGender: false,
          status: "matchFound" as const,
          inputGender: editedRow.inputGender || manualMatch.gender || null,
        };
      }),
    [baseRows, manualMatches, nameOverrides],
  );

  const readyRows = rows.filter(
    (row) =>
      row.status !== "needsAttention" &&
      Boolean(row.classroomDepartmentId) &&
      !row.fullMatch &&
      row.suspectedMatches.length === 0 &&
      !row.needsGender,
  );
  const exactRows = rows.filter(
    (row) => row.fullMatch && Boolean(row.classroomDepartmentId),
  );
  const suspectedRows = rows.filter(
    (row) =>
      Boolean(row.classroomDepartmentId) &&
      !row.fullMatch &&
      row.suspectedMatches.length > 0,
  );
  const attentionRows = rows.filter(
    (row) =>
      !row.classroomDepartmentId ||
      (!row.fullMatch &&
        row.suspectedMatches.length === 0 &&
        (row.needsGender || row.status === "needsAttention")),
  );
  const matchedCount = exactRows.length + suspectedRows.length;

  useEffect(() => {
    if (!verificationRows) return;

    const defaults: Record<number, RowDecision> = {};

    for (const row of verificationRows) {
      if (row.fullMatch) {
        defaults[row.lineNumber] = {
          action: "keep_match",
          existingStudentId: row.fullMatch.id,
          touched: false,
        };
      } else if (row.suspectedMatches.length === 0) {
        defaults[row.lineNumber] = {
          action: "import_new",
          existingStudentId: null,
          touched: false,
        };
      }
    }

    setRowDecisions(defaults);
    setManualGenders({});
    setCheckedRows(
      Object.fromEntries(verificationRows.map((row) => [row.lineNumber, true])),
    );
    setNameOverrides({});
    setManualMatches({});
    setPendingSearchMatches({});
    setPendingNameMatches({});
    setPreSubmitError(null);
    setLastExecutionSkippedRows(0);
    setSingleRowErrors({});
  }, [verificationRows]);

  useEffect(() => {
    if (activeTab === "matched" && matchedCount === 0) {
      setActiveTab(readyRows.length > 0 ? "ready" : "attention");
    }
    if (activeTab === "attention" && attentionRows.length === 0) {
      setActiveTab(matchedCount > 0 ? "matched" : "ready");
    }
  }, [activeTab, attentionRows.length, matchedCount, readyRows.length]);

  const {
    mutate: executeBatch,
    isPending: isExecutingBatch,
    data: batchResult,
    error: batchError,
    reset: resetExecuteBatch,
  } = useMutation(
    _trpc.students.executeStudentImport.mutationOptions({
      onSuccess() {
        _qc.invalidateQueries({
          queryKey: _trpc.students.index.infiniteQueryKey(),
        });
        _qc.invalidateQueries({
          queryKey: _trpc.students.analytics.queryKey(),
        });
        _qc.invalidateQueries({
          queryKey: _trpc.students.studentsRecentRecord.queryKey(),
        });
        _qc.invalidateQueries({
          queryKey: _trpc.classrooms.all.queryKey({}),
        });
      },
      meta: {
        toastTitle: {
          loading: "Executing import...",
          success: "Import executed",
          error: "Import failed",
        },
      },
    }),
  );

  const { mutate: executeSingleRow, reset: resetSingleRowMutation } =
    useMutation(
      _trpc.students.executeStudentImport.mutationOptions({
        onSuccess(result, variables) {
          _qc.invalidateQueries({
            queryKey: _trpc.students.index.infiniteQueryKey(),
          });
          _qc.invalidateQueries({
            queryKey: _trpc.students.analytics.queryKey(),
          });
          _qc.invalidateQueries({
            queryKey: _trpc.students.studentsRecentRecord.queryKey(),
          });
          _qc.invalidateQueries({
            queryKey: _trpc.classrooms.all.queryKey({}),
          });

          const inputRows =
            variables && "rows" in variables ? variables.rows : undefined;
          const lineNumber = inputRows?.[0]?.lineNumber;
          const resultRow = result.rows.find(
            (row) => row.lineNumber === lineNumber,
          );
          if (lineNumber && resultRow?.status !== "failed") {
            setImportedLineNumbers((current) => ({
              ...current,
              [lineNumber]: true,
            }));
            setCheckedRows((current) => ({
              ...current,
              [lineNumber]: false,
            }));
            setSingleRowErrors((current) => ({
              ...current,
              [lineNumber]: null,
            }));
          } else if (lineNumber) {
            setSingleRowErrors((current) => ({
              ...current,
              [lineNumber]: {
                title: "Import needs attention",
                message:
                  resultRow?.reason ||
                  "This row could not be imported. Review the row and try again.",
                diagnostics: [
                  `Operation: single-row execution`,
                  `Line: ${lineNumber}`,
                ],
                isTransportError: false,
              },
            }));
          }
          setImportingLineNumber(null);
        },
        onError(error, variables) {
          setImportingLineNumber(null);
          const inputRows =
            variables && "rows" in variables ? variables.rows : undefined;
          const lineNumber = inputRows?.[0]?.lineNumber;
          if (!lineNumber) return;
          setSingleRowErrors((current) => ({
            ...current,
            [lineNumber]: normalizeStudentImportError(
              "single-row execution",
              error,
            ),
          }));
        },
        meta: {
          toastTitle: {
            loading: "Importing row...",
            success: "Row imported",
            error: "Row import failed",
          },
        },
      }),
    );

  const setDecision = (
    lineNumber: number,
    decision: RowDecision | ((current: RowDecision) => RowDecision),
  ) => {
    setRowDecisions((current) => {
      const previous = current[lineNumber] || {};
      return {
        ...current,
        [lineNumber]:
          typeof decision === "function" ? decision(previous) : decision,
      };
    });
  };

  const setAction = (row: VerifyResult, action: ImportAction) => {
    if (action === "skip" && !getCandidates(row).length) return;
    setSingleRowErrors((current) => ({
      ...current,
      [row.lineNumber]: null,
    }));

    setDecision(row.lineNumber, (current) => {
      const needsExisting =
        action === "keep_match" || action === "update_match_with_name";
      const fallbackMatchId = row.fullMatch?.id || current.existingStudentId;

      return {
        action,
        existingStudentId: needsExisting ? fallbackMatchId || null : null,
        touched: true,
      };
    });
  };

  const setCandidate = (row: VerifyResult, candidateId: string) => {
    setSingleRowErrors((current) => ({
      ...current,
      [row.lineNumber]: null,
    }));
    setDecision(row.lineNumber, (current) => ({
      action:
        current.action === "update_match_with_name"
          ? "update_match_with_name"
          : "keep_match",
      existingStudentId: candidateId,
      touched: true,
    }));
  };

  const applyBatch = (
    target: "ready" | "exact" | "suspected",
    action: ImportAction,
  ) => {
    const targetRows =
      target === "ready"
        ? readyRows
        : target === "exact"
          ? exactRows
          : suspectedRows;

    setRowDecisions((current) => {
      const next = { ...current };

      for (const row of targetRows) {
        if (!isRowChecked(checkedRows, row.lineNumber)) continue;
        const existing = next[row.lineNumber];
        if (existing?.touched) continue;

        const needsExisting =
          action === "keep_match" || action === "update_match_with_name";

        next[row.lineNumber] = {
          action,
          existingStudentId: needsExisting ? row.fullMatch?.id || null : null,
          touched: false,
        };
      }

      return next;
    });
  };

  const setRowsChecked = (targetRows: VerifyResult[], checked: boolean) => {
    setCheckedRows((current) => {
      const next = { ...current };

      for (const row of targetRows) {
        next[row.lineNumber] = checked;
      }

      return next;
    });
  };

  const setRowChecked = (lineNumber: number, checked: boolean) => {
    setCheckedRows((current) => ({
      ...current,
      [lineNumber]: checked,
    }));
  };

  const setRowClassroom = (
    lineNumber: number,
    classroomDepartmentId: string,
  ) => {
    setManualClassroomDepartmentIds((current) => ({
      ...current,
      [lineNumber]: classroomDepartmentId,
    }));
    setPreSubmitError(null);
    setSingleRowErrors((current) => ({
      ...current,
      [lineNumber]: null,
    }));
    resetExecuteBatch();
  };

  const setNamePart = (row: VerifyResult, option: NamePartOption) => {
    const nextNames = resolveNameSelection(row, option);
    const editedRow = {
      ...row,
      name: nextNames.name ?? row.name,
      surname: nextNames.surname ?? row.surname,
      otherName: "otherName" in nextNames ? nextNames.otherName : row.otherName,
    };
    const suggestedMatch = findEditedNameMatch(
      editedRow,
      records?.students || [],
      records?.sessionTermId,
      records?.schoolSessionId,
      getRowClassroomDepartmentId(
        row,
        classroomDeptId,
        manualClassroomRequiredLineNumbers,
      ),
    );

    setNameOverrides((current) => {
      const previous = current[row.lineNumber];
      const lockedSpans = { ...(previous?.lockedSpans || {}) };

      if (option.start >= 0 && option.end > option.start) {
        lockedSpans[option.as] = { start: option.start, end: option.end };
      } else {
        delete lockedSpans[option.as];
      }

      return {
        ...current,
        [row.lineNumber]: {
          ...nextNames,
          lockedSpans,
        },
      };
    });
    setPendingNameMatches((current) => {
      const next = { ...current };

      if (suggestedMatch) {
        next[row.lineNumber] = suggestedMatch;
      } else {
        delete next[row.lineNumber];
      }

      return next;
    });
  };

  const resetNameParts = (lineNumber: number) => {
    setNameOverrides((current) => {
      const next = { ...current };
      delete next[lineNumber];
      return next;
    });
    setPendingNameMatches((current) => {
      const next = { ...current };
      delete next[lineNumber];
      return next;
    });
  };

  const selectSearchStudent = (row: VerifyResult, student: ExistingStudent) => {
    const candidate = studentToMatchCandidate(
      student,
      records?.sessionTermId,
      records?.schoolSessionId,
      getRowClassroomDepartmentId(
        row,
        classroomDeptId,
        manualClassroomRequiredLineNumbers,
      ),
    );

    setNameOverrides((current) => ({
      ...current,
      [row.lineNumber]: {
        name: student.name,
        surname: student.surname || "",
        otherName: student.otherName || null,
      },
    }));
    setPendingSearchMatches((current) => ({
      ...current,
      [row.lineNumber]: candidate,
    }));
    if (student.gender === "Male" || student.gender === "Female") {
      setManualGenders((current) => ({
        ...current,
        [row.lineNumber]: student.gender,
      }));
    }
  };

  const promoteSearchMatch = (row: VerifyResult) => {
    const candidate = pendingSearchMatches[row.lineNumber];
    if (!candidate) return;

    promoteCandidate(row.lineNumber, candidate);
  };

  const promoteNameMatch = (row: VerifyResult) => {
    const candidate = pendingNameMatches[row.lineNumber];
    if (!candidate) return;

    promoteCandidate(row.lineNumber, candidate);
  };

  const promoteCandidate = (lineNumber: number, candidate: MatchCandidate) => {
    setManualMatches((current) => ({
      ...current,
      [lineNumber]: candidate,
    }));
    setDecision(lineNumber, {
      action: "keep_match",
      existingStudentId: candidate.id,
      touched: true,
    });
    setCheckedRows((current) => ({
      ...current,
      [lineNumber]: true,
    }));
    setPendingNameMatches((current) => {
      const next = { ...current };
      delete next[lineNumber];
      return next;
    });
    setPendingSearchMatches((current) => {
      const next = { ...current };
      delete next[lineNumber];
      return next;
    });
    setActiveTab("matched");
  };

  const executeAll = () => {
    setPreSubmitError(null);

    const importRows: ExecuteRow[] = [];
    const needsDecisionLines: number[] = [];
    let skippedBeforeExecution = 0;

    for (const row of rows) {
      if (importedLineNumbers[row.lineNumber]) continue;
      if (!isRowChecked(checkedRows, row.lineNumber)) continue;
      const result = buildExecuteRow({
        row,
        decision: rowDecisions[row.lineNumber],
        manualGender: manualGenders[row.lineNumber],
        fallbackClassroomDepartmentId: classroomDeptId,
        manualClassroomRequiredLineNumbers,
      });

      if (result.status === "invalid") {
        needsDecisionLines.push(row.lineNumber);
        continue;
      }

      if (result.status === "skipped") {
        skippedBeforeExecution += 1;
        continue;
      }

      importRows.push(result.row);
    }

    if (needsDecisionLines.length > 0) {
      setPreSubmitError(
        "Lines " +
          needsDecisionLines.join(", ") +
          " need classroom, gender, an import action, or a selected match before execution.",
      );
      return;
    }

    if (!importRows.length) {
      setPreSubmitError(
        skippedBeforeExecution
          ? "All rows are marked Skip. Choose at least one row to execute."
          : "Check at least one row before executing the import.",
      );
      return;
    }

    setLastExecutionSkippedRows(skippedBeforeExecution);
    executeBatch({
      classroomDepartmentId: classroomDeptId,
      rows: importRows,
    });
  };

  const executeOne = (row: VerifyResult) => {
    resetSingleRowMutation();
    const result = buildExecuteRow({
      row,
      decision: rowDecisions[row.lineNumber],
      manualGender: manualGenders[row.lineNumber],
      fallbackClassroomDepartmentId: classroomDeptId,
      manualClassroomRequiredLineNumbers,
    });

    if (result.status !== "ready") {
      setSingleRowErrors((current) => ({
        ...current,
        [row.lineNumber]: {
          title: "Import needs attention",
          message:
            result.status === "skipped"
              ? "This row is marked Skip. Choose an import action before importing this row."
              : result.reason,
          diagnostics: [
            "Operation: single-row execution",
            `Line: ${row.lineNumber}`,
          ],
          isTransportError: false,
        },
      }));
      return;
    }

    setImportingLineNumber(row.lineNumber);
    setSingleRowErrors((current) => ({
      ...current,
      [row.lineNumber]: null,
    }));
    executeSingleRow({
      classroomDepartmentId: classroomDeptId,
      rows: [result.row],
    });
  };

  const selectedClassroom = records?.classDepartments?.find(
    (classroom) => classroom.id === classroomDeptId,
  );
  const classroomById = useMemo(
    () =>
      new Map(
        (records?.classDepartments ?? []).map((classroom) => [
          classroom.id,
          classroom,
        ]),
      ),
    [records?.classDepartments],
  );
  const selectedClassroomIds = new Set(
    rows
      .map((row) =>
        getRowClassroomDepartmentId(
          row,
          classroomDeptId,
          manualClassroomRequiredLineNumbers,
        ),
      )
      .filter(Boolean),
  );
  const classroomSummary =
    selectedClassroomIds.size > 1
      ? `${selectedClassroomIds.size} classrooms`
      : selectedClassroom
        ? `${selectedClassroom.classRoom.name} - ${selectedClassroom.departmentName}`
        : selectedClassroomIds.size === 1
          ? rows.find((row) =>
              selectedClassroomIds.has(
                getRowClassroomDepartmentId(
                  row,
                  classroomDeptId,
                  manualClassroomRequiredLineNumbers,
                ),
              ),
            )?.classRoom || "Selected classroom"
          : null;
  const classroomBreakdown = useMemo(
    () =>
      buildClassroomBreakdown({
        checkedRows,
        classroomById,
        fallbackClassroomDepartmentId: classroomDeptId,
        manualClassroomRequiredLineNumbers,
        manualGenders,
        rowDecisions,
        rows,
      }),
    [
      checkedRows,
      classroomById,
      classroomDeptId,
      manualClassroomRequiredLineNumbers,
      manualGenders,
      rowDecisions,
      rows,
    ],
  );
  let selectedRowCount = 0;
  let skippedBeforeExecution = 0;
  let executableRowCount = 0;

  for (const row of rows) {
    if (importedLineNumbers[row.lineNumber]) continue;
    if (!isRowChecked(checkedRows, row.lineNumber)) continue;

    selectedRowCount += 1;
    const result = buildExecuteRow({
      row,
      decision: rowDecisions[row.lineNumber],
      manualGender: manualGenders[row.lineNumber],
      fallbackClassroomDepartmentId: classroomDeptId,
      manualClassroomRequiredLineNumbers,
    });

    if (result.status === "skipped") {
      skippedBeforeExecution += 1;
    } else if (result.status === "ready") {
      executableRowCount += 1;
    }
  }

  const showExecutionOnly = isExecutingBatch || Boolean(batchResult);
  useEffect(() => {
    onPhaseChange?.(showExecutionOnly ? "import" : "review");
  }, [onPhaseChange, showExecutionOnly]);
  const verificationImportError = useMemo(
    () => normalizeStudentImportError("verification", verificationError),
    [verificationError],
  );
  const batchImportError = useMemo(
    () => normalizeStudentImportError("execution", batchError),
    [batchError],
  );
  const preSubmitImportError = useMemo<NormalizedStudentImportError | null>(
    () =>
      preSubmitError
        ? {
            title: "Import needs attention",
            message: preSubmitError,
            diagnostics: [],
            isTransportError: false,
          }
        : null,
    [preSubmitError],
  );
  const executionError =
    preSubmitImportError || verificationImportError || batchImportError;
  const dismissExecutionError = () => {
    setPreSubmitError(null);
    resetVerification();
    resetExecuteBatch();
  };
  const studentSearchItems = useMemo(
    () =>
      (records?.students || []).map((student) => ({
        id: student.id,
        label: [
          studentDisplayName(student),
          student.classRoom,
          student.termName,
        ]
          .filter(Boolean)
          .join(" "),
        student,
      })),
    [records?.students],
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      {!showExecutionOnly ? (
        <div className="rounded-md border bg-background">
          <div className="grid gap-3 p-3 lg:grid-cols-[minmax(16rem,24rem)_auto_minmax(0,1fr)] lg:items-end">
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Fallback Classroom
              </span>
              <Select
                value={classroomDeptId}
                onValueChange={(value) => {
                  setClassroomDeptId(value);
                }}
              >
                <Select.Trigger className="h-9 w-full bg-background">
                  <Select.Value
                    placeholder={
                      isRecentRecordsPending
                        ? "Loading classrooms..."
                        : "Fallback for rows without a class header"
                    }
                  />
                </Select.Trigger>
                <Select.Content className="max-h-60 overflow-y-auto">
                  {records?.classDepartments?.map((classroom) => (
                    <Select.Item value={classroom.id} key={classroom.id}>
                      {classroom.classRoom.name} - {classroom.departmentName}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  refetchRecentRecords();
                  refetchVerification();
                }}
                className="h-9"
                type="button"
              >
                <RefreshCw className="mr-2 size-4" />
                Refresh
              </Button>

              {onCancelImport ? (
                <Button
                  variant="ghost"
                  onClick={onCancelImport}
                  className="h-9"
                  type="button"
                  disabled={isExecutingBatch}
                >
                  Cancel Import
                </Button>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 lg:items-end">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground lg:justify-end">
                <Badge variant="secondary">{selectedRowCount} checked</Badge>
                <Badge variant="outline">{executableRowCount} executable</Badge>
                {skippedBeforeExecution > 0 ? (
                  <Badge variant="outline">
                    {skippedBeforeExecution} skipped
                  </Badge>
                ) : null}
                {attentionRows.length > 0 ? (
                  <Badge
                    variant="outline"
                    className="border-amber-300 text-amber-700"
                  >
                    <AlertTriangle className="mr-1 size-3" />
                    {attentionRows.length} attention
                  </Badge>
                ) : null}
              </div>
              <SubmitButton
                isSubmitting={isExecutingBatch}
                disabled={
                  executableRowCount === 0 ||
                  isVerifying ||
                  attentionRows.length > 0
                }
                onClick={executeAll}
                className="h-9 w-full justify-center font-medium sm:w-auto"
                type="button"
              >
                <Import className="mr-2 size-4" />
                {isExecutingBatch
                  ? "Importing..."
                  : `Execute import (${executableRowCount})`}
              </SubmitButton>
            </div>
          </div>
          {attentionRows.length > 0 ? (
            <div className="border-t bg-amber-50/60 px-3 py-2 text-[11px] font-medium text-amber-800 dark:bg-amber-950/15 dark:text-amber-200">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="size-3.5 shrink-0" />
                <span>
                  Resolve {attentionRows.length} attention row
                  {attentionRows.length === 1 ? "" : "s"} before batch
                  execution.
                </span>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {isExecutingBatch || batchResult ? (
        <ImportExecutionPanel
          classroomLabel={classroomSummary}
          classroomBreakdown={classroomBreakdown}
          pastedRowCount={rows.length || students.length}
          selectedRowCount={selectedRowCount}
          executableRowCount={executableRowCount}
          skippedBeforeExecution={
            batchResult || batchError
              ? lastExecutionSkippedRows
              : skippedBeforeExecution
          }
          isExecuting={isExecutingBatch}
          result={batchResult}
          errorMessage={null}
          onStartNewImport={onStartNewImport || onCancelImport}
          onCloseImport={onCloseImport}
        />
      ) : null}

      {!showExecutionOnly ? (
        <>
          {executionError ? (
            <ImportExecutionErrorAlert
              error={executionError}
              onDismiss={dismissExecutionError}
            />
          ) : null}

          <Separator />

          <ClassroomBreakdownStrip breakdown={classroomBreakdown} />

          {isVerifying ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 rounded-md border bg-muted/10 p-12 text-xs">
              <span className="inline-flex size-10 items-center justify-center rounded-md border bg-background text-primary">
                <RefreshCw className="size-5 animate-spin" />
              </span>
              <div className="text-center">
                <p className="font-medium text-foreground">
                  Running import analysis
                </p>
                <p className="mt-1 text-muted-foreground">
                  Checking duplicates, matches, classrooms, and missing values.
                </p>
              </div>
            </div>
          ) : (
            <Tabs.Root
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as any)}
              className="flex min-h-0 flex-1 flex-col"
            >
              <Tabs.List className="grid h-auto w-full grid-cols-1 gap-1 bg-muted/70 p-1 sm:grid-cols-3">
                <Tabs.Trigger value="ready">
                  Ready to import ({readyRows.length})
                </Tabs.Trigger>
                <Tabs.Trigger value="matched">
                  Match Found ({matchedCount})
                </Tabs.Trigger>
                <Tabs.Trigger value="attention">
                  Needs attention ({attentionRows.length})
                </Tabs.Trigger>
              </Tabs.List>

              <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
                <Tabs.Content value="ready" className="m-0 space-y-3">
                  <SectionHeader
                    title="Ready to import"
                    detail="Rows with no existing match and complete required fields."
                    action={
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <TabSelectionActions
                          rows={readyRows}
                          checkedRows={checkedRows}
                          onCheckAll={() => setRowsChecked(readyRows, true)}
                          onUncheckAll={() => setRowsChecked(readyRows, false)}
                        />
                        {readyRows.length > 0 ? (
                          <Button
                            size="sm"
                            type="button"
                            onClick={() => applyBatch("ready", "import_new")}
                          >
                            <Import className="mr-2 size-4" />
                            Import checked
                          </Button>
                        ) : null}
                      </div>
                    }
                  />
                  <RowsList
                    emptyText="No rows are currently ready to import."
                    rows={readyRows}
                    classroomOptions={records?.classDepartments ?? []}
                    rowDecisions={rowDecisions}
                    manualGenders={manualGenders}
                    checkedRows={checkedRows}
                    nameOverrides={nameOverrides}
                    pendingSearchMatches={pendingSearchMatches}
                    pendingNameMatches={pendingNameMatches}
                    studentSearchItems={studentSearchItems}
                    onCheckedChange={setRowChecked}
                    onActionChange={setAction}
                    onCandidateChange={setCandidate}
                    onNamePartChange={setNamePart}
                    onNamePartsReset={resetNameParts}
                    onSearchStudentSelect={selectSearchStudent}
                    onPromoteSearchMatch={promoteSearchMatch}
                    onPromoteNameMatch={promoteNameMatch}
                    onClassroomChange={setRowClassroom}
                    onImportRow={executeOne}
                    importedLineNumbers={importedLineNumbers}
                    importingLineNumber={importingLineNumber}
                    singleRowErrors={singleRowErrors}
                    onDismissSingleRowError={(lineNumber) =>
                      setSingleRowErrors((current) => ({
                        ...current,
                        [lineNumber]: null,
                      }))
                    }
                    onGenderChange={(lineNumber, gender) =>
                      setManualGenders((current) => ({
                        ...current,
                        [lineNumber]: gender,
                      }))
                    }
                  />
                </Tabs.Content>

                <Tabs.Content value="matched" className="m-0 space-y-4">
                  <SectionHeader
                    title="Exact Matches"
                    detail="Name and surname match an existing student. Defaults apply only to untouched rows."
                    action={
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <TabSelectionActions
                          rows={exactRows}
                          checkedRows={checkedRows}
                          onCheckAll={() => setRowsChecked(exactRows, true)}
                          onUncheckAll={() => setRowsChecked(exactRows, false)}
                        />
                        {exactRows.length > 0 ? (
                          <BatchActionSelect
                            defaultValue="keep_match"
                            onValueChange={(action) =>
                              applyBatch("exact", action)
                            }
                          />
                        ) : null}
                      </div>
                    }
                  />
                  <RowsList
                    emptyText="No exact matches found."
                    rows={exactRows}
                    classroomOptions={records?.classDepartments ?? []}
                    rowDecisions={rowDecisions}
                    manualGenders={manualGenders}
                    checkedRows={checkedRows}
                    nameOverrides={nameOverrides}
                    pendingSearchMatches={pendingSearchMatches}
                    pendingNameMatches={pendingNameMatches}
                    studentSearchItems={studentSearchItems}
                    onCheckedChange={setRowChecked}
                    onActionChange={setAction}
                    onCandidateChange={setCandidate}
                    onNamePartChange={setNamePart}
                    onNamePartsReset={resetNameParts}
                    onSearchStudentSelect={selectSearchStudent}
                    onPromoteSearchMatch={promoteSearchMatch}
                    onPromoteNameMatch={promoteNameMatch}
                    onClassroomChange={setRowClassroom}
                    onImportRow={executeOne}
                    importedLineNumbers={importedLineNumbers}
                    importingLineNumber={importingLineNumber}
                    singleRowErrors={singleRowErrors}
                    onDismissSingleRowError={(lineNumber) =>
                      setSingleRowErrors((current) => ({
                        ...current,
                        [lineNumber]: null,
                      }))
                    }
                    onGenderChange={(lineNumber, gender) =>
                      setManualGenders((current) => ({
                        ...current,
                        [lineNumber]: gender,
                      }))
                    }
                  />

                  <SectionHeader
                    title="Possible Matches"
                    detail="Suspected typo or partial-name matches. Keep/update requires a selected candidate; Import new and Skip do not."
                    action={
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <TabSelectionActions
                          rows={suspectedRows}
                          checkedRows={checkedRows}
                          onCheckAll={() => setRowsChecked(suspectedRows, true)}
                          onUncheckAll={() =>
                            setRowsChecked(suspectedRows, false)
                          }
                        />
                        {suspectedRows.length > 0 ? (
                          <BatchActionSelect
                            placeholder="Set default"
                            onValueChange={(action) =>
                              applyBatch("suspected", action)
                            }
                          />
                        ) : null}
                      </div>
                    }
                  />
                  <RowsList
                    emptyText="No possible matches found."
                    rows={suspectedRows}
                    classroomOptions={records?.classDepartments ?? []}
                    rowDecisions={rowDecisions}
                    manualGenders={manualGenders}
                    checkedRows={checkedRows}
                    nameOverrides={nameOverrides}
                    pendingSearchMatches={pendingSearchMatches}
                    pendingNameMatches={pendingNameMatches}
                    studentSearchItems={studentSearchItems}
                    onCheckedChange={setRowChecked}
                    onActionChange={setAction}
                    onCandidateChange={setCandidate}
                    onNamePartChange={setNamePart}
                    onNamePartsReset={resetNameParts}
                    onSearchStudentSelect={selectSearchStudent}
                    onPromoteSearchMatch={promoteSearchMatch}
                    onPromoteNameMatch={promoteNameMatch}
                    onClassroomChange={setRowClassroom}
                    onImportRow={executeOne}
                    importedLineNumbers={importedLineNumbers}
                    importingLineNumber={importingLineNumber}
                    singleRowErrors={singleRowErrors}
                    onDismissSingleRowError={(lineNumber) =>
                      setSingleRowErrors((current) => ({
                        ...current,
                        [lineNumber]: null,
                      }))
                    }
                    onGenderChange={(lineNumber, gender) =>
                      setManualGenders((current) => ({
                        ...current,
                        [lineNumber]: gender,
                      }))
                    }
                  />
                </Tabs.Content>

                <Tabs.Content value="attention" className="m-0 space-y-3">
                  <SectionHeader
                    title="Needs attention"
                    detail="Rows that need manual gender or another required field before import."
                    action={
                      <TabSelectionActions
                        rows={attentionRows}
                        checkedRows={checkedRows}
                        onCheckAll={() => setRowsChecked(attentionRows, true)}
                        onUncheckAll={() =>
                          setRowsChecked(attentionRows, false)
                        }
                      />
                    }
                  />
                  <RowsList
                    emptyText="No rows need manual attention."
                    rows={attentionRows}
                    classroomOptions={records?.classDepartments ?? []}
                    rowDecisions={rowDecisions}
                    manualGenders={manualGenders}
                    checkedRows={checkedRows}
                    nameOverrides={nameOverrides}
                    pendingSearchMatches={pendingSearchMatches}
                    pendingNameMatches={pendingNameMatches}
                    studentSearchItems={studentSearchItems}
                    onCheckedChange={setRowChecked}
                    onActionChange={setAction}
                    onCandidateChange={setCandidate}
                    onNamePartChange={setNamePart}
                    onNamePartsReset={resetNameParts}
                    onSearchStudentSelect={selectSearchStudent}
                    onPromoteSearchMatch={promoteSearchMatch}
                    onPromoteNameMatch={promoteNameMatch}
                    onClassroomChange={setRowClassroom}
                    onImportRow={executeOne}
                    importedLineNumbers={importedLineNumbers}
                    importingLineNumber={importingLineNumber}
                    singleRowErrors={singleRowErrors}
                    onDismissSingleRowError={(lineNumber) =>
                      setSingleRowErrors((current) => ({
                        ...current,
                        [lineNumber]: null,
                      }))
                    }
                    onGenderChange={(lineNumber, gender) =>
                      setManualGenders((current) => ({
                        ...current,
                        [lineNumber]: gender,
                      }))
                    }
                  />
                </Tabs.Content>
              </div>
            </Tabs.Root>
          )}
        </>
      ) : null}
    </div>
  );
}

function ImportExecutionErrorAlert({
  error,
  onDismiss,
}: {
  error: NormalizedStudentImportError;
  onDismiss: () => void;
}) {
  return (
    <Alert
      variant="destructive"
      className="flex items-start gap-2 rounded-md bg-red-50/70 px-3 py-2 text-xs text-red-700 dark:bg-red-950/15 dark:text-red-300"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <AlertTitle className="mb-0 font-medium">{error.title}</AlertTitle>
        <AlertDescription className="mt-0.5 text-xs text-red-700/90 dark:text-red-300/90">
          {error.message}
        </AlertDescription>
        {error.diagnostics.length ? (
          <div className="mt-2 rounded border border-red-200/80 bg-white/50 px-2 py-1 font-mono text-[10px] leading-5 text-red-800/80 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-200/80">
            {error.diagnostics.map((diagnostic) => (
              <div key={diagnostic}>{diagnostic}</div>
            ))}
          </div>
        ) : null}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 w-6 shrink-0 px-0 text-red-700 hover:bg-red-100 hover:text-red-700 dark:text-red-300 dark:hover:bg-red-950/40"
        onClick={onDismiss}
        aria-label="Dismiss import error"
      >
        <X className="size-3.5" />
      </Button>
    </Alert>
  );
}

function ImportExecutionPanel({
  classroomLabel,
  classroomBreakdown,
  pastedRowCount,
  selectedRowCount,
  executableRowCount,
  skippedBeforeExecution,
  isExecuting,
  result,
  errorMessage,
  onStartNewImport,
  onCloseImport,
}: {
  classroomLabel: string | null;
  classroomBreakdown: ClassroomBreakdown[];
  pastedRowCount: number;
  selectedRowCount: number;
  executableRowCount: number;
  skippedBeforeExecution: number;
  isExecuting: boolean;
  result?: ExecuteResult;
  errorMessage?: string | null;
  onStartNewImport?: () => void;
  onCloseImport?: () => void;
}) {
  const backendSkippedRows = result?.skippedRows ?? 0;
  const skippedRows = skippedBeforeExecution + backendSkippedRows;
  const successfulRows = result
    ? result.createdStudents + result.keptMatches + result.updatedMatches
    : 0;
  const analyzedRows = result
    ? successfulRows + result.failedRows + skippedRows
    : selectedRowCount;
  const progressValue = result
    ? analyzedRows
      ? Math.round(((successfulRows + skippedRows) / analyzedRows) * 100)
      : 100
    : isExecuting
      ? 66
      : 0;
  const failedRows =
    result?.rows.filter((row) => row.status === "failed") ?? [];
  const hasResult = Boolean(result);
  const hasError = Boolean(errorMessage) && !isExecuting;
  const hasFailures = Boolean(result?.failedRows);
  const statusIcon = isExecuting ? (
    <RefreshCw className="size-4 animate-spin" />
  ) : hasFailures || (hasError && !hasResult) ? (
    <XCircle className="size-4" />
  ) : hasResult ? (
    <CheckCircle2 className="size-4" />
  ) : (
    <FileCheck2 className="size-4" />
  );
  const statusTitle = isExecuting
    ? "Importing selected rows"
    : hasFailures
      ? "Import completed with issues"
      : hasResult
        ? "Import complete"
        : hasError
          ? "Import needs attention"
          : "Ready for import";
  const statusDetail = isExecuting
    ? "Creating students, preparing term sheets, and applying classroom fees."
    : hasResult
      ? `${successfulRows} row(s) applied, ${skippedRows} skipped, ${result?.failedRows ?? 0} failed.`
      : hasError
        ? errorMessage
        : classroomLabel
          ? `Reviewing ${selectedRowCount} of ${pastedRowCount} pasted row(s) for ${classroomLabel}.`
          : "Select a target classroom before executing the import.";

  return (
    <div
      className={cn(
        "rounded-md border bg-background text-xs",
        hasFailures || (hasError && !hasResult)
          ? "border-red-200 dark:border-red-900/70"
          : hasResult
            ? "border-green-200 dark:border-green-900/70"
            : "border-border",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 p-3">
        <div className="flex min-w-0 items-start gap-2">
          <span
            className={cn(
              "mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted/30",
              hasFailures || (hasError && !hasResult)
                ? "border-red-200 text-red-600 dark:border-red-900"
                : hasResult
                  ? "border-green-200 text-green-600 dark:border-green-900"
                  : "text-muted-foreground",
            )}
          >
            {statusIcon}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-foreground">{statusTitle}</h3>
              {classroomLabel ? (
                <Badge variant="outline" className="bg-background">
                  <Arabic>{classroomLabel}</Arabic>
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-muted-foreground">{statusDetail}</p>
          </div>
        </div>

        <Badge
          variant={hasResult && !hasFailures ? "success" : "outline"}
          className={cn(
            "bg-background",
            hasFailures || (hasError && !hasResult)
              ? "border-red-200 text-red-600 dark:border-red-900"
              : "",
          )}
        >
          {isExecuting
            ? "Working"
            : hasResult
              ? hasFailures
                ? "Partial"
                : "Success"
              : `${executableRowCount} executable`}
        </Badge>
      </div>

      <div className="border-t px-3 py-2">
        <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>Import analysis</span>
          <span>
            {hasResult
              ? `${progressValue}% clean`
              : `${selectedRowCount} checked · ${skippedBeforeExecution} skipped`}
          </span>
        </div>
        <Progress
          value={progressValue}
          className={cn("h-2", !hasResult && !isExecuting && "opacity-40")}
        />
      </div>

      <ClassroomBreakdownStrip breakdown={classroomBreakdown} compact />

      <div className="grid gap-2 border-t bg-muted/10 p-3 sm:grid-cols-2 lg:grid-cols-3">
        <ImportStat
          icon={<UserPlus className="size-4" />}
          label="New created"
          value={
            hasResult ? (result?.createdStudents ?? 0) : executableRowCount
          }
          detail={hasResult ? "student records" : "rows to import"}
          tone="success"
        />
        <ImportStat
          icon={<FileCheck2 className="size-4" />}
          label="Term sheets"
          value={hasResult ? (result?.termSheetsCreated ?? 0) : "-"}
          detail="created"
          tone="info"
        />
        <ImportStat
          icon={<UserCheck className="size-4" />}
          label="Names unchanged"
          value={hasResult ? (result?.keptMatches ?? 0) : "-"}
          detail="students kept"
          tone="neutral"
        />
        <ImportStat
          icon={<PencilLine className="size-4" />}
          label="Names updated"
          value={hasResult ? (result?.updatedMatches ?? 0) : "-"}
          detail="matched records"
          tone="warning"
        />
        <ImportStat
          icon={<MinusCircle className="size-4" />}
          label="Skipped"
          value={skippedRows}
          detail="not executed"
          tone="neutral"
        />
        <ImportStat
          icon={<AlertCircle className="size-4" />}
          label="Errors"
          value={hasResult ? (result?.failedRows ?? 0) : hasError ? 1 : 0}
          detail="need review"
          tone={hasFailures || (hasError && !hasResult) ? "danger" : "neutral"}
        />
      </div>

      {hasError && !hasResult ? (
        <div className="border-t bg-red-50/70 px-3 py-2 text-red-700 dark:bg-red-950/15 dark:text-red-300">
          {errorMessage}
        </div>
      ) : null}

      {failedRows.length > 0 ? (
        <div className="border-t bg-red-50/70 px-3 py-2 dark:bg-red-950/15">
          <div className="mb-1 font-medium text-red-700 dark:text-red-300">
            Failed row analysis
          </div>
          <div className="space-y-1 text-red-700 dark:text-red-300">
            {failedRows.map((row) => (
              <div
                key={row.lineNumber}
                className="flex flex-wrap items-center gap-2"
              >
                <Badge
                  variant="outline"
                  className="border-red-200 bg-background text-red-600 dark:border-red-900"
                >
                  Line {row.lineNumber}
                </Badge>
                <span>{row.reason || "Unknown import error"}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {hasResult ? (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t bg-muted/10 p-3">
          {onStartNewImport ? (
            <Button type="button" variant="outline" onClick={onStartNewImport}>
              Start new import
            </Button>
          ) : null}
          {onCloseImport ? (
            <Button type="button" onClick={onCloseImport}>
              Close
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ClassroomBreakdownStrip({
  breakdown,
  compact = false,
}: {
  breakdown: ClassroomBreakdown[];
  compact?: boolean;
}) {
  if (!breakdown.length) return null;

  return (
    <div
      className={cn(
        "border-t bg-muted/10 px-3 py-2 text-xs",
        compact ? "space-y-1.5" : "rounded-md border bg-background",
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-medium text-foreground">Classroom scope</span>
        <span className="text-[11px] text-muted-foreground">
          {breakdown.length} classroom{breakdown.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {breakdown.map((item) => (
          <Badge
            key={item.id}
            variant={item.attentionRows > 0 ? "outline" : "secondary"}
            className={cn(
              "h-auto max-w-full justify-start gap-1 bg-background px-2 py-1 text-[11px]",
              item.attentionRows > 0 &&
                "border-amber-300 text-amber-700 dark:border-amber-900 dark:text-amber-300",
            )}
          >
            <Arabic>{item.label}</Arabic>
            <span className="text-muted-foreground">
              {item.totalRows} rows · {item.checkedRows} checked ·{" "}
              {item.executableRows} executable
              {item.attentionRows > 0
                ? ` · ${item.attentionRows} attention`
                : ""}
            </span>
          </Badge>
        ))}
      </div>
    </div>
  );
}

function ImportStat({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  detail: string;
  tone: "success" | "info" | "warning" | "danger" | "neutral";
}) {
  return (
    <div className="min-w-0 rounded-md border bg-background p-3">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <span
          className={cn(
            "inline-flex size-6 shrink-0 items-center justify-center rounded-md border bg-muted/20",
            tone === "success" && "border-green-200 text-green-600",
            tone === "info" && "border-blue-200 text-blue-600",
            tone === "warning" && "border-amber-200 text-amber-600",
            tone === "danger" && "border-red-200 text-red-600",
          )}
        >
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </div>
      <div className="text-lg font-semibold leading-none text-foreground">
        {value}
      </div>
      <div className="mt-1 truncate text-[11px] text-muted-foreground">
        {detail}
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
      <div>
        <h3 className="text-sm font-semibold leading-tight">{title}</h3>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      {action}
    </div>
  );
}

function BatchActionSelect({
  defaultValue,
  placeholder = "Default action",
  onValueChange,
}: {
  defaultValue?: ImportAction;
  placeholder?: string;
  onValueChange: (action: ImportAction) => void;
}) {
  return (
    <Select
      defaultValue={defaultValue}
      onValueChange={(value) => onValueChange(value as ImportAction)}
    >
      <Select.Trigger className="h-8 w-48 bg-background text-xs">
        <Select.Value placeholder={placeholder} />
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="keep_match">Keep match</Select.Item>
        <Select.Item value="update_match_with_name">
          Update match with name
        </Select.Item>
        <Select.Item value="import_new">Import new</Select.Item>
        <Select.Item value="skip">Skip</Select.Item>
      </Select.Content>
    </Select>
  );
}

function TabSelectionActions({
  rows,
  checkedRows,
  onCheckAll,
  onUncheckAll,
}: {
  rows: VerifyResult[];
  checkedRows: Record<number, boolean>;
  onCheckAll: () => void;
  onUncheckAll: () => void;
}) {
  if (!rows.length) return null;

  const checkedCount = rows.filter((row) =>
    isRowChecked(checkedRows, row.lineNumber),
  ).length;

  return (
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span>
        {checkedCount}/{rows.length} checked
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-[11px]"
        type="button"
        onClick={onCheckAll}
      >
        Check all
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-[11px]"
        type="button"
        onClick={onUncheckAll}
      >
        Uncheck
      </Button>
    </div>
  );
}

function RowsList({
  emptyText,
  rows,
  classroomOptions,
  rowDecisions,
  manualGenders,
  checkedRows,
  nameOverrides,
  pendingSearchMatches,
  pendingNameMatches,
  studentSearchItems,
  onCheckedChange,
  onActionChange,
  onCandidateChange,
  onNamePartChange,
  onNamePartsReset,
  onSearchStudentSelect,
  onPromoteSearchMatch,
  onPromoteNameMatch,
  onClassroomChange,
  onImportRow,
  importedLineNumbers,
  importingLineNumber,
  singleRowErrors,
  onDismissSingleRowError,
  onGenderChange,
}: {
  emptyText: string;
  rows: VerifyResult[];
  classroomOptions: ClassDepartment[];
  rowDecisions: Record<number, RowDecision>;
  manualGenders: Record<number, "Male" | "Female">;
  checkedRows: Record<number, boolean>;
  nameOverrides: Record<number, NameOverride>;
  pendingSearchMatches: Record<number, MatchCandidate>;
  pendingNameMatches: Record<number, MatchCandidate>;
  studentSearchItems: StudentSearchItem[];
  onCheckedChange: (lineNumber: number, checked: boolean) => void;
  onActionChange: (row: VerifyResult, action: ImportAction) => void;
  onCandidateChange: (row: VerifyResult, candidateId: string) => void;
  onNamePartChange: (row: VerifyResult, option: NamePartOption) => void;
  onNamePartsReset: (lineNumber: number) => void;
  onSearchStudentSelect: (row: VerifyResult, student: ExistingStudent) => void;
  onPromoteSearchMatch: (row: VerifyResult) => void;
  onPromoteNameMatch: (row: VerifyResult) => void;
  onClassroomChange: (
    lineNumber: number,
    classroomDepartmentId: string,
  ) => void;
  onImportRow: (row: VerifyResult) => void;
  importedLineNumbers: Record<number, boolean>;
  importingLineNumber: number | null;
  singleRowErrors: Record<number, NormalizedStudentImportError | null>;
  onDismissSingleRowError: (lineNumber: number) => void;
  onGenderChange: (lineNumber: number, gender: "Male" | "Female") => void;
}) {
  if (!rows.length) {
    return (
      <div className="rounded-md border border-dashed bg-muted/10 p-8 text-center text-xs text-muted-foreground">
        <div className="mx-auto mb-2 flex size-8 items-center justify-center rounded-md border bg-background">
          <CheckCircle2 className="size-4" />
        </div>
        <p>{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <RowCard
          key={row.lineNumber}
          row={row}
          classroomOptions={classroomOptions}
          decision={rowDecisions[row.lineNumber]}
          manualGender={manualGenders[row.lineNumber]}
          checked={isRowChecked(checkedRows, row.lineNumber)}
          isNameDirty={Boolean(nameOverrides[row.lineNumber])}
          lockedNameSpans={
            nameOverrides[row.lineNumber]?.lockedSpans ||
            EMPTY_LOCKED_NAME_SPANS
          }
          pendingSearchMatch={pendingSearchMatches[row.lineNumber]}
          pendingNameMatch={pendingNameMatches[row.lineNumber]}
          studentSearchItems={studentSearchItems}
          onCheckedChange={onCheckedChange}
          onActionChange={onActionChange}
          onCandidateChange={onCandidateChange}
          onNamePartChange={onNamePartChange}
          onNamePartsReset={onNamePartsReset}
          onSearchStudentSelect={onSearchStudentSelect}
          onPromoteSearchMatch={onPromoteSearchMatch}
          onPromoteNameMatch={onPromoteNameMatch}
          onClassroomChange={onClassroomChange}
          onImportRow={onImportRow}
          imported={Boolean(importedLineNumbers[row.lineNumber])}
          importing={importingLineNumber === row.lineNumber}
          singleRowError={singleRowErrors[row.lineNumber] ?? null}
          onDismissSingleRowError={onDismissSingleRowError}
          onGenderChange={onGenderChange}
        />
      ))}
    </div>
  );
}

function RowCard({
  row,
  classroomOptions,
  decision,
  manualGender,
  checked,
  isNameDirty,
  lockedNameSpans,
  pendingSearchMatch,
  pendingNameMatch,
  studentSearchItems,
  onCheckedChange,
  onActionChange,
  onCandidateChange,
  onNamePartChange,
  onNamePartsReset,
  onSearchStudentSelect,
  onPromoteSearchMatch,
  onPromoteNameMatch,
  onClassroomChange,
  onImportRow,
  imported,
  importing,
  singleRowError,
  onDismissSingleRowError,
  onGenderChange,
}: {
  row: VerifyResult;
  classroomOptions: ClassDepartment[];
  decision?: RowDecision;
  manualGender?: "Male" | "Female";
  checked: boolean;
  isNameDirty: boolean;
  lockedNameSpans: Partial<Record<EditableNamePart, NameTokenSpan>>;
  pendingSearchMatch?: MatchCandidate;
  pendingNameMatch?: MatchCandidate;
  studentSearchItems: StudentSearchItem[];
  onCheckedChange: (lineNumber: number, checked: boolean) => void;
  onActionChange: (row: VerifyResult, action: ImportAction) => void;
  onCandidateChange: (row: VerifyResult, candidateId: string) => void;
  onNamePartChange: (row: VerifyResult, option: NamePartOption) => void;
  onNamePartsReset: (lineNumber: number) => void;
  onSearchStudentSelect: (row: VerifyResult, student: ExistingStudent) => void;
  onPromoteSearchMatch: (row: VerifyResult) => void;
  onPromoteNameMatch: (row: VerifyResult) => void;
  onClassroomChange: (
    lineNumber: number,
    classroomDepartmentId: string,
  ) => void;
  onImportRow: (row: VerifyResult) => void;
  imported: boolean;
  importing: boolean;
  singleRowError: NormalizedStudentImportError | null;
  onDismissSingleRowError: (lineNumber: number) => void;
  onGenderChange: (lineNumber: number, gender: "Male" | "Female") => void;
}) {
  const [showSearch, setShowSearch] = useState(false);
  const candidates = useMemo(() => getCandidates(row), [row]);
  const possibleNames = useMemo(
    () => getPossibleNamePartOptions(row, isNameDirty, lockedNameSpans),
    [isNameDirty, lockedNameSpans, row],
  );
  const action = decision?.action;
  const resolvedGender = resolveGender(row, manualGender);
  const needsExistingMatch =
    (action === "keep_match" || action === "update_match_with_name") &&
    !decision?.existingStudentId;
  const needsResolution = !action;
  const needsGender = !resolvedGender;
  const needsClassroom = !row.classroomDepartmentId;
  const isBlocked =
    !imported &&
    (needsGender || needsClassroom || needsResolution || needsExistingMatch);
  const matchKind = row.fullMatch
    ? "Exact match"
    : row.suspectedMatches.length > 0
      ? "Possible match"
      : "No match";
  const statusLabel = imported
    ? "Imported"
    : isBlocked
      ? "Action required"
      : "Ready";
  const parsedDisplayName = [row.name, row.surname, row.otherName]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border bg-background text-xs",
        isBlocked
          ? "border-amber-200 bg-amber-50/30 dark:border-amber-900/60 dark:bg-amber-950/10"
          : "border-border",
      )}
    >
      <div className="grid gap-2 border-b bg-muted/10 px-3 py-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Checkbox
            checked={checked}
            onCheckedChange={(value) =>
              onCheckedChange(row.lineNumber, value === true)
            }
            aria-label={`Include line ${row.lineNumber} in import`}
            className="bg-background"
          />
          <Badge variant="outline" className="bg-background">
            Line {row.lineNumber}
          </Badge>
          <Badge
            variant={
              row.fullMatch
                ? "success"
                : row.suspectedMatches.length
                  ? "warning"
                  : "secondary"
            }
          >
            {matchKind}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "bg-background",
              isBlocked
                ? "border-amber-300 text-amber-700 dark:text-amber-300"
                : "border-green-200 text-green-700 dark:text-green-300",
            )}
          >
            {imported ? (
              <CheckCircle2 className="mr-1 size-3.5" />
            ) : isBlocked ? (
              <AlertCircle className="mr-1 size-3.5" />
            ) : (
              <CheckCircle2 className="mr-1 size-3.5" />
            )}
            {statusLabel}
          </Badge>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-muted-foreground lg:justify-end">
          {resolvedGender ? (
            <Badge variant="outline" className="bg-background">
              Gender: {resolvedGender}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-amber-300 bg-background text-amber-700 dark:text-amber-300"
            >
              <AlertTriangle className="mr-1 size-3.5" />
              Gender missing
            </Badge>
          )}
          {row.classRoom ? (
            <Badge variant="outline" className="max-w-full bg-background">
              <Arabic className="truncate">{row.classRoom}</Arabic>
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-amber-300 bg-background text-amber-700 dark:text-amber-300"
            >
              <AlertTriangle className="mr-1 size-3.5" />
              Classroom missing
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
        <div className="min-w-0 space-y-3">
          <div className="space-y-2">
            <div className="rounded-md border bg-muted/10 px-3 py-2">
              <Arabic className="block truncate text-sm font-semibold text-foreground">
                {parsedDisplayName || "Unnamed student"}
              </Arabic>
            </div>
            <div className="grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(8rem,1fr))]">
              <NamePartControl
                label="Name"
                part="name"
                value={row.name}
                options={possibleNames}
                isDirty={isNameDirty}
                onReset={() => onNamePartsReset(row.lineNumber)}
                onValueChange={(option) => onNamePartChange(row, option)}
              />
              <NamePartControl
                label="Surname"
                part="surname"
                value={row.surname}
                options={possibleNames}
                isDirty={isNameDirty}
                onReset={() => onNamePartsReset(row.lineNumber)}
                onValueChange={(option) => onNamePartChange(row, option)}
              />
              <NamePartControl
                label="Other"
                part="otherName"
                value={row.otherName || "None"}
                options={possibleNames}
                isDirty={isNameDirty}
                onReset={() => onNamePartsReset(row.lineNumber)}
                onValueChange={(option) => onNamePartChange(row, option)}
              />
            </div>
            {row.inferredGender ? (
              <p className="text-[11px] text-muted-foreground">
                Gender inferred from existing names
                {row.genderInferenceDetails
                  ? ` (${row.genderInferenceDetails.confidence}%, ${row.genderInferenceDetails.sampleSize} samples)`
                  : ""}
              </p>
            ) : null}
            {pendingNameMatch && !row.fullMatch ? (
              <NameEditMatchSuggestion
                candidate={pendingNameMatch}
                onApprove={() => onPromoteNameMatch(row)}
              />
            ) : null}
          </div>
        </div>

        <div className="grid content-start gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <Button
            type="button"
            variant={showSearch ? "secondary" : "outline"}
            size="sm"
            className="h-8 w-full justify-center px-2"
            onClick={() => setShowSearch((current) => !current)}
            aria-label={`Search existing students for line ${row.lineNumber}`}
          >
            <Search className="mr-2 size-4" />
            Search
          </Button>

          <ClassroomSelect
            className="w-full"
            options={classroomOptions}
            value={row.classroomDepartmentId || ""}
            onValueChange={(classroomDepartmentId) =>
              onClassroomChange(row.lineNumber, classroomDepartmentId)
            }
          />

          {needsGender ? (
            <GenderToggle
              value={manualGender}
              onValueChange={(gender) => onGenderChange(row.lineNumber, gender)}
            />
          ) : null}

          <Select
            value={action || ""}
            onValueChange={(value) =>
              onActionChange(row, value as ImportAction)
            }
            disabled={imported || importing}
          >
            <Select.Trigger className="h-8 w-full bg-background text-xs">
              <Select.Value placeholder="Select action" />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="import_new">Import new</Select.Item>
              <Select.Item value="keep_match" disabled={!candidates.length}>
                Keep match
              </Select.Item>
              <Select.Item
                value="update_match_with_name"
                disabled={!candidates.length}
              >
                Update match with name
              </Select.Item>
              <Select.Item value="skip" disabled={!candidates.length}>
                Skip
              </Select.Item>
            </Select.Content>
          </Select>

          <Button
            type="button"
            size="sm"
            variant={imported ? "secondary" : "default"}
            className="h-8 w-full"
            disabled={imported || importing}
            onClick={() => onImportRow(row)}
          >
            {importing ? (
              <RefreshCw className="mr-2 size-3.5 animate-spin" />
            ) : imported ? (
              <CheckCircle2 className="mr-2 size-3.5" />
            ) : (
              <Import className="mr-2 size-3.5" />
            )}
            {importing ? "Importing..." : imported ? "Imported" : "Import row"}
          </Button>
        </div>
      </div>

      {singleRowError ? (
        <div className="border-t px-3 py-2">
          <ImportExecutionErrorAlert
            error={singleRowError}
            onDismiss={() => onDismissSingleRowError(row.lineNumber)}
          />
        </div>
      ) : null}

      {showSearch ? (
        <StudentSearchPanel
          row={row}
          items={studentSearchItems}
          pendingMatch={pendingSearchMatch}
          onSelect={(student) => onSearchStudentSelect(row, student)}
          onPromote={() => onPromoteSearchMatch(row)}
        />
      ) : null}

      {candidates.length > 0 ? (
        <div className="border-t bg-muted/10 px-3 py-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Match candidates
            </span>
            {needsExistingMatch ? (
              <span className="text-[11px] font-medium text-red-600">
                Select a candidate for {actionLabels[action!]}
              </span>
            ) : null}
          </div>
          <div className="grid gap-2">
            {candidates.map((candidate) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                selected={decision?.existingStudentId === candidate.id}
                onSelect={() => onCandidateChange(row, candidate.id)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NamePartControl({
  label,
  part,
  value,
  options,
  isDirty,
  onReset,
  onValueChange,
}: {
  label: string;
  part: EditableNamePart;
  value: string;
  options: NamePartOption[];
  isDirty: boolean;
  onReset: () => void;
  onValueChange: (option: NamePartOption) => void;
}) {
  const selectOptions = dedupeNamePartOptions([
    ...options.filter((option) => option.as === part),
    { value, as: part, start: -1, end: -1 },
  ]);

  return (
    <div className="min-w-[10rem] rounded-md border bg-background px-2.5 py-2">
      <div className="mb-1 flex min-w-0 items-center justify-between gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="truncate">{label}</span>
        {isDirty ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-5 w-5 px-0"
            onClick={onReset}
            aria-label={`Reset ${label.toLowerCase()} split`}
          >
            <X className="size-3" />
          </Button>
        ) : null}
      </div>
      <Select
        value={value}
        onValueChange={(nextValue) => {
          const option = selectOptions.find((item) => item.value === nextValue);
          if (option) onValueChange(option);
        }}
      >
        <Select.Trigger className="h-7 min-w-0 border-0 bg-transparent p-0 text-left text-sm font-medium shadow-none focus:ring-0">
          <Select.Value placeholder={value} />
        </Select.Trigger>
        <Select.Content className="max-h-64 overflow-y-auto">
          {selectOptions.map((option) => (
            <Select.Item
              key={`${label}-${option.value}-${option.start}-${option.end}`}
              value={option.value}
            >
              <Arabic>{option.value}</Arabic>
            </Select.Item>
          ))}
        </Select.Content>
      </Select>
    </div>
  );
}

function NameEditMatchSuggestion({
  candidate,
  onApprove,
}: {
  candidate: MatchCandidate;
  onApprove: () => void;
}) {
  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Match after name edit
        </span>
        <Button type="button" size="sm" className="h-8" onClick={onApprove}>
          Approve match
        </Button>
      </div>
      <CandidateCard
        candidate={candidate}
        selected={false}
        onSelect={onApprove}
      />
    </div>
  );
}

function StudentSearchPanel({
  row,
  items,
  pendingMatch,
  onSelect,
  onPromote,
}: {
  row: VerifyResult;
  items: StudentSearchItem[];
  pendingMatch?: MatchCandidate;
  onSelect: (student: ExistingStudent) => void;
  onPromote: () => void;
}) {
  const [searchValue, setSearchValue] = useState("");
  const selectedItem = pendingMatch
    ? items.find((item) => item.id === pendingMatch.id)
    : undefined;
  const recommendedItems = useMemo(
    () => getRecommendedStudentItems(row, items),
    [items, row],
  );
  const displayItems = searchValue.trim() ? items : recommendedItems;

  return (
    <div className="border-t bg-muted/10 px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Search existing students
        </span>
        <span className="text-[11px] text-muted-foreground">
          Line {row.lineNumber}
        </span>
      </div>
      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
        <ComboboxDropdown
          items={displayItems}
          selectedItem={selectedItem}
          placeholder="Recommended students"
          searchPlaceholder="Search by student name..."
          emptyResults="No matching student found"
          popoverProps={{ className: "w-[320px] max-w-[calc(100vw-2rem)] p-0" }}
          onSearch={setSearchValue}
          renderSelectedItem={(item) => (
            <Arabic className="truncate">
              {studentDisplayName(item.student)}
            </Arabic>
          )}
          renderListItem={({ item, isChecked }) => (
            <div className="flex w-full items-center justify-between gap-3">
              <div className="min-w-0">
                <Arabic className="block truncate font-medium">
                  {studentDisplayName(item.student)}
                </Arabic>
                <Arabic className="block truncate text-[11px] text-muted-foreground">
                  {item.student.classRoom || "No classroom"} ·{" "}
                  {item.student.termName || "No current term"}
                </Arabic>
              </div>
              {isChecked ? (
                <CheckCircle2 className="size-4 shrink-0 text-green-600" />
              ) : null}
            </div>
          )}
          onSelect={(item) => onSelect(item.student)}
        />
        {pendingMatch ? (
          <Button type="button" size="sm" className="h-9" onClick={onPromote}>
            Move to match found
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ClassroomSelect({
  className,
  options,
  value,
  onValueChange,
}: {
  className?: string;
  options: ClassDepartment[];
  value: string;
  onValueChange: (classroomDepartmentId: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <Select.Trigger className={cn("h-8 bg-background text-xs", className)}>
        <Select.Value placeholder="Assign classroom" />
      </Select.Trigger>
      <Select.Content className="max-h-72 overflow-y-auto">
        {options.map((classroom) => (
          <Select.Item key={classroom.id} value={classroom.id}>
            <Arabic>{getClassDepartmentDisplayName(classroom)}</Arabic>
          </Select.Item>
        ))}
      </Select.Content>
    </Select>
  );
}

function GenderToggle({
  value,
  onValueChange,
}: {
  value?: "Male" | "Female";
  onValueChange: (gender: "Male" | "Female") => void;
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={value || ""}
      onValueChange={(nextValue) => {
        if (nextValue === "Male" || nextValue === "Female") {
          onValueChange(nextValue);
        }
      }}
      className="grid w-full grid-cols-2 justify-start"
    >
      <ToggleGroupItem
        value="Male"
        aria-label="Set row gender to Male"
        className="h-8 min-w-0 bg-background"
      >
        M
      </ToggleGroupItem>
      <ToggleGroupItem
        value="Female"
        aria-label="Set row gender to Female"
        className="h-8 min-w-0 bg-background"
      >
        F
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

function getClassDepartmentDisplayName(classroom: ClassDepartment) {
  const className = classroom.classRoom?.name?.trim();
  const departmentName = classroom.departmentName?.trim();

  if (className && departmentName && className !== departmentName) {
    return `${className} - ${departmentName}`;
  }

  return departmentName || className || "Classroom";
}

function CandidateCard({
  candidate,
  selected,
  onSelect,
}: {
  candidate: MatchCandidate;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Item
      asChild
      variant="outline"
      size="sm"
      className={cn(
        "w-full cursor-pointer bg-background text-left hover:bg-muted/50",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border",
      )}
    >
      <button type="button" onClick={onSelect} aria-pressed={selected}>
        <Item.Media>
          <span
            className={cn(
              "flex size-4 shrink-0 items-center justify-center rounded-full border",
              selected ? "border-primary" : "border-muted-foreground",
            )}
          >
            {selected ? (
              <span className="size-2 rounded-full bg-primary" />
            ) : null}
          </span>
        </Item.Media>
        <Item.Content className="min-w-0">
          <Item.Title>
            <Arabic className="truncate">
              {studentDisplayName(candidate)}
            </Arabic>
          </Item.Title>
          <Item.Description className="text-xs">
            <Arabic>Class: {candidate.classRoom || "No classroom"}</Arabic>
          </Item.Description>
        </Item.Content>
        <Item.Actions className="flex-wrap justify-start sm:justify-end">
          <Badge variant={candidate.confidence === 100 ? "success" : "warning"}>
            {candidate.confidence}% confidence
          </Badge>
          <Badge
            variant={candidate.isCurrentTermMatch ? "success" : "outline"}
            className={cn(
              "whitespace-nowrap",
              !candidate.isCurrentTermMatch &&
                "border-red-200 text-red-600 dark:border-red-900",
            )}
          >
            {candidate.isCurrentTermMatch
              ? "Term sheet exists"
              : "No current term sheet"}
          </Badge>
          <Badge
            variant={candidate.isCurrentClassroomMatch ? "success" : "outline"}
            className={cn(
              "whitespace-nowrap",
              !candidate.isCurrentClassroomMatch &&
                "border-red-200 text-red-600 dark:border-red-900",
            )}
          >
            {candidate.isCurrentClassroomMatch
              ? "Same classroom"
              : "Different class"}
          </Badge>
        </Item.Actions>
      </button>
    </Item>
  );
}

function isRowChecked(
  checkedRows: Record<number, boolean>,
  lineNumber: number,
) {
  return checkedRows[lineNumber] !== false;
}

function getRowClassroomDepartmentId(
  row: Pick<VerifyResult, "classroomDepartmentId" | "lineNumber">,
  fallbackClassroomDepartmentId: string,
  manualClassroomRequiredLineNumbers: Set<number> = new Set(),
) {
  if (row.classroomDepartmentId) return row.classroomDepartmentId;
  if (manualClassroomRequiredLineNumbers.has(row.lineNumber)) return "";
  return fallbackClassroomDepartmentId || "";
}

function buildExecuteRow({
  row,
  decision,
  manualGender,
  fallbackClassroomDepartmentId,
  manualClassroomRequiredLineNumbers,
}: {
  row: VerifyResult;
  decision?: RowDecision;
  manualGender?: "Male" | "Female";
  fallbackClassroomDepartmentId: string;
  manualClassroomRequiredLineNumbers: Set<number>;
}): BuildExecuteRowResult {
  const action = decision?.action;
  const gender = resolveGender(row, manualGender);
  const rowClassroomDepartmentId = getRowClassroomDepartmentId(
    row,
    fallbackClassroomDepartmentId,
    manualClassroomRequiredLineNumbers,
  );
  const needsExisting =
    action === "keep_match" || action === "update_match_with_name";

  if (!rowClassroomDepartmentId) {
    return {
      status: "invalid",
      reason: `Line ${row.lineNumber} needs a classroom before import.`,
    };
  }

  if (!gender) {
    return {
      status: "invalid",
      reason: `Line ${row.lineNumber} needs a gender before import.`,
    };
  }

  if (!action) {
    return {
      status: "invalid",
      reason: `Line ${row.lineNumber} needs an import action before import.`,
    };
  }

  if (needsExisting && !decision?.existingStudentId) {
    return {
      status: "invalid",
      reason: `Line ${row.lineNumber} needs a selected match before import.`,
    };
  }

  if (action === "skip") {
    return { status: "skipped" };
  }

  return {
    status: "ready",
    row: {
      lineNumber: row.lineNumber,
      name: row.name,
      surname: row.surname,
      otherName: row.otherName ?? null,
      gender,
      classroomDepartmentId: rowClassroomDepartmentId,
      action,
      existingStudentId: decision?.existingStudentId || null,
    },
  };
}

function buildClassroomBreakdown({
  checkedRows,
  classroomById,
  fallbackClassroomDepartmentId,
  manualClassroomRequiredLineNumbers,
  manualGenders,
  rowDecisions,
  rows,
}: {
  checkedRows: Record<number, boolean>;
  classroomById: Map<string, ClassDepartment>;
  fallbackClassroomDepartmentId: string;
  manualClassroomRequiredLineNumbers: Set<number>;
  manualGenders: Record<number, "Male" | "Female">;
  rowDecisions: Record<number, RowDecision>;
  rows: VerifyResult[];
}) {
  const breakdown = new Map<string, ClassroomBreakdown>();

  for (const row of rows) {
    const classroomDepartmentId = getRowClassroomDepartmentId(
      row,
      fallbackClassroomDepartmentId,
      manualClassroomRequiredLineNumbers,
    );
    const id = classroomDepartmentId || "unassigned";
    const classroom = classroomDepartmentId
      ? classroomById.get(classroomDepartmentId)
      : null;
    const label = classroom
      ? getClassDepartmentDisplayName(classroom)
      : row.classRoom || "Unassigned";
    const current = breakdown.get(id) ?? {
      id,
      label,
      totalRows: 0,
      checkedRows: 0,
      executableRows: 0,
      attentionRows: 0,
    };
    const decision = rowDecisions[row.lineNumber];
    const action = decision?.action;
    const needsExisting =
      action === "keep_match" || action === "update_match_with_name";
    const checked = isRowChecked(checkedRows, row.lineNumber);
    const hasGender = Boolean(
      resolveGender(row, manualGenders[row.lineNumber]),
    );
    const executable =
      checked &&
      Boolean(classroomDepartmentId) &&
      Boolean(hasGender) &&
      Boolean(action) &&
      action !== "skip" &&
      (!needsExisting || Boolean(decision?.existingStudentId));
    const needsAttention =
      !classroomDepartmentId ||
      !hasGender ||
      !action ||
      (needsExisting && !decision?.existingStudentId) ||
      row.status === "needsAttention";

    current.totalRows += 1;
    if (checked) current.checkedRows += 1;
    if (executable) current.executableRows += 1;
    if (needsAttention) current.attentionRows += 1;
    breakdown.set(id, current);
  }

  return [...breakdown.values()].sort((a, b) => {
    if (a.id === "unassigned") return -1;
    if (b.id === "unassigned") return 1;
    return a.label.localeCompare(b.label);
  });
}

function findEditedNameMatch(
  row: Pick<VerifyResult, "name" | "surname" | "otherName">,
  students: ExistingStudent[],
  sessionTermId: string | null | undefined,
  schoolSessionId: string | null | undefined,
  classroomDeptId: string,
) {
  const ranked = students
    .map((student, index) => {
      const rowName = normalizeSearchText(row.name);
      const rowSurname = normalizeSearchText(row.surname);
      const studentName = normalizeSearchText(student.name);
      const studentSurname = normalizeSearchText(student.surname);
      const isExactNameSurname =
        Boolean(rowName) &&
        Boolean(rowSurname) &&
        rowName === studentName &&
        rowSurname === studentSurname;

      return {
        student,
        index,
        isExactNameSurname,
        score: scoreStudentRecommendation(row, student),
      };
    })
    .filter(
      ({ isExactNameSurname, score }) => isExactNameSurname || score >= 70,
    )
    .sort((a, b) => {
      if (a.isExactNameSurname !== b.isExactNameSurname) {
        return a.isExactNameSurname ? -1 : 1;
      }

      return b.score - a.score || a.index - b.index;
    });
  const match = ranked[0];
  if (!match) return null;

  return {
    ...studentToMatchCandidate(
      match.student,
      sessionTermId,
      schoolSessionId,
      classroomDeptId,
    ),
    confidence: match.isExactNameSurname ? 100 : 80,
    reason: match.isExactNameSurname
      ? "Name edit matches existing student name and surname"
      : "Name edit is similar to an existing student",
  };
}

function getRecommendedStudentItems(
  row: VerifyResult,
  items: StudentSearchItem[],
) {
  const rankedItems = items
    .map((item, index) => ({
      item,
      index,
      score: scoreStudentRecommendation(row, item.student),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const matches = rankedItems.filter(({ score }) => score > 0).slice(0, 12);

  return (matches.length ? matches : rankedItems.slice(0, 12)).map(
    ({ item }) => item,
  );
}

function scoreStudentRecommendation(
  row: Pick<VerifyResult, "name" | "surname" | "otherName">,
  student: ExistingStudent,
) {
  const rowParts = [row.name, row.surname, row.otherName || ""]
    .map(normalizeSearchText)
    .filter(Boolean);
  const rowFullName = rowParts.join(" ");
  const studentParts = [student.name, student.surname, student.otherName || ""]
    .map(normalizeSearchText)
    .filter(Boolean);
  const studentFullName = studentParts.join(" ");
  const rowTokens = new Set(rowFullName.split(" ").filter(Boolean));
  const studentTokens = new Set(studentFullName.split(" ").filter(Boolean));
  let score = 0;

  if (rowFullName && studentFullName === rowFullName) score += 120;
  if (rowFullName && studentFullName.includes(rowFullName)) score += 60;
  if (studentFullName && rowFullName.includes(studentFullName)) score += 40;
  if (rowParts[0] && studentParts[0] === rowParts[0]) score += 35;
  if (rowParts[1] && studentParts[1] === rowParts[1]) score += 35;
  if (rowParts[2] && studentParts.includes(rowParts[2])) score += 15;

  for (const token of rowTokens) {
    if (studentTokens.has(token)) score += 12;
  }

  return score;
}

function normalizeSearchText(value: string | undefined | null) {
  return normalizeArabic(value).toLowerCase();
}

function getPossibleNamePartOptions(
  row: VerifyResult,
  isDirty: boolean,
  lockedSpans: Partial<Record<EditableNamePart, NameTokenSpan>>,
) {
  const tokens = extractNameTokens(row);
  const otherNameSpan = row.otherName
    ? findTokenSpanRange(tokens, row.otherName.split(/\s+/).filter(Boolean))
    : null;
  const possibleNames: NamePartOption[] = [];
  const parts: EditableNamePart[] = ["name", "surname", "otherName"];

  for (const as of parts) {
    for (const option of buildContiguousNameOptions(tokens, as)) {
      if (
        isDirty &&
        parts.some((part) => {
          if (part === as) return false;
          const span = lockedSpans[part];
          return span ? spansOverlap(option, span) : false;
        })
      ) {
        continue;
      }

      possibleNames.push(option);
    }
  }

  if (row.otherName) {
    possibleNames.push({
      value: row.otherName,
      as: "otherName",
      start: otherNameSpan?.start ?? -1,
      end: otherNameSpan?.end ?? -1,
    });
  }

  possibleNames.push({ value: "None", as: "otherName", start: -1, end: -1 });

  return dedupeNamePartOptions(possibleNames);
}

function buildContiguousNameOptions(tokens: string[], as: EditableNamePart) {
  const options: NamePartOption[] = [];

  for (let start = 0; start < tokens.length; start += 1) {
    for (let end = start + 1; end <= tokens.length; end += 1) {
      options.push({
        value: tokens.slice(start, end).join(" "),
        as,
        start,
        end,
      });
    }
  }

  return options;
}

function dedupeNamePartOptions(options: NamePartOption[]) {
  const seen = new Set<string>();

  return options.filter((option) => {
    const value = option.value.replace(/\s+/g, " ").trim();
    const key = `${option.as}:${normalizeArabic(value)}`;
    if (!value || seen.has(key)) return false;

    option.value = value;
    seen.add(key);
    return true;
  });
}

function spansOverlap(
  option: Pick<NamePartOption, "start" | "end">,
  span: { start: number; end: number },
) {
  if (option.start < 0 || span.start < 0) return false;
  return option.start < span.end && span.start < option.end;
}

function extractNameTokens(row: VerifyResult) {
  const source =
    row.originalText ||
    [row.name, row.surname, row.otherName].filter(Boolean).join(" ");
  const parts = source
    .split(/[,.،]/)
    .map((part) => part.trim())
    .filter(Boolean);
  const nameSource =
    parts.length > 1 && isGenderAlias(parts[parts.length - 1] || "")
      ? parts.slice(0, -1).join(" ")
      : parts.join(" ") || source;

  return nameSource.split(/\s+/).filter(Boolean);
}

function isGenderAlias(value: string) {
  const normalized = value.trim().toLowerCase();
  return ["m", "male", "f", "female"].includes(normalized);
}

function resolveNameSelection(
  row: VerifyResult,
  option: NamePartOption,
): NameOverride {
  const { as: part, value } = option;

  if (value === "None") {
    return {
      name: row.name,
      surname: row.surname,
      otherName: null,
    };
  }

  const tokens = extractNameTokens(row);
  const start =
    option.start >= 0
      ? option.start
      : findTokenSpan(tokens, value.split(/\s+/).filter(Boolean));

  if (start < 0) {
    return {
      name: part === "name" ? value : row.name,
      surname: part === "surname" ? value : row.surname,
      otherName: part === "otherName" ? value : row.otherName,
    };
  }

  const end =
    option.end > start
      ? option.end
      : start + value.split(/\s+/).filter(Boolean).length;

  if (part === "surname") {
    return {
      name: tokens.slice(0, start).join(" ") || row.name,
      surname: value,
      otherName: tokens.slice(end).join(" ") || null,
    };
  }

  if (part === "name") {
    const remaining = tokens.slice(end);

    return {
      name: value,
      surname: remaining[0] || row.surname,
      otherName: remaining.slice(1).join(" ") || null,
    };
  }

  const before = tokens.slice(0, start);

  return {
    name: before[0] || row.name,
    surname: before.slice(1).join(" ") || row.surname,
    otherName: value,
  };
}

function findTokenSpan(tokens: string[], selectedTokens: string[]) {
  return findTokenSpanRange(tokens, selectedTokens)?.start ?? -1;
}

function findTokenSpanRange(tokens: string[], selectedTokens: string[]) {
  if (!selectedTokens.length) return null;

  for (
    let start = 0;
    start <= tokens.length - selectedTokens.length;
    start += 1
  ) {
    const matches = selectedTokens.every(
      (token, index) =>
        normalizeArabic(tokens[start + index]) === normalizeArabic(token),
    );

    if (matches) return { start, end: start + selectedTokens.length };
  }

  return null;
}

function studentToMatchCandidate(
  student: ExistingStudent,
  sessionTermId: string | null | undefined,
  schoolSessionId: string | null | undefined,
  classroomDeptId: string,
): MatchCandidate {
  const isCurrentTermMatch = Boolean(
    sessionTermId &&
    schoolSessionId &&
    student.termId === sessionTermId &&
    student.schoolSessionId === schoolSessionId &&
    student.termSheetId,
  );

  return {
    id: student.id,
    name: student.name,
    surname: student.surname,
    otherName: student.otherName,
    gender: student.gender,
    classRoom: student.classRoom || null,
    classroomDepartmentId: student.classroomDepartmentId || null,
    studentSessionFormId: student.studentSessionFormId || null,
    studentTermFormId: student.termSheetId || null,
    termId: student.termId || null,
    termName: student.termName || null,
    sessionId: student.schoolSessionId || null,
    sessionName: student.sessionName || null,
    isCurrentTermMatch,
    isCurrentClassroomMatch: student.classroomDepartmentId === classroomDeptId,
    confidence: 100,
    reason: "Selected from existing students",
  };
}

function getCandidates(row: VerifyResult): MatchCandidate[] {
  const candidates = [
    ...(row.fullMatch ? [row.fullMatch] : []),
    ...row.suspectedMatches,
  ];
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    if (seen.has(candidate.id)) return false;
    seen.add(candidate.id);
    return true;
  });
}

function resolveGender(
  row: VerifyResult,
  manualGender?: "Male" | "Female",
): "Male" | "Female" | null {
  const gender = manualGender || row.inferredGender || row.inputGender;

  if (gender === "Male" || gender === "M") return "Male";
  if (gender === "Female" || gender === "F") return "Female";

  return null;
}

function normalizeArabic(str: string | undefined | null) {
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

  return str.replace(/\s+/g, " ").trim();
}

function compareArabic(
  a: string | undefined | null,
  b: string | undefined | null,
) {
  return normalizeArabic(a) === normalizeArabic(b);
}
