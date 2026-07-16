import { _qc, _trpc } from "@/components/static-trpc";
import { Arabic } from "@/components/arabic";
import { SubmitButton } from "@/components/submit-button";
import { studentDisplayName } from "@/utils/utils";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Alert, AlertDescription, AlertTitle } from "@school-clerk/ui/alert";
import { Badge, badgeVariants } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Checkbox } from "@school-clerk/ui/checkbox";
import { cn } from "@school-clerk/ui/cn";
import { ComboboxDropdown } from "@school-clerk/ui/combobox-dropdown";
import { Item, Select } from "@school-clerk/ui/composite";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@school-clerk/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@school-clerk/ui/popover";
import { Progress } from "@school-clerk/ui/progress";
import { Separator } from "@school-clerk/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@school-clerk/ui/toggle-group";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  Import,
  MoreHorizontal,
  MinusCircle,
  PencilLine,
  RefreshCw,
  Search,
  UserCheck,
  UserPlus,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { StudentImportReviewDraft } from "./draft-storage";
import {
  normalizeStudentImportError,
  type NormalizedStudentImportError,
} from "./import-errors";
import {
  buildStudentImportReviewModel,
  getStudentImportRowClassroomDepartmentId,
  isStudentImportAutoSkippedRow,
  isStudentImportRowChecked,
  resolveStudentImportGender,
} from "./review-model";

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
  savedDraft?: StudentImportReviewDraft | null;
  sourceRaw: string;
  onCancelImport?: () => void;
  onClearDraft?: () => void;
  onDraftChange?: (draft: StudentImportReviewDraft | null) => void;
  onStartNewImport?: () => void;
  onCloseImport?: () => void;
  onPhaseChange?: (phase: "review" | "import") => void;
  isActive?: boolean;
}

type VerifyResult =
  RouterOutputs["students"]["verifyStudentImport"]["results"][number];
type MatchCandidate = NonNullable<VerifyResult["fullMatch"]>;
type ExistingStudent =
  RouterOutputs["students"]["studentsRecentRecord"]["students"][number];
type ClassDepartment =
  RouterOutputs["students"]["studentsRecentRecord"]["classDepartments"][number];
type ExecuteResult = RouterOutputs["students"]["executeStudentImport"];
type StudentImportJob = NonNullable<
  RouterOutputs["students"]["getStudentImportJob"]
>;
type ImportExecutionResult = ExecuteResult | StudentImportJob;
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
const EMPTY_OTHER_NAME_VALUE = "-";
const ARABIC_SCRIPT_RE =
  /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]/;

export function ImportActivity({
  students,
  savedDraft,
  sourceRaw,
  onCancelImport,
  onClearDraft,
  onDraftChange,
  onStartNewImport,
  onCloseImport,
  onPhaseChange,
  isActive = true,
}: Props) {
  const [classroomDeptId, setClassroomDeptId] = useState<string>(
    () => savedDraft?.classroomDeptId || "",
  );
  const [activeClassroomFilterId, setActiveClassroomFilterId] =
    useState<string>(() => savedDraft?.activeClassroomFilterId || "all");
  const [rowDecisions, setRowDecisions] = useState<Record<number, RowDecision>>(
    () => sanitizeRowDecisions(savedDraft?.rowDecisions),
  );
  const [manualGenders, setManualGenders] = useState<
    Record<number, "Male" | "Female">
  >(() => sanitizeManualGenders(savedDraft?.manualGenders));
  const [manualClassroomDepartmentIds, setManualClassroomDepartmentIds] =
    useState<Record<number, string>>(
      () => savedDraft?.manualClassroomDepartmentIds || {},
    );
  const [checkedRows, setCheckedRows] = useState<Record<number, boolean>>(
    () => savedDraft?.checkedRows || {},
  );
  const [nameOverrides, setNameOverrides] = useState<
    Record<number, NameOverride>
  >(() => savedDraft?.nameOverrides || {});
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
  const [skippedOnlyResult, setSkippedOnlyResult] =
    useState<ExecuteResult | null>(null);
  const [importedLineNumbers, setImportedLineNumbers] = useState<
    Record<number, boolean>
  >({});
  const [singleRowErrors, setSingleRowErrors] = useState<
    Record<number, NormalizedStudentImportError | null>
  >({});
  const [importingLineNumber, setImportingLineNumber] = useState<number | null>(
    null,
  );
  const [activeImportJobId, setActiveImportJobId] = useState<string | null>(
    null,
  );
  const [lastActiveImportJob, setLastActiveImportJob] =
    useState<StudentImportJob | null>(null);
  const [lastInvalidatedImportJobId, setLastInvalidatedImportJobId] = useState<
    string | null
  >(null);
  const lastPersistedDraftJsonRef = useRef<string | null>(null);
  const clearedCleanDraftResultKeyRef = useRef<string | null>(null);

  const {
    data: records,
    refetch: refetchRecentRecords,
    isPending: isRecentRecordsPending,
  } = useQuery(
    _trpc.students.studentsRecentRecord.queryOptions({}, { enabled: isActive }),
  );

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
    if (!isActive) return;
    if (!verifyInput) return;

    resetVerification();
    verifyStudents(verifyInput);
  }, [isActive, resetVerification, verifyInput, verifyStudents]);

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
  useEffect(() => {
    if (!savedDraft?.manualMatchStudentIds) return;
    if (!records?.students?.length) return;
    if (!baseRows.length) return;

    setManualMatches((current) => {
      let changed = false;
      const next = { ...current };

      for (const row of baseRows) {
        const studentId = savedDraft.manualMatchStudentIds[row.lineNumber];
        if (!studentId) continue;
        if (next[row.lineNumber]?.id === studentId) continue;

        const student = records.students.find((item) => item.id === studentId);
        if (!student) continue;

        next[row.lineNumber] = studentToMatchCandidate(
          student,
          records.sessionTermId,
          records.schoolSessionId,
          getRowClassroomDepartmentId(
            row,
            savedDraft.classroomDeptId || classroomDeptId,
            manualClassroomRequiredLineNumbers,
          ),
        );
        changed = true;
      }

      return changed ? next : current;
    });
  }, [
    baseRows,
    classroomDeptId,
    manualClassroomRequiredLineNumbers,
    records?.schoolSessionId,
    records?.sessionTermId,
    records?.students,
    savedDraft?.classroomDeptId,
    savedDraft?.manualMatchStudentIds,
  ]);
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
  const filteredRows = useMemo(
    () =>
      filterRowsByClassroom({
        activeClassroomFilterId,
        fallbackClassroomDepartmentId: classroomDeptId,
        manualClassroomRequiredLineNumbers,
        rows,
      }),
    [
      activeClassroomFilterId,
      classroomDeptId,
      manualClassroomRequiredLineNumbers,
      rows,
    ],
  );

  const reviewModel = useMemo(
    () =>
      buildStudentImportReviewModel({
        checkedRows,
        fallbackClassroomDepartmentId: classroomDeptId,
        importedLineNumbers,
        manualClassroomRequiredLineNumbers,
        manualGenders,
        rowDecisions,
        rows: filteredRows,
      }),
    [
      checkedRows,
      classroomDeptId,
      filteredRows,
      importedLineNumbers,
      manualClassroomRequiredLineNumbers,
      manualGenders,
      rowDecisions,
    ],
  );
  const { readyRows, exactRows, suspectedRows, matchedRows, attentionRows } =
    reviewModel;

  useEffect(() => {
    if (!verificationRows) return;

    setRowDecisions((current) =>
      reconcileRowDecisions(verificationRows, current),
    );
    setManualGenders((current) =>
      pickLineNumberRecord(current, verificationRows),
    );
    setCheckedRows((current) =>
      reconcileCheckedRows(verificationRows, current),
    );
    setManualClassroomDepartmentIds((current) =>
      pickLineNumberRecord(current, verificationRows),
    );
    setNameOverrides((current) =>
      pickLineNumberRecord(current, verificationRows),
    );
    setManualMatches((current) =>
      pickLineNumberRecord(current, verificationRows),
    );
    setPendingSearchMatches({});
    setPendingNameMatches({});
    setPreSubmitError(null);
    setLastExecutionSkippedRows(0);
    setSkippedOnlyResult(null);
    setSingleRowErrors({});
  }, [verificationRows]);

  const {
    mutate: startImportJob,
    isPending: isStartingImportJob,
    data: startedImportJob,
    error: batchError,
    reset: resetStartImportJob,
  } = useMutation(
    _trpc.students.startStudentImportJob.mutationOptions({
      onSuccess(job) {
        setActiveImportJobId(job.id);
      },
      meta: {
        toastTitle: {
          loading: "Starting import...",
          success: "Import started",
          error: "Import failed",
        },
      },
    }),
  );
  const canRecoverImportJob =
    isActive &&
    !activeImportJobId &&
    !startedImportJob &&
    students.length === 0;

  const {
    data: activeImportJob,
    error: activeImportJobError,
    refetch: refetchActiveImportJob,
  } = useQuery(
    _trpc.students.getStudentImportJob.queryOptions(
      activeImportJobId ? { jobId: activeImportJobId } : undefined,
      {
        enabled: isActive && Boolean(activeImportJobId),
        refetchInterval: false,
      },
    ),
  );

  const { data: recoveredImportJob, refetch: refetchRecoveredImportJob } =
    useQuery(
      _trpc.students.getStudentImportJob.queryOptions(undefined, {
        enabled: canRecoverImportJob,
        retry: false,
        refetchOnWindowFocus: false,
        refetchInterval: false,
      }),
    );

  useEffect(() => {
    if (!activeImportJobId) {
      setLastActiveImportJob(null);
    }
  }, [activeImportJobId]);

  useEffect(() => {
    if (!activeImportJob) return;

    setLastActiveImportJob((current) =>
      getStableStudentImportJob(activeImportJob, current),
    );
  }, [activeImportJob]);

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
      const fallbackMatchId =
        current.existingStudentId ||
        row.fullMatch?.id ||
        getSingleCandidateId(row);

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
          existingStudentId: needsExisting
            ? row.fullMatch?.id || getSingleCandidateId(row)
            : null,
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
    resetStartImportJob();
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
  };

  const executeAll = () => {
    setPreSubmitError(null);
    setSkippedOnlyResult(null);

    const importRows: ExecuteRow[] = [];
    const needsDecisionLines: number[] = [];
    let skippedBeforeExecution = 0;

    for (const row of filteredRows) {
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
      if (skippedBeforeExecution > 0) {
        setLastExecutionSkippedRows(skippedBeforeExecution);
        setSkippedOnlyResult({
          createdStudents: 0,
          keptMatches: 0,
          updatedMatches: 0,
          termSheetsCreated: 0,
          skippedRows: 0,
          failedRows: 0,
          rows: [],
        });
        return;
      }

      setPreSubmitError(
        activeClassroomFilterId === "all"
          ? "Check at least one row before executing the import."
          : "Check at least one row in the active classroom filter before executing the import.",
      );
      return;
    }

    setLastExecutionSkippedRows(skippedBeforeExecution);
    startImportJob({
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
              ? "This row is skipped because it already has a current term sheet or is marked Skip."
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
    filteredRows
      .map((row) =>
        getRowClassroomDepartmentId(
          row,
          classroomDeptId,
          manualClassroomRequiredLineNumbers,
        ),
      )
      .filter(Boolean),
  );
  const selectedClassroomId =
    selectedClassroomIds.size === 1 ? [...selectedClassroomIds][0] : null;
  const selectedClassroom = selectedClassroomId
    ? classroomById.get(selectedClassroomId)
    : null;
  const classroomSummary =
    selectedClassroomIds.size > 1
      ? `${selectedClassroomIds.size} classrooms`
      : selectedClassroom
        ? getClassDepartmentDisplayName(selectedClassroom)
        : selectedClassroomId
          ? filteredRows.find((row) =>
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
  const showRowClassroom = classroomBreakdown.length > 1;
  useEffect(() => {
    if (activeClassroomFilterId === "all") return;
    if (
      classroomBreakdown.some((item) => item.id === activeClassroomFilterId)
    ) {
      return;
    }

    setActiveClassroomFilterId("all");
  }, [activeClassroomFilterId, classroomBreakdown]);
  const displayedImportJob =
    (isActive && activeImportJobId
      ? (activeImportJob ?? lastActiveImportJob ?? startedImportJob)
      : null) ??
    startedImportJob ??
    (canRecoverImportJob ? recoveredImportJob : null) ??
    null;
  const displayedImportJobTriggerRunId =
    displayedImportJob?.triggerRunId ?? undefined;
  const displayedImportJobTriggerAccessToken =
    displayedImportJob?.triggerAccessToken ?? undefined;
  const { run: triggerRun, error: triggerRunError } = useRealtimeRun(
    displayedImportJobTriggerRunId,
    {
      accessToken: displayedImportJobTriggerAccessToken,
      enabled: Boolean(
        isActive &&
        displayedImportJobTriggerRunId &&
        displayedImportJobTriggerAccessToken,
      ),
      onComplete: () => {
        if (activeImportJobId) {
          refetchActiveImportJob();
        } else {
          refetchRecoveredImportJob();
        }
      },
    },
  );
  const triggerRunWaitingForVersion = triggerRun?.status === "PENDING_VERSION";
  const triggerRunWaitingForVersionMessage = triggerRunWaitingForVersion
    ? "Trigger run is waiting for a matching worker version. In local development, use a Trigger.dev dev secret key with trigger.dev dev, or deploy the production worker for the production key."
    : null;
  const displayedImportJobRunning = Boolean(
    displayedImportJob &&
    (displayedImportJob.status === "PENDING" ||
      displayedImportJob.status === "RUNNING"),
  );
  const displayedImportJobFinal = Boolean(
    displayedImportJob &&
    (displayedImportJob.status === "COMPLETED" ||
      displayedImportJob.status === "COMPLETED_WITH_FAILURES" ||
      displayedImportJob.status === "FAILED" ||
      displayedImportJob.status === "CANCELLED"),
  );
  const isExecutingBatch =
    isStartingImportJob ||
    (displayedImportJobRunning && !triggerRunWaitingForVersion);
  const batchResult: ImportExecutionResult | undefined =
    displayedImportJob ?? skippedOnlyResult ?? undefined;

  useEffect(() => {
    if (!displayedImportJobFinal || !displayedImportJob) return;
    if (lastInvalidatedImportJobId === displayedImportJob.id) return;

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
    setLastInvalidatedImportJobId(displayedImportJob.id);
  }, [displayedImportJob, displayedImportJobFinal, lastInvalidatedImportJobId]);
  const selectedRowCount = reviewModel.counts.checkedRows;
  const skippedBeforeExecution = reviewModel.counts.skippedRows;
  const executableRowCount = reviewModel.counts.executableRows;
  const importActionLabel =
    executableRowCount > 0
      ? `Start import (${executableRowCount})`
      : skippedBeforeExecution > 0
        ? `Finish import (${skippedBeforeExecution} skipped)`
        : "Start import";

  const showExecutionOnly =
    isExecutingBatch ||
    Boolean(batchResult) ||
    displayedImportJobFinal ||
    Boolean(skippedOnlyResult);
  useEffect(() => {
    onPhaseChange?.(showExecutionOnly ? "import" : "review");
  }, [onPhaseChange, showExecutionOnly]);
  const verificationImportError = useMemo(
    () => normalizeStudentImportError("verification", verificationError),
    [verificationError],
  );
  const batchImportError = useMemo(
    () =>
      normalizeStudentImportError(
        "execution",
        batchError || activeImportJobError || triggerRunError,
      ),
    [activeImportJobError, batchError, triggerRunError],
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
    resetStartImportJob();
    if (activeImportJobId) {
      refetchActiveImportJob();
    }
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
  const reviewDraft = useMemo<StudentImportReviewDraft>(
    () => ({
      sourceRaw,
      classroomDeptId,
      activeClassroomFilterId,
      rowDecisions,
      manualGenders,
      manualClassroomDepartmentIds,
      checkedRows,
      nameOverrides,
      manualMatchStudentIds: Object.fromEntries(
        Object.entries(manualMatches).map(([lineNumber, candidate]) => [
          lineNumber,
          candidate.id,
        ]),
      ),
    }),
    [
      activeClassroomFilterId,
      checkedRows,
      classroomDeptId,
      manualClassroomDepartmentIds,
      manualGenders,
      manualMatches,
      nameOverrides,
      rowDecisions,
      sourceRaw,
    ],
  );
  const reviewDraftJson = useMemo(
    () => JSON.stringify(reviewDraft),
    [reviewDraft],
  );
  const cleanImportResultKey = useMemo(
    () =>
      activeClassroomFilterId === "all" && !isExecutingBatch
        ? getCleanImportResultKey(batchResult)
        : null,
    [activeClassroomFilterId, batchResult, isExecutingBatch],
  );

  useEffect(() => {
    if (!cleanImportResultKey) return;
    if (clearedCleanDraftResultKeyRef.current === cleanImportResultKey) return;

    clearedCleanDraftResultKeyRef.current = cleanImportResultKey;
    onClearDraft?.();
  }, [cleanImportResultKey, onClearDraft]);

  useEffect(() => {
    if (!onDraftChange) return;
    if (cleanImportResultKey) return;
    if (clearedCleanDraftResultKeyRef.current) return;
    if (lastPersistedDraftJsonRef.current === reviewDraftJson) return;

    lastPersistedDraftJsonRef.current = reviewDraftJson;
    onDraftChange(reviewDraft);
  }, [cleanImportResultKey, onDraftChange, reviewDraft, reviewDraftJson]);

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
                {reviewModel.counts.blockedCheckedRows > 0 ? (
                  <Badge
                    variant="outline"
                    className="border-red-200 text-red-600"
                  >
                    {reviewModel.counts.blockedCheckedRows} checked blocked
                  </Badge>
                ) : null}
                {reviewModel.counts.uncheckedRows > 0 ? (
                  <Badge variant="outline">
                    {reviewModel.counts.uncheckedRows} unchecked
                  </Badge>
                ) : null}
              </div>
              <SubmitButton
                isSubmitting={isExecutingBatch}
                disabled={!reviewModel.canStartImport || isVerifying}
                onClick={executeAll}
                className="h-9 w-full justify-center font-medium sm:w-auto"
                type="button"
              >
                <Import className="mr-2 size-4" />
                {isExecutingBatch ? "Importing..." : importActionLabel}
              </SubmitButton>
            </div>
          </div>
          {reviewModel.disabledReason ? (
            <div className="border-t bg-amber-50/60 px-3 py-2 text-[11px] font-medium text-amber-800 dark:bg-amber-950/15 dark:text-amber-200">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="size-3.5 shrink-0" />
                <span>{reviewModel.disabledReason}</span>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {isExecutingBatch || batchResult ? (
        <ImportExecutionPanel
          classroomLabel={classroomSummary}
          classroomBreakdown={classroomBreakdown}
          pastedRowCount={filteredRows.length || students.length}
          selectedRowCount={selectedRowCount}
          executableRowCount={executableRowCount}
          skippedBeforeExecution={
            batchResult || batchError
              ? lastExecutionSkippedRows
              : skippedBeforeExecution
          }
          isExecuting={isExecutingBatch}
          result={batchResult}
          errorMessage={
            triggerRunWaitingForVersionMessage ?? batchImportError?.message
          }
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

          <ClassroomBreakdownStrip
            activeFilterId={activeClassroomFilterId}
            breakdown={classroomBreakdown}
            onFilterChange={setActiveClassroomFilterId}
          />

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
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="space-y-4">
                {attentionRows.length > 0 ? (
                  <>
                    <SectionHeader
                      title="Needs attention"
                      detail="Checked rows here must be fixed or unchecked before import."
                      count={attentionRows.length}
                      checkedCount={reviewModel.sections[0]?.checkedRows ?? 0}
                      action={
                        <SectionSelectionActions
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
                      showRowClassroom={showRowClassroom}
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
                  </>
                ) : null}

                {matchedRows.length > 0 ? (
                  <>
                    <SectionHeader
                      title="Match found"
                      detail="Exact and possible matches. Candidate-dependent actions require a selected match."
                      count={matchedRows.length}
                      checkedCount={reviewModel.sections[1]?.checkedRows ?? 0}
                      action={
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <SectionSelectionActions
                            rows={matchedRows}
                            checkedRows={checkedRows}
                            onCheckAll={() => setRowsChecked(matchedRows, true)}
                            onUncheckAll={() =>
                              setRowsChecked(matchedRows, false)
                            }
                          />
                          {exactRows.length > 0 ? (
                            <BatchActionSelect
                              placeholder="Exact default"
                              defaultValue="keep_match"
                              onValueChange={(action) =>
                                applyBatch("exact", action)
                              }
                            />
                          ) : null}
                          {suspectedRows.length > 0 ? (
                            <BatchActionSelect
                              placeholder="Possible default"
                              onValueChange={(action) =>
                                applyBatch("suspected", action)
                              }
                            />
                          ) : null}
                        </div>
                      }
                    />
                    <RowsList
                      emptyText="No matches found."
                      rows={matchedRows}
                      classroomOptions={records?.classDepartments ?? []}
                      rowDecisions={rowDecisions}
                      manualGenders={manualGenders}
                      showRowClassroom={showRowClassroom}
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
                  </>
                ) : null}

                {readyRows.length > 0 ? (
                  <>
                    <SectionHeader
                      title="Ready to import"
                      detail="Rows with no existing match and complete required fields."
                      count={readyRows.length}
                      checkedCount={reviewModel.sections[2]?.checkedRows ?? 0}
                      action={
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <SectionSelectionActions
                            rows={readyRows}
                            checkedRows={checkedRows}
                            onCheckAll={() => setRowsChecked(readyRows, true)}
                            onUncheckAll={() =>
                              setRowsChecked(readyRows, false)
                            }
                          />
                          <Button
                            size="sm"
                            type="button"
                            onClick={() => applyBatch("ready", "import_new")}
                          >
                            <Import className="mr-2 size-4" />
                            Import checked
                          </Button>
                        </div>
                      }
                    />
                    <RowsList
                      emptyText="No rows are currently ready to import."
                      rows={readyRows}
                      classroomOptions={records?.classDepartments ?? []}
                      rowDecisions={rowDecisions}
                      manualGenders={manualGenders}
                      showRowClassroom={showRowClassroom}
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
                  </>
                ) : null}
              </div>
            </div>
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
  result?: ImportExecutionResult;
  errorMessage?: string | null;
  onStartNewImport?: () => void;
  onCloseImport?: () => void;
}) {
  const jobProgress =
    result && "processedRows" in result ? (result as StudentImportJob) : null;
  const backendSkippedRows = result?.skippedRows ?? 0;
  const skippedRows = skippedBeforeExecution + backendSkippedRows;
  const successfulRows = result
    ? result.createdStudents + result.keptMatches + result.updatedMatches
    : 0;
  const analyzedRows = jobProgress
    ? jobProgress.processedRows + skippedBeforeExecution
    : result
      ? successfulRows + result.failedRows + skippedRows
      : selectedRowCount;
  const progressValue = result
    ? jobProgress
      ? jobProgress.totalRows
        ? Math.round(
            ((jobProgress.processedRows + skippedBeforeExecution) /
              (jobProgress.totalRows + skippedBeforeExecution)) *
              100,
          )
        : 100
      : analyzedRows
        ? Math.round(((successfulRows + skippedRows) / analyzedRows) * 100)
        : 100
    : isExecuting
      ? 10
      : 0;
  const progressLabel = jobProgress
    ? `${jobProgress.processedRows} of ${jobProgress.totalRows} processed`
    : result
      ? `${progressValue}% clean`
      : `${selectedRowCount} checked · ${skippedBeforeExecution} skipped`;
  const failedRows =
    result?.rows.filter((row) => row.status === "failed") ?? [];
  const hasProgress = Boolean(result);
  const hasResult = Boolean(result && !isExecuting);
  const hasError = Boolean(errorMessage) && !isExecuting;
  const hasFailures =
    Boolean(result?.failedRows) ||
    jobProgress?.status === "FAILED" ||
    jobProgress?.status === "CANCELLED";
  const isPartialResult = jobProgress?.status === "COMPLETED_WITH_FAILURES";
  const statusIcon = isExecuting ? (
    <RefreshCw className="size-4 animate-spin" />
  ) : hasFailures || hasError ? (
    <XCircle className="size-4" />
  ) : hasResult ? (
    <CheckCircle2 className="size-4" />
  ) : (
    <FileCheck2 className="size-4" />
  );
  const statusTitle = isExecuting
    ? "Importing selected rows"
    : hasError
      ? "Import needs attention"
      : isPartialResult
        ? "Import completed with issues"
        : hasFailures
          ? "Import needs attention"
          : hasResult
            ? "Import complete"
            : "Ready for import";
  const statusDetail = isExecuting
    ? jobProgress
      ? `${jobProgress.processedRows} of ${jobProgress.totalRows} row(s) processed. You can leave this screen and come back.`
      : "Starting a durable import job for the selected rows."
    : hasError
      ? errorMessage
      : hasResult
        ? `${successfulRows} row(s) applied, ${skippedRows} skipped, ${result?.failedRows ?? 0} failed.`
        : classroomLabel
          ? `Reviewing ${selectedRowCount} of ${pastedRowCount} pasted row(s) for ${classroomLabel}.`
          : "Select a target classroom before executing the import.";

  return (
    <div
      className={cn(
        "rounded-md border bg-background text-xs",
        hasFailures || hasError
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
              hasFailures || hasError
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
          variant={
            hasResult && !hasFailures && !hasError ? "success" : "outline"
          }
          className={cn(
            "bg-background",
            hasFailures || hasError
              ? "border-red-200 text-red-600 dark:border-red-900"
              : "",
          )}
        >
          {isExecuting
            ? "Working"
            : hasError
              ? "Attention"
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
          <span>{progressLabel}</span>
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
            hasProgress ? (result?.createdStudents ?? 0) : executableRowCount
          }
          detail={hasProgress ? "student records" : "rows to import"}
          tone="success"
        />
        <ImportStat
          icon={<FileCheck2 className="size-4" />}
          label="Term sheets"
          value={hasProgress ? (result?.termSheetsCreated ?? 0) : "-"}
          detail="created"
          tone="info"
        />
        <ImportStat
          icon={<UserCheck className="size-4" />}
          label="Names unchanged"
          value={hasProgress ? (result?.keptMatches ?? 0) : "-"}
          detail="students kept"
          tone="neutral"
        />
        <ImportStat
          icon={<PencilLine className="size-4" />}
          label="Names updated"
          value={hasProgress ? (result?.updatedMatches ?? 0) : "-"}
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
          value={hasProgress ? (result?.failedRows ?? 0) : hasError ? 1 : 0}
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
          {onStartNewImport && !hasFailures && !hasError ? (
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
  activeFilterId = "all",
  breakdown,
  compact = false,
  onFilterChange,
}: {
  activeFilterId?: string;
  breakdown: ClassroomBreakdown[];
  compact?: boolean;
  onFilterChange?: (filterId: string) => void;
}) {
  if (!breakdown.length) return null;

  const canFilter = Boolean(onFilterChange && breakdown.length > 1 && !compact);
  const totals = breakdown.reduce(
    (current, item) => ({
      totalRows: current.totalRows + item.totalRows,
      checkedRows: current.checkedRows + item.checkedRows,
      executableRows: current.executableRows + item.executableRows,
      attentionRows: current.attentionRows + item.attentionRows,
    }),
    {
      totalRows: 0,
      checkedRows: 0,
      executableRows: 0,
      attentionRows: 0,
    },
  );
  const renderFilterBadge = (
    item: ClassroomBreakdown | (typeof totals & { id: string; label: string }),
  ) => {
    const active = activeFilterId === item.id;
    const variant: "default" | "outline" | "secondary" = active
      ? "default"
      : item.attentionRows > 0
        ? "outline"
        : "secondary";
    const badgeClassName = cn(
      "h-auto max-w-full justify-start gap-1 px-2 py-1 text-[11px]",
      active
        ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
        : "bg-background",
      !active &&
        item.attentionRows > 0 &&
        "border-amber-300 text-amber-700 dark:border-amber-900 dark:text-amber-300",
    );
    const content = (
      <>
        <Arabic>{item.label}</Arabic>
        <span
          className={
            active ? "text-primary-foreground/80" : "text-muted-foreground"
          }
        >
          {item.totalRows} rows · {item.checkedRows} checked ·{" "}
          {item.executableRows} executable
          {item.attentionRows > 0 ? ` · ${item.attentionRows} attention` : ""}
        </span>
      </>
    );

    if (!canFilter) {
      return (
        <Badge key={item.id} variant={variant} className={badgeClassName}>
          {content}
        </Badge>
      );
    }

    return (
      <button
        key={item.id}
        type="button"
        aria-pressed={active}
        className={cn(
          badgeVariants({ variant }),
          badgeClassName,
          "cursor-pointer text-left",
        )}
        onClick={() => onFilterChange?.(item.id)}
      >
        {content}
      </button>
    );
  };

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
        {canFilter
          ? renderFilterBadge({ id: "all", label: "All", ...totals })
          : null}
        {breakdown.map((item) => renderFilterBadge(item))}
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
  count,
  checkedCount,
  action,
}: {
  title: string;
  detail: string;
  count?: number;
  checkedCount?: number;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold leading-tight">{title}</h3>
          {typeof count === "number" ? (
            <Badge variant="secondary">{count}</Badge>
          ) : null}
          {typeof checkedCount === "number" ? (
            <Badge variant="outline">{checkedCount} checked</Badge>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
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

function SectionSelectionActions({
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
  showRowClassroom,
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
  showRowClassroom: boolean;
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
    <div className="divide-y border-y bg-background">
      {rows.map((row) => (
        <RowCard
          key={row.lineNumber}
          row={row}
          classroomOptions={classroomOptions}
          decision={rowDecisions[row.lineNumber]}
          manualGender={manualGenders[row.lineNumber]}
          showRowClassroom={showRowClassroom}
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
  showRowClassroom,
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
  showRowClassroom: boolean;
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
  const isSkipped =
    action === "skip" || isStudentImportAutoSkippedRow(row, decision);
  const implicitExistingStudentId = getSingleCandidateId(row);
  const needsExistingMatch =
    (action === "keep_match" || action === "update_match_with_name") &&
    !(decision?.existingStudentId || implicitExistingStudentId) &&
    !isSkipped;
  const needsResolution = !action;
  const needsGender = !resolvedGender;
  const needsClassroom = !row.classroomDepartmentId;
  const showMissingClassroom = needsClassroom && !isSkipped;
  const isBlocked =
    !imported &&
    !isSkipped &&
    (needsGender || needsClassroom || needsResolution || needsExistingMatch);
  const matchStatus = row.fullMatch
    ? "Exact match"
    : row.suspectedMatches.length > 0
      ? "Possible match"
      : "No match";
  const statusLabel = imported
    ? "Imported"
    : isBlocked
      ? "Action required"
      : "Ready";
  const showStatusBadge = !isSkipped && statusLabel === "Imported";
  const selectedCandidate = candidates.find(
    (candidate) =>
      candidate.id === (decision?.existingStudentId || implicitExistingStudentId),
  );
  const primaryCandidate = selectedCandidate || candidates[0] || null;
  const extraCandidateCount = Math.max(0, candidates.length - 1);
  const nameDirection = getNameDirection(row);
  const rowClassroomOption = row.classroomDepartmentId
    ? classroomOptions.find(
        (classroom) => classroom.id === row.classroomDepartmentId,
      )
    : null;
  const rowClassroomLabel =
    (rowClassroomOption
      ? getClassDepartmentDisplayName(rowClassroomOption)
      : "") || row.classRoom;
  const showResolutionStrip =
    showMissingClassroom ||
    showSearch ||
    Boolean(pendingNameMatch) ||
    Boolean(singleRowError);

  return (
    <div
      className={cn(
        "bg-background text-xs",
        isBlocked && "bg-amber-50/30 dark:bg-amber-950/10",
      )}
    >
      <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2 gap-y-2 px-3 py-2 lg:grid-cols-[2rem_2.75rem_minmax(18rem,1.45fr)_minmax(13rem,0.9fr)_15rem] lg:items-center lg:gap-3">
        <div className="col-start-1 row-start-1 flex items-start justify-center pt-1 lg:col-auto lg:row-auto lg:pt-0">
          <Checkbox
            checked={checked}
            onCheckedChange={(value) =>
              onCheckedChange(row.lineNumber, value === true)
            }
            aria-label={`Include line ${row.lineNumber} in import`}
            className="bg-background"
          />
        </div>

        <div className="col-start-1 row-start-2 flex items-start justify-center lg:col-auto lg:row-auto lg:pt-0">
          <span className="inline-flex h-6 min-w-7 items-center justify-center rounded-md border bg-muted/20 px-1.5 text-[11px] font-medium tabular-nums text-muted-foreground">
            {row.lineNumber}
          </span>
        </div>

        <div className="col-start-2 row-span-2 row-start-1 min-w-0 space-y-2 lg:col-auto lg:row-auto lg:space-y-3">
          <div
            dir={nameDirection}
            className={cn(
              "flex min-w-0 flex-wrap items-center gap-1.5",
              nameDirection === "rtl" && "justify-end text-right",
            )}
          >
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
              value={row.otherName || EMPTY_OTHER_NAME_VALUE}
              options={possibleNames}
              isDirty={isNameDirty}
              onReset={() => onNamePartsReset(row.lineNumber)}
              onValueChange={(option) => onNamePartChange(row, option)}
            />
            <GenderToggle
              value={resolvedGender || undefined}
              onValueChange={(gender) => onGenderChange(row.lineNumber, gender)}
              compact
              missing={needsGender && !isSkipped}
            />
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-muted-foreground">
            {showStatusBadge ? (
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
            ) : null}
            {showRowClassroom && rowClassroomLabel ? (
              <Badge variant="outline" className="max-w-full bg-background">
                <Arabic className="truncate">{rowClassroomLabel}</Arabic>
              </Badge>
            ) : null}
            {showMissingClassroom ? (
              <Badge
                variant="outline"
                className="border-amber-300 bg-background text-amber-700 dark:text-amber-300"
              >
                <AlertTriangle className="mr-1 size-3.5" />
                Classroom missing
              </Badge>
            ) : null}
            {row.inferredGender ? (
              <p className="text-[11px] text-muted-foreground">
                Gender inferred from existing names
                {row.genderInferenceDetails
                  ? ` (${row.genderInferenceDetails.confidence}%, ${row.genderInferenceDetails.sampleSize} samples)`
                  : ""}
              </p>
            ) : null}
          </div>
        </div>

        <div className="col-span-2 row-start-3 min-w-0 lg:col-auto lg:row-auto">
          <MatchSummaryPopover
            candidates={candidates}
            decision={decision}
            extraCandidateCount={extraCandidateCount}
            matchStatus={matchStatus}
            needsExistingMatch={needsExistingMatch}
            onCandidateChange={(candidateId) =>
              onCandidateChange(row, candidateId)
            }
            primaryCandidate={primaryCandidate}
          />
        </div>

        <div
          className={cn(
            "col-span-2 row-start-4 grid min-w-0 grid-cols-[minmax(0,1fr)_2rem_2rem] items-start gap-1 rounded-md border bg-muted/20 p-1 lg:col-auto lg:row-auto",
            getActionSelectorBorderClass(statusLabel, isSkipped),
          )}
        >
          <div className="min-w-0">
            <Select
              value={action || ""}
              onValueChange={(value) =>
                onActionChange(row, value as ImportAction)
              }
              disabled={imported || importing}
            >
              <Select.Trigger className="h-8 w-full border-0 bg-background text-xs shadow-none">
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
          </div>
          <Button
            type="button"
            variant={showSearch ? "secondary" : "ghost"}
            size="sm"
            className="h-8 w-8 bg-background px-0"
            onClick={() => setShowSearch(true)}
            aria-label={`Search existing students for line ${row.lineNumber}`}
          >
            <Search className="size-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 bg-background px-0"
                aria-label={`More actions for line ${row.lineNumber}`}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onSelect={() => onNamePartsReset(row.lineNumber)}
              >
                <X className="mr-2 size-4" />
                Reset name structure
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!candidates.length}
                onSelect={() => onActionChange(row, "skip")}
              >
                <MinusCircle className="mr-2 size-4" />
                Skip row
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={imported || importing}
                onSelect={() => onImportRow(row)}
              >
                {importing ? (
                  <RefreshCw className="mr-2 size-4 animate-spin" />
                ) : imported ? (
                  <CheckCircle2 className="mr-2 size-4" />
                ) : (
                  <Import className="mr-2 size-4" />
                )}
                {importing
                  ? "Importing row"
                  : imported
                    ? "Imported"
                    : "Import row"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {needsExistingMatch ? (
            <p className="col-span-3 text-[11px] text-red-600">
              Select a match first.
            </p>
          ) : null}
        </div>
      </div>

      {showResolutionStrip ? (
        <div className="grid gap-2 border-t bg-muted/10 px-3 py-2 lg:grid-cols-[minmax(12rem,18rem)_minmax(0,1fr)]">
          {showMissingClassroom ? (
            <ClassroomSelect
              className="w-full"
              options={classroomOptions}
              value={row.classroomDepartmentId || ""}
              onValueChange={(classroomDepartmentId) =>
                onClassroomChange(row.lineNumber, classroomDepartmentId)
              }
            />
          ) : (
            <div className="hidden lg:block" />
          )}

          <div className="min-w-0 space-y-2">
            {singleRowError ? (
              <ImportExecutionErrorAlert
                error={singleRowError}
                onDismiss={() => onDismissSingleRowError(row.lineNumber)}
              />
            ) : null}
            {pendingNameMatch && !row.fullMatch ? (
              <NameEditMatchSuggestion
                candidate={pendingNameMatch}
                onApprove={() => onPromoteNameMatch(row)}
              />
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
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MatchSummaryPopover({
  candidates,
  decision,
  extraCandidateCount,
  matchStatus,
  needsExistingMatch,
  onCandidateChange,
  primaryCandidate,
}: {
  candidates: MatchCandidate[];
  decision?: RowDecision;
  extraCandidateCount: number;
  matchStatus: "Exact match" | "Possible match" | "No match";
  needsExistingMatch: boolean;
  onCandidateChange: (candidateId: string) => void;
  primaryCandidate: MatchCandidate | null;
}) {
  if (!primaryCandidate) {
    return (
      <div
        className={cn(
          "min-w-0 rounded-md border bg-muted/10 px-2.5 py-1.5 sm:py-2",
          getMatchSelectorBorderClass(matchStatus, needsExistingMatch),
        )}
      >
        <div className="text-xs font-medium text-foreground">No match</div>
      </div>
    );
  }

  const summary = (
    <div className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-foreground">
      <Arabic className="min-w-0 truncate">
        {getCandidateMatchLabel(primaryCandidate)}
      </Arabic>
      {extraCandidateCount > 0 ? (
        <span className="shrink-0 text-[11px] font-normal text-muted-foreground">
          +{extraCandidateCount} more
        </span>
      ) : null}
    </div>
  );

  if (candidates.length <= 1) {
    return (
      <div
        className={cn(
          "min-w-0 rounded-md border bg-background px-2.5 py-2",
          getMatchSelectorBorderClass(matchStatus, needsExistingMatch),
        )}
      >
        {summary}
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "min-w-0 rounded-md border bg-background px-2.5 py-2 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            getMatchSelectorBorderClass(matchStatus, needsExistingMatch),
          )}
        >
          {summary}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(34rem,calc(100vw-2rem))] p-2"
      >
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <div>
            <div className="text-xs font-semibold">Match candidates</div>
            <div className="text-[11px] text-muted-foreground">
              Select the existing student for this row.
            </div>
          </div>
          {needsExistingMatch ? (
            <Badge
              variant="outline"
              className="border-amber-300 text-amber-700"
            >
              Required
            </Badge>
          ) : null}
        </div>
        <div className="grid max-h-80 gap-2 overflow-y-auto">
          {candidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              selected={decision?.existingStudentId === candidate.id}
              onSelect={() => onCandidateChange(candidate.id)}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function getMatchSelectorBorderClass(
  matchStatus: "Exact match" | "Possible match" | "No match",
  needsExistingMatch: boolean,
) {
  if (needsExistingMatch || matchStatus === "Possible match") {
    return "border-amber-300 dark:border-amber-900";
  }

  if (matchStatus === "Exact match") {
    return "border-green-300 dark:border-green-900";
  }

  return "border-border";
}

function getActionSelectorBorderClass(statusLabel: string, isSkipped: boolean) {
  if (isSkipped || statusLabel === "Ready") return "border-border";

  if (statusLabel === "Imported") {
    return "border-green-300 dark:border-green-900";
  }

  return "border-amber-300 dark:border-amber-900";
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
    <div className="inline-flex min-w-0 items-center gap-1 rounded-md border bg-background px-2 py-1">
      <Select
        value={value}
        onValueChange={(nextValue) => {
          const option = selectOptions.find((item) => item.value === nextValue);
          if (option) onValueChange(option);
        }}
      >
        <Select.Trigger
          className="h-5 min-w-0 max-w-[12rem] border-0 bg-transparent p-0 text-left text-xs font-medium shadow-none focus:ring-0"
          aria-label={`Update ${label.toLowerCase()} structure`}
        >
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
    <div className="rounded-md border bg-background p-2.5">
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
  compact = false,
  missing = false,
}: {
  value?: "Male" | "Female";
  onValueChange: (gender: "Male" | "Female") => void;
  compact?: boolean;
  missing?: boolean;
}) {
  return (
    <ToggleGroup
      dir="ltr"
      type="single"
      variant="outline"
      size="sm"
      value={value || ""}
      onValueChange={(nextValue) => {
        if (nextValue === "Male" || nextValue === "Female") {
          onValueChange(nextValue);
        }
      }}
      className={cn(
        "grid grid-cols-2 justify-start rounded-md",
        compact ? "w-[4.25rem]" : "w-full",
        missing && "ring-1 ring-red-300 dark:ring-red-900",
      )}
    >
      <ToggleGroupItem
        value="Male"
        aria-label="Set row gender to Male"
        className={cn(
          "min-w-0 bg-background",
          compact ? "h-6 px-2" : "h-8",
          missing &&
            "border-red-300 text-red-700 dark:border-red-900 dark:text-red-300",
        )}
      >
        M
      </ToggleGroupItem>
      <ToggleGroupItem
        value="Female"
        aria-label="Set row gender to Female"
        className={cn(
          "min-w-0 bg-background",
          compact ? "h-6 px-2" : "h-8",
          missing &&
            "border-red-300 text-red-700 dark:border-red-900 dark:text-red-300",
        )}
      >
        F
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

function getCandidateMatchLabel(candidate: MatchCandidate) {
  const classroom = candidate.classRoom?.trim() || "No classroom";
  return `${studentDisplayName(candidate)} - ${classroom}`;
}

function getClassDepartmentDisplayName(classroom: ClassDepartment) {
  const className = classroom.classRoom?.name?.trim();
  const departmentName = classroom.departmentName?.trim();

  if (className && departmentName && className !== departmentName) {
    return `${className} - ${departmentName}`;
  }

  return departmentName || className || "Classroom";
}

function getNameDirection(
  row: Pick<VerifyResult, "name" | "surname" | "otherName">,
): "ltr" | "rtl" {
  return hasArabicText([row.name, row.surname, row.otherName || ""].join(" "))
    ? "rtl"
    : "ltr";
}

function hasArabicText(value: string) {
  return ARABIC_SCRIPT_RE.test(value);
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
              {getCandidateMatchLabel(candidate)}
            </Arabic>
          </Item.Title>
        </Item.Content>
      </button>
    </Item>
  );
}

function isRowChecked(
  checkedRows: Record<number, boolean>,
  lineNumber: number,
) {
  return isStudentImportRowChecked(checkedRows, lineNumber);
}

function getRowClassroomDepartmentId(
  row: Pick<VerifyResult, "classroomDepartmentId" | "lineNumber">,
  fallbackClassroomDepartmentId: string,
  manualClassroomRequiredLineNumbers: Set<number> = new Set(),
) {
  return getStudentImportRowClassroomDepartmentId(
    row,
    fallbackClassroomDepartmentId,
    manualClassroomRequiredLineNumbers,
  );
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

  if (isStudentImportAutoSkippedRow(row, decision)) {
    return { status: "skipped" };
  }

  const existingStudentId = needsExisting
    ? decision?.existingStudentId || getSingleCandidateId(row)
    : null;

  if (needsExisting && !existingStudentId) {
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
      existingStudentId,
    },
  };
}

function sanitizeRowDecisions(
  decisions: StudentImportReviewDraft["rowDecisions"] | undefined,
) {
  if (!decisions) return {};

  return Object.fromEntries(
    Object.entries(decisions).flatMap(([lineNumber, decision]) => {
      if (!decision) return [];
      if (
        decision.action &&
        decision.action !== "import_new" &&
        decision.action !== "keep_match" &&
        decision.action !== "update_match_with_name" &&
        decision.action !== "skip"
      ) {
        return [];
      }

      return [
        [
          Number(lineNumber),
          {
            action: decision.action,
            existingStudentId: decision.existingStudentId ?? null,
            touched: Boolean(decision.touched),
          } satisfies RowDecision,
        ],
      ];
    }),
  );
}

function sanitizeManualGenders(
  genders: StudentImportReviewDraft["manualGenders"] | undefined,
) {
  if (!genders) return {};

  return Object.fromEntries(
    Object.entries(genders).filter(
      ([, gender]) => gender === "Male" || gender === "Female",
    ),
  ) as Record<number, "Male" | "Female">;
}

function getDefaultRowDecision(row: VerifyResult): RowDecision | undefined {
  if (row.fullMatch) {
    return {
      action: "keep_match",
      existingStudentId: row.fullMatch.id,
      touched: false,
    };
  }

  if (row.suspectedMatches.length === 0) {
    return {
      action: "import_new",
      existingStudentId: null,
      touched: false,
    };
  }

  return undefined;
}

function reconcileRowDecisions(
  rows: VerifyResult[],
  current: Record<number, RowDecision>,
) {
  const next: Record<number, RowDecision> = {};

  for (const row of rows) {
    const existing = current[row.lineNumber];
    const defaultDecision = getDefaultRowDecision(row);

    if (row.fullMatch?.isCurrentTermMatch && defaultDecision) {
      next[row.lineNumber] = defaultDecision;
      continue;
    }

    if (row.fullMatch && existing?.action === "import_new" && defaultDecision) {
      next[row.lineNumber] = defaultDecision;
      continue;
    }

    if (existing?.action) {
      next[row.lineNumber] = existing;
      continue;
    }

    if (defaultDecision) {
      next[row.lineNumber] = defaultDecision;
    }
  }

  return next;
}

function reconcileCheckedRows(
  rows: VerifyResult[],
  current: Record<number, boolean>,
) {
  const next: Record<number, boolean> = {};

  for (const row of rows) {
    next[row.lineNumber] = current[row.lineNumber] ?? true;
  }

  return next;
}

function pickLineNumberRecord<T>(
  record: Record<number, T>,
  rows: Array<Pick<VerifyResult, "lineNumber">>,
) {
  const lineNumbers = new Set(rows.map((row) => row.lineNumber));
  const next: Record<number, T> = {};

  for (const [lineNumber, value] of Object.entries(record)) {
    const numericLineNumber = Number(lineNumber);
    if (lineNumbers.has(numericLineNumber)) {
      next[numericLineNumber] = value;
    }
  }

  return next;
}

function getCleanImportResultKey(result: ImportExecutionResult | undefined) {
  if (!result || result.failedRows > 0) return null;

  if ("status" in result) {
    return result.status === "COMPLETED" ? `job:${result.id}` : null;
  }

  return `direct:${result.createdStudents}:${result.keptMatches}:${result.updatedMatches}:${result.skippedRows}`;
}

function isFinalStudentImportJob(job: StudentImportJob) {
  return (
    job.status === "COMPLETED" ||
    job.status === "COMPLETED_WITH_FAILURES" ||
    job.status === "FAILED" ||
    job.status === "CANCELLED"
  );
}

function getStableStudentImportJob(
  next: StudentImportJob,
  current: StudentImportJob | null,
) {
  if (!current || current.id !== next.id) return next;
  if (isFinalStudentImportJob(current) && !isFinalStudentImportJob(next)) {
    return current;
  }

  return next;
}

function filterRowsByClassroom({
  activeClassroomFilterId,
  fallbackClassroomDepartmentId,
  manualClassroomRequiredLineNumbers,
  rows,
}: {
  activeClassroomFilterId: string;
  fallbackClassroomDepartmentId: string;
  manualClassroomRequiredLineNumbers: Set<number>;
  rows: VerifyResult[];
}) {
  if (activeClassroomFilterId === "all") return rows;

  return rows.filter((row) => {
    const classroomDepartmentId = getRowClassroomDepartmentId(
      row,
      fallbackClassroomDepartmentId,
      manualClassroomRequiredLineNumbers,
    );

    return (classroomDepartmentId || "unassigned") === activeClassroomFilterId;
  });
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
    const existingStudentId =
      decision?.existingStudentId || getSingleCandidateId(row);
    const autoSkipped = isStudentImportAutoSkippedRow(row, decision);
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
      !autoSkipped &&
      (!needsExisting || Boolean(existingStudentId));
    const needsAttention =
      !classroomDepartmentId ||
      !hasGender ||
      !action ||
      (needsExisting && !existingStudentId) ||
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
      const rowOtherName = normalizeSearchText(row.otherName);
      const studentName = normalizeSearchText(student.name);
      const studentSurname = normalizeSearchText(student.surname);
      const studentOtherName = normalizeSearchText(student.otherName);
      const isExactFullName =
        Boolean(rowName) &&
        Boolean(rowSurname) &&
        rowName === studentName &&
        rowSurname === studentSurname &&
        rowOtherName === studentOtherName;

      return {
        student,
        index,
        isExactFullName,
        score: scoreStudentRecommendation(row, student),
      };
    })
    .filter(
      ({ isExactFullName, score }) => isExactFullName || score >= 70,
    )
    .sort((a, b) => {
      if (a.isExactFullName !== b.isExactFullName) {
        return a.isExactFullName ? -1 : 1;
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
    confidence: match.isExactFullName ? 100 : 80,
    reason: match.isExactFullName
      ? "Name edit matches existing student full name"
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

  possibleNames.push({
    value: EMPTY_OTHER_NAME_VALUE,
    as: "otherName",
    start: -1,
    end: -1,
  });

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

  if (value === EMPTY_OTHER_NAME_VALUE) {
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
  if (row.fullMatch?.confidence === 100) {
    return [row.fullMatch];
  }

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

function getSingleCandidateId(row: VerifyResult) {
  const candidates = getCandidates(row);
  return candidates.length === 1 ? candidates[0]?.id || null : null;
}

function resolveGender(
  row: VerifyResult,
  manualGender?: "Male" | "Female",
): "Male" | "Female" | null {
  return resolveStudentImportGender(row, manualGender);
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
