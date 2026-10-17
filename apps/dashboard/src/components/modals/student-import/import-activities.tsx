import { Arabic } from "@/components/arabic";
import { useTRPC } from "@/trpc/client";
import { useStudentNameFormatter } from "@/components/student-name-format/provider";
import { StudentImportReviewFooter } from "./review-footer";
import {
  type ReviewGroup,
  type ReviewGroupKey,
  type ReviewListRow,
  type ReviewRowTone,
  StudentImportReviewList,
} from "./review-list";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Alert, AlertDescription, AlertTitle } from "@school-clerk/ui/alert";
import { Badge, badgeVariants } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Checkbox } from "@school-clerk/ui/checkbox";
import { cn } from "@school-clerk/ui/cn";
import { ComboboxDropdown } from "@school-clerk/ui/combobox-dropdown";
import { Item, Select } from "@school-clerk/ui/composite";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@school-clerk/ui/drawer";
import { useMediaQuery } from "@school-clerk/ui/hooks/use-media-query";
import { Progress } from "@school-clerk/ui/progress";
import { Separator } from "@school-clerk/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@school-clerk/ui/toggle-group";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  Import,
  MinusCircle,
	MoreHorizontal,
  PencilLine,
  RefreshCw,
  Search,
  SlidersHorizontal,
  UserCheck,
  UserPlus,
  X,
  XCircle,
} from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StudentImportReviewDraft } from "./draft-storage";
import {
  type NormalizedStudentImportError,
	normalizeStudentImportError,
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
  RouterOutputs["students"]["getStudentImportReference"]["students"][number];
type ClassDepartment =
  RouterOutputs["students"]["getStudentImportReference"]["classDepartments"][number];
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
  admissionType: "UNCLASSIFIED" | "NEW_ADMISSION" | "RETURNING";
};
type ImportAction =
  "import_new" | "keep_match" | "update_match_with_name" | "skip";

type RowDecision = {
  action?: ImportAction;
  existingStudentId?: string | null;
  admissionType?: "UNCLASSIFIED" | "NEW_ADMISSION" | "RETURNING";
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
	const _trpc = useTRPC();
	const _qc = useQueryClient();
	const formatStudentName = useStudentNameFormatter();
  const [classroomDeptId, setClassroomDeptId] = useState<string>(
    () => savedDraft?.classroomDeptId || "",
  );
  const [admissionType, setAdmissionType] = useState<
    "UNCLASSIFIED" | "NEW_ADMISSION" | "RETURNING"
  >(() => savedDraft?.admissionType ?? "UNCLASSIFIED");
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
  const [showReviewDefaults, setShowReviewDefaults] = useState(false);
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
  const lastVerificationInputKeyRef = useRef<string | null>(null);
  const lastPersistedDraftJsonRef = useRef<string | null>(null);
  const clearedCleanDraftResultKeyRef = useRef<string | null>(null);

  const {
    data: referenceRecords,
    refetch: refetchRecentRecords,
    isPending: isRecentRecordsPending,
    isError: isReferenceRecordsError,
  } = useQuery(
    _trpc.students.getStudentImportReference.queryOptions(undefined, { enabled: isActive, retry: false, staleTime: 0, refetchOnMount: "always" }),
  );
  const records = isReferenceRecordsError ? undefined : referenceRecords;

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
          student.gender === "M" || student.gender === "Male"
            ? ("Male" as const)
            : student.gender === "F" || student.gender === "Female"
              ? ("Female" as const)
              : null,
      })),
    };
  }, [classroomDeptId, manualClassroomDepartmentIds, students]);
  const verifyInputKey = useMemo(
    () => (verifyInput ? JSON.stringify(verifyInput) : null),
    [verifyInput],
  );

  const { mutateAsync: requestVerification } = useMutation(
    _trpc.students.verifyStudentImportBatch.mutationOptions({
      retry: false,
      networkMode: "always",
    }),
  );
  // Verification is fired from an effect. Under StrictMode the effect's first pass runs before the
  // simulated unmount, which detaches the useMutation observer from that in-flight mutation, and the
  // ref guard below rightly skips a second request, so the observer never saw the result and the
  // review hung on "Checking rows". Tracking the request's own promise keeps the result.
  const [verification, setVerification] = useState<{
    status: "idle" | "pending" | "success" | "error";
    data?: RouterOutputs["students"]["verifyStudentImport"];
    error?: unknown;
  }>({ status: "idle" });
  const verificationRequestRef = useRef(0);
  const verifyStudents = useCallback(
    (input: NonNullable<typeof verifyInput>) => {
      const requestId = ++verificationRequestRef.current;
      setVerification({ status: "pending" });
      requestVerification(input).then(
        (data) => {
          if (requestId === verificationRequestRef.current) {
            setVerification({ status: "success", data });
          }
        },
        (error) => {
          if (requestId === verificationRequestRef.current) {
            setVerification({ status: "error", error });
          }
        },
      );
    },
    [requestVerification],
  );
  const resetVerification = useCallback(() => {
    verificationRequestRef.current += 1;
    setVerification({ status: "idle" });
  }, []);
  const verificationReport =
    verification.status === "success" ? verification.data : undefined;
  const isVerifying = verification.status === "pending";
  const verificationError =
    verification.status === "error" ? verification.error : null;

  useEffect(() => {
    if (!isActive) {
      lastVerificationInputKeyRef.current = null;
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    if (!verifyInput) return;
    if (!verifyInputKey) return;
    if (lastVerificationInputKeyRef.current === verifyInputKey) return;

    lastVerificationInputKeyRef.current = verifyInputKey;
    resetVerification();
    verifyStudents(verifyInput);
	}, [
		isActive,
		resetVerification,
		verifyInput,
		verifyInputKey,
		verifyStudents,
	]);

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
      retry: false,
      networkMode: "always",
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
        // The realtime run only signals completion (and large jobs continue in follow-up runs),
        // so poll the job for live row progress while it is still working.
        refetchInterval: (query) => {
          const status = query.state.data?.status;
          return status === "PENDING" || status === "RUNNING" ? 3_000 : false;
        },
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
        retry: false,
        networkMode: "always",
        onSuccess(result, variables) {
          // The import reference (every student in the school) is not refetched per row; the row
          // is marked imported locally and the batch path refreshes the reference when it finishes.
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
        ...current,
        action,
        existingStudentId: needsExisting ? fallbackMatchId || null : null,
        touched: true,
      };
    });
  };

  const setRowAdmissionType = (
    lineNumber: number,
    nextAdmissionType: "UNCLASSIFIED" | "NEW_ADMISSION" | "RETURNING",
  ) => {
    setDecision(lineNumber, (current) => ({
      ...current,
      admissionType: nextAdmissionType,
      touched: true,
    }));
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

  const setLinesChecked = (lineNumbers: number[], checked: boolean) => {
    if (!lineNumbers.length) return;
    setCheckedRows((current) => {
      const next = { ...current };
      for (const lineNumber of lineNumbers) next[lineNumber] = checked;
      return next;
    });
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
        fallbackAdmissionType: admissionType,
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
      fallbackAdmissionType: admissionType,
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
  const stableActiveImportJob = activeImportJob
    ? getStableStudentImportJob(activeImportJob, lastActiveImportJob)
    : lastActiveImportJob;
  const displayedImportJob =
    (isActive && activeImportJobId
      ? (stableActiveImportJob ?? startedImportJob)
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

    _qc.invalidateQueries({ queryKey: _trpc.students.getStudentImportReference.queryKey() });
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
      ? `Import ${executableRowCount} student${executableRowCount === 1 ? "" : "s"}`
      : skippedBeforeExecution > 0
        ? `Finish import (${skippedBeforeExecution} skipped)`
        : "Import students";

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
				label: [formatStudentName(student), student.classRoom, student.termName]
          .filter(Boolean)
          .join(" "),
        student,
      })),
		[formatStudentName, records?.students],
  );
  const reviewDraft = useMemo<StudentImportReviewDraft>(
    () => ({
      sourceRaw,
      admissionType,
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

  const compact = useMediaQuery("(max-width: 639px)");
  const [expandedLineNumber, setExpandedLineNumber] = useState<number | null>(
    null,
  );
  const [drawerLineNumber, setDrawerLineNumber] = useState<number | null>(null);
  // The open row keeps its group until it is closed so fixing it doesn't make it jump away.
  const [pinnedRow, setPinnedRow] = useState<{
    lineNumber: number;
    group: ReviewGroupKey;
  } | null>(null);
  const rowByLineNumber = useMemo(
    () => new Map(rows.map((row) => [row.lineNumber, row])),
    [rows],
  );
  const { reviewGroups, groupByLineNumber } = useMemo(() => {
    const buckets: Record<ReviewGroupKey, ReviewListRow[]> = {
      attention: [],
      matched: [],
      ready: [],
      imported: [],
    };
    const groupByLine = new Map<number, ReviewGroupKey>();

    for (const row of filteredRows) {
      const classroomDepartmentId = getRowClassroomDepartmentId(
        row,
        classroomDeptId,
        manualClassroomRequiredLineNumbers,
      );
      const classroom = classroomDepartmentId
        ? classroomById.get(classroomDepartmentId)
        : undefined;
      const view = buildReviewListRow({
        row,
        decision: rowDecisions[row.lineNumber],
        manualGender: manualGenders[row.lineNumber],
        classroomDepartmentId,
        classroomLabel: showRowClassroom
          ? classroom
            ? getClassDepartmentDisplayName(classroom)
            : row.classRoom || null
          : null,
        checked: isRowChecked(checkedRows, row.lineNumber),
        imported: Boolean(importedLineNumbers[row.lineNumber]),
        importing: importingLineNumber === row.lineNumber,
        error: singleRowErrors[row.lineNumber] ?? null,
        formatStudentName,
      });
      const group =
        pinnedRow?.lineNumber === row.lineNumber ? pinnedRow.group : view.group;
      buckets[group].push(view);
      groupByLine.set(row.lineNumber, group);
    }

    return {
      groupByLineNumber: groupByLine,
      reviewGroups: [
        { key: "attention", title: "Needs you", rows: buckets.attention },
        { key: "matched", title: "Matches found", rows: buckets.matched },
        { key: "ready", title: "Ready", rows: buckets.ready },
        { key: "imported", title: "Imported", rows: buckets.imported },
      ] satisfies ReviewGroup[],
    };
  }, [
    checkedRows,
    classroomById,
    classroomDeptId,
    filteredRows,
    formatStudentName,
    importedLineNumbers,
    importingLineNumber,
    manualClassroomRequiredLineNumbers,
    manualGenders,
    pinnedRow,
    rowDecisions,
    showRowClassroom,
    singleRowErrors,
  ]);
  const closeOpenRow = () => {
    setExpandedLineNumber(null);
    setDrawerLineNumber(null);
    setPinnedRow(null);
  };
  const openRow = (lineNumber: number) => {
    const group = groupByLineNumber.get(lineNumber);
    if (compact) {
      setDrawerLineNumber(lineNumber);
    } else if (expandedLineNumber === lineNumber) {
      closeOpenRow();
      return;
    } else {
      setExpandedLineNumber(lineNumber);
    }
    setPinnedRow(group ? { lineNumber, group } : null);
  };

  // Hand an open row between the inline editor and the bottom sheet when the viewport crosses the breakpoint.
  useEffect(() => {
    if (compact && expandedLineNumber != null) {
      setDrawerLineNumber(expandedLineNumber);
      setExpandedLineNumber(null);
    } else if (!compact && drawerLineNumber != null) {
      setExpandedLineNumber(drawerLineNumber);
      setDrawerLineNumber(null);
    }
  }, [compact, drawerLineNumber, expandedLineNumber]);

  // Stable callbacks keep memoized list rows from re-rendering on unrelated state changes.
  const listHandlerImpl = {
    openRow,
    importRow: (lineNumber: number) => {
      const row = rowByLineNumber.get(lineNumber);
      if (row) executeOne(row);
    },
    toggleChecked: setRowChecked,
    groupChecked: (group: ReviewGroupKey, checked: boolean) => {
      const lines = reviewGroups
        .find((item) => item.key === group)
        ?.rows.filter((row) => !row.imported);
      if (lines) setLinesChecked(lines.map((row) => row.lineNumber), checked);
    },
  };
  const listHandlersRef = useRef(listHandlerImpl);
  listHandlersRef.current = listHandlerImpl;
  const listHandlers = useMemo(
    () => ({
      onOpenRow: (lineNumber: number) =>
        listHandlersRef.current.openRow(lineNumber),
      onImportRow: (lineNumber: number) =>
        listHandlersRef.current.importRow(lineNumber),
      onToggleChecked: (lineNumber: number, checked: boolean) =>
        listHandlersRef.current.toggleChecked(lineNumber, checked),
      onGroupChecked: (group: ReviewGroupKey, checked: boolean) =>
        listHandlersRef.current.groupChecked(group, checked),
    }),
    [],
  );

  const attentionCount = reviewGroups[0].rows.length;
  const readyToImportCount = reviewModel.counts.executableRows;
  const importedCount = reviewGroups[3].rows.length;
  const reviewSummary = [
    `${filteredRows.length} row${filteredRows.length === 1 ? "" : "s"}`,
    attentionCount ? `${attentionCount} need you` : null,
    `${readyToImportCount} ready to import`,
    importedCount ? `${importedCount} imported` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const drawerRow =
    drawerLineNumber != null ? rowByLineNumber.get(drawerLineNumber) : undefined;
  const drawerView = drawerRow
    ? reviewGroups
        .flatMap((group) => group.rows)
        .find((row) => row.lineNumber === drawerRow.lineNumber)
    : undefined;

  const renderRowDetails = (lineNumber: number) => {
    const row = rowByLineNumber.get(lineNumber);
    if (!row) return null;

    return (
      <StudentImportRowDetails
        row={row}
        decision={rowDecisions[row.lineNumber]}
        manualGender={manualGenders[row.lineNumber]}
        fallbackAdmissionType={admissionType}
        classroomOptions={records?.classDepartments ?? []}
        classroomDepartmentId={getRowClassroomDepartmentId(
          row,
          classroomDeptId,
          manualClassroomRequiredLineNumbers,
        )}
        isNameDirty={Boolean(nameOverrides[row.lineNumber])}
        lockedNameSpans={
          nameOverrides[row.lineNumber]?.lockedSpans || EMPTY_LOCKED_NAME_SPANS
        }
        pendingSearchMatch={pendingSearchMatches[row.lineNumber]}
        pendingNameMatch={pendingNameMatches[row.lineNumber]}
        studentSearchItems={studentSearchItems}
        disabled={
          Boolean(importedLineNumbers[row.lineNumber]) ||
          importingLineNumber === row.lineNumber
        }
        singleRowError={singleRowErrors[row.lineNumber] ?? null}
        layout={compact ? "drawer" : "inline"}
        onActionChange={setAction}
        onAdmissionTypeChange={setRowAdmissionType}
        onCandidateChange={setCandidate}
        onNamePartChange={setNamePart}
        onNamePartsReset={resetNameParts}
        onSearchStudentSelect={selectSearchStudent}
        onPromoteSearchMatch={promoteSearchMatch}
        onPromoteNameMatch={promoteNameMatch}
        onClassroomChange={setRowClassroom}
        onDismissSingleRowError={(line) =>
          setSingleRowErrors((current) => ({ ...current, [line]: null }))
        }
        onGenderChange={(line, gender) =>
          setManualGenders((current) => ({ ...current, [line]: gender }))
        }
        onClose={closeOpenRow}
      />
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {!showExecutionOnly ? (
        <div className="shrink-0 space-y-2 border-b pb-2">
          <div className="flex items-center gap-2">
            <p
              className="min-w-0 flex-1 truncate text-xs text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              {isVerifying ? "Checking rows…" : reviewSummary}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 gap-1.5 text-xs"
              aria-expanded={showReviewDefaults}
              aria-controls="student-import-review-defaults"
              onClick={() => setShowReviewDefaults((visible) => !visible)}
            >
              <SlidersHorizontal className="size-3.5" aria-hidden="true" />
              Import settings
            </Button>
          </div>

          {showReviewDefaults ? (
            <div
              id="student-import-review-defaults"
              className="grid gap-3 rounded-md border bg-muted/20 p-3 sm:grid-cols-2 lg:grid-cols-4"
            >
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-xs font-medium">Fallback classroom</span>
                <Select
                  value={classroomDeptId}
                  onValueChange={(value) => {
                    setClassroomDeptId(value);
                  }}
                >
                  <Select.Trigger className="h-10 w-full min-w-0 bg-background sm:h-9">
                    <Select.Value
                      placeholder={
                        isRecentRecordsPending
                          ? "Loading classrooms..."
                          : "For rows without a class header"
                      }
                    />
                  </Select.Trigger>
                  <Select.Content className="max-h-60 overflow-y-auto">
                    {records?.classDepartments?.map((classroom) => (
                      <Select.Item value={classroom.id} key={classroom.id}>
                        {getClassDepartmentDisplayName(classroom)}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>

              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-xs font-medium">Admission status</span>
                <Select
                  value={admissionType}
                  onValueChange={(value) =>
                    setAdmissionType(
                      value as "UNCLASSIFIED" | "NEW_ADMISSION" | "RETURNING",
                    )
                  }
                >
                  <Select.Trigger className="h-10 w-full bg-background sm:h-9">
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="UNCLASSIFIED">
                      Needs classification
                    </Select.Item>
                    <Select.Item value="NEW_ADMISSION">New admission</Select.Item>
                    <Select.Item value="RETURNING">Returning student</Select.Item>
                  </Select.Content>
                </Select>
              </div>

              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-xs font-medium">
                  Exact and possible matches
                </span>
                <div className="flex gap-2">
                  <BatchActionSelect
                    placeholder="Exact default"
                    onValueChange={(action) => applyBatch("exact", action)}
                  />
                  <BatchActionSelect
                    placeholder="Possible default"
                    onValueChange={(action) => applyBatch("suspected", action)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    refetchRecentRecords();
                    refetchVerification();
                  }}
                  className="h-10 sm:h-9"
                  type="button"
                >
                  <RefreshCw className="mr-2 size-4" />
                  Recheck rows
                </Button>
                {onCancelImport ? (
                  <Button
                    variant="ghost"
                    onClick={onCancelImport}
                    className="h-10 sm:h-9"
                    type="button"
                    disabled={isExecutingBatch}
                  >
                    Back to paste
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          <ClassroomFilterChips
            activeFilterId={activeClassroomFilterId}
            breakdown={classroomBreakdown}
            onFilterChange={(filterId) => {
              closeOpenRow();
              setActiveClassroomFilterId(filterId);
            }}
          />
        </div>
      ) : null}

      {isExecutingBatch || batchResult ? (
        <div className="min-h-0 flex-1 overflow-y-auto pt-3">
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
        </div>
      ) : null}

      {!showExecutionOnly ? (
        <>
          {executionError ? (
            <div className="shrink-0 pt-2">
              <ImportExecutionErrorAlert
                error={executionError}
                onDismiss={dismissExecutionError}
              />
            </div>
          ) : null}

          {isVerifying && !rows.length ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-12 text-center text-xs">
              <RefreshCw className="size-5 animate-spin text-primary" />
              <div>
                <p className="font-medium text-foreground">Checking rows</p>
                <p className="mt-1 text-muted-foreground">
                  Looking for duplicates, matches, classrooms and missing
                  values.
                </p>
              </div>
            </div>
          ) : (
            <StudentImportReviewList
              groups={reviewGroups}
              compact={compact}
              expandedLineNumber={expandedLineNumber}
              isAnyRowImporting={importingLineNumber != null}
              renderExpanded={renderRowDetails}
              emptyState={
                activeClassroomFilterId === "all"
                  ? "Nothing to review."
                  : "No rows for this classroom."
              }
              {...listHandlers}
            />
          )}

          <StudentImportReviewFooter
            counts={reviewModel.counts}
            disabledReason={reviewModel.disabledReason}
            isVerifying={isVerifying}
            isExecuting={isExecutingBatch}
            canStartImport={reviewModel.canStartImport}
            actionLabel={importActionLabel}
            onExecute={executeAll}
            onUncheckBlocked={
              reviewModel.blockedLineNumbers.length
                ? () => setLinesChecked(reviewModel.blockedLineNumbers, false)
                : undefined
            }
          />

          <Drawer
            open={compact && Boolean(drawerRow)}
            onOpenChange={(open) => {
              if (!open) closeOpenRow();
            }}
            shouldScaleBackground={false}
          >
            <DrawerContent className="max-h-[88dvh]">
              {drawerRow && drawerView ? (
                <>
                  <DrawerHeader className="px-4 pt-3 pb-2 text-left">
                    <DrawerTitle
                      dir={drawerView.dir}
                      className="truncate text-base"
                    >
                      {drawerView.primaryName}
                      {drawerView.secondaryName ? (
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          {drawerView.secondaryName}
                        </span>
                      ) : null}
                    </DrawerTitle>
                    <DrawerDescription className="text-xs">
                      Line {drawerRow.lineNumber}
                      {drawerRow.classRoom ? ` · ${drawerRow.classRoom}` : ""}
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
                    {drawerView.imported ? (
                      <div className="flex flex-col items-center gap-2 py-6 text-center">
                        <span className="flex size-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                          <CheckCircle2 className="size-6" />
                        </span>
                        <p className="font-medium">Imported</p>
                        <p className="text-sm text-muted-foreground">
                          {drawerView.statusText}
                        </p>
                      </div>
                    ) : (
                      renderRowDetails(drawerRow.lineNumber)
                    )}
                  </div>
                  <DrawerFooter className="flex-row gap-2 border-t pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
                    {drawerView.imported ? (
                      <Button
                        type="button"
                        className="h-11 flex-1"
                        onClick={closeOpenRow}
                      >
                        Done
                      </Button>
                    ) : (
                      <>
                        {getCandidates(drawerRow).length ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-11 flex-1"
                            disabled={drawerView.importing}
                            onClick={() => setAction(drawerRow, "skip")}
                          >
                            Skip
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          className="h-11 flex-[2]"
                          disabled={
                            !drawerView.canImport || importingLineNumber != null
                          }
                          onClick={() => executeOne(drawerRow)}
                        >
                          {drawerView.importing ? (
                            <RefreshCw className="mr-2 size-4 animate-spin" />
                          ) : (
                            <Import className="mr-2 size-4" />
                          )}
                          {drawerView.importing
                            ? "Importing…"
                            : "Import this row"}
                        </Button>
                      </>
                    )}
                  </DrawerFooter>
                </>
              ) : null}
            </DrawerContent>
          </Drawer>
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

      <ClassroomBreakdownStrip breakdown={classroomBreakdown} />

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
  breakdown,
}: {
  breakdown: ClassroomBreakdown[];
}) {
  if (breakdown.length < 2) return null;

  return (
    <div className="space-y-1.5 border-t bg-muted/10 px-3 py-2 text-xs">
      <span className="font-medium text-foreground">
        {breakdown.length} classrooms
      </span>
      <div className="flex flex-wrap gap-1.5">
        {breakdown.map((item) => (
          <Badge
            key={item.id}
            variant="outline"
            className="h-auto max-w-full gap-1 bg-background px-2 py-1 text-[11px]"
          >
            <Arabic>{item.label}</Arabic>
            <span className="text-muted-foreground">
              {item.checkedRows} of {item.totalRows} checked
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

function ClassroomFilterChips({
  activeFilterId,
  breakdown,
  onFilterChange,
}: {
  activeFilterId: string;
  breakdown: ClassroomBreakdown[];
  onFilterChange: (filterId: string) => void;
}) {
  if (breakdown.length < 2) return null;

  const total = breakdown.reduce((sum, item) => sum + item.totalRows, 0);
  const chips = [
    { id: "all", label: "All", totalRows: total, attentionRows: 0 },
    ...breakdown,
  ];

  return (
    <div
      className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]"
      role="group"
      aria-label="Filter by classroom"
    >
      {chips.map((chip) => {
        const active = activeFilterId === chip.id;
        return (
          <button
            key={chip.id}
            type="button"
            aria-pressed={active}
            onClick={() => onFilterChange(chip.id)}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:h-8",
              active
                ? "border-primary bg-primary/10 font-medium text-foreground"
                : "bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="max-w-[12rem] truncate">{chip.label}</span>
            <span className="tabular-nums opacity-70">{chip.totalRows}</span>
            {chip.attentionRows > 0 ? (
              <span
                className="size-1.5 rounded-full bg-amber-500"
                aria-label={`${chip.attentionRows} need attention`}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

const ACTION_CHOICES: { value: ImportAction; label: string }[] = [
  { value: "keep_match", label: "Keep match" },
  { value: "update_match_with_name", label: "Update name" },
  { value: "import_new", label: "Import new" },
  { value: "skip", label: "Skip" },
];

function StudentImportRowDetails({
  row,
  decision,
  manualGender,
  fallbackAdmissionType,
  classroomOptions,
  classroomDepartmentId,
  isNameDirty,
  lockedNameSpans,
  pendingSearchMatch,
  pendingNameMatch,
  studentSearchItems,
  disabled,
  singleRowError,
  layout,
  onActionChange,
  onAdmissionTypeChange,
  onCandidateChange,
  onNamePartChange,
  onNamePartsReset,
  onSearchStudentSelect,
  onPromoteSearchMatch,
  onPromoteNameMatch,
  onClassroomChange,
  onDismissSingleRowError,
  onGenderChange,
  onClose,
}: {
  row: VerifyResult;
  decision?: RowDecision;
  manualGender?: "Male" | "Female";
  fallbackAdmissionType: "UNCLASSIFIED" | "NEW_ADMISSION" | "RETURNING";
  classroomOptions: ClassDepartment[];
  classroomDepartmentId: string;
  isNameDirty: boolean;
  lockedNameSpans: Partial<Record<EditableNamePart, NameTokenSpan>>;
  pendingSearchMatch?: MatchCandidate;
  pendingNameMatch?: MatchCandidate;
  studentSearchItems: StudentSearchItem[];
  disabled: boolean;
  singleRowError: NormalizedStudentImportError | null;
  layout: "inline" | "drawer";
  onActionChange: (row: VerifyResult, action: ImportAction) => void;
  onAdmissionTypeChange: (
    lineNumber: number,
    admissionType: "UNCLASSIFIED" | "NEW_ADMISSION" | "RETURNING",
  ) => void;
  onCandidateChange: (row: VerifyResult, candidateId: string) => void;
  onNamePartChange: (row: VerifyResult, option: NamePartOption) => void;
  onNamePartsReset: (lineNumber: number) => void;
  onSearchStudentSelect: (row: VerifyResult, student: ExistingStudent) => void;
  onPromoteSearchMatch: (row: VerifyResult) => void;
  onPromoteNameMatch: (row: VerifyResult) => void;
  onClassroomChange: (lineNumber: number, classroomDepartmentId: string) => void;
  onDismissSingleRowError: (lineNumber: number) => void;
  onGenderChange: (lineNumber: number, gender: "Male" | "Female") => void;
  onClose: () => void;
}) {
  const [showSearch, setShowSearch] = useState(false);
  const candidates = useMemo(() => getCandidates(row), [row]);
  const possibleNames = useMemo(
    () => getPossibleNamePartOptions(row, isNameDirty, lockedNameSpans),
    [isNameDirty, lockedNameSpans, row],
  );
  const action = decision?.action;
  const resolvedGender = resolveGender(row, manualGender);
  const blockers = getReviewRowBlockers({
    row,
    decision,
    manualGender,
    classroomDepartmentId,
  });
  const selectedCandidateId =
    decision?.existingStudentId ||
    (candidates.length === 1 ? candidates[0]?.id : null);
  const showCandidates =
    candidates.length > 0 &&
    (!action || action === "keep_match" || action === "update_match_with_name");
  const nameDirection = getNameDirection(row);
  const fieldLabel = "text-xs font-medium text-foreground";

  return (
    <fieldset
      disabled={disabled}
      aria-label={`Edit import line ${row.lineNumber}`}
      className="min-w-0 space-y-4 pt-2 text-sm"
      onKeyDown={(event) => {
        if (layout === "inline" && event.key === "Escape" && !event.defaultPrevented) {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      {singleRowError ? (
        <ImportExecutionErrorAlert
          error={singleRowError}
          onDismiss={() => onDismissSingleRowError(row.lineNumber)}
        />
      ) : null}

      {blockers.length ? (
        <p className="rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          To import: {blockers.map((item) => item.toLowerCase()).join(" · ")}
        </p>
      ) : null}

      {candidates.length ? (
        <div className="space-y-2">
          <span className={fieldLabel}>What should happen?</span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Import action">
            {ACTION_CHOICES.map((choice) => (
              <button
                key={choice.value}
                type="button"
                aria-pressed={action === choice.value}
                onClick={() => onActionChange(row, choice.value)}
                className={cn(
                  "h-9 rounded-md border px-3 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8",
                  action === choice.value
                    ? "border-primary bg-primary/10 font-medium text-foreground"
                    : "bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                {choice.label}
              </button>
            ))}
          </div>
          {showCandidates ? (
            <div className="grid gap-1.5" role="radiogroup" aria-label="Existing student">
              {candidates.map((candidate) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  selected={selectedCandidateId === candidate.id}
                  onSelect={() => onCandidateChange(row, candidate.id)}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "grid gap-4",
          layout === "inline" && "sm:grid-cols-2 lg:grid-cols-3",
        )}
      >
        <div className="space-y-1.5">
          <span className={fieldLabel}>Gender</span>
          <GenderToggle
            value={resolvedGender || undefined}
            missing={!resolvedGender}
            onValueChange={(gender) => onGenderChange(row.lineNumber, gender)}
          />
          {row.inferredGender && !manualGender ? (
            <p className="text-[11px] text-muted-foreground">
              Guessed from existing names
              {row.genderInferenceDetails
                ? ` (${row.genderInferenceDetails.confidence}%)`
                : ""}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <span className={fieldLabel}>Classroom</span>
          <ClassroomSelect
            className={cn(
              "w-full",
              !classroomDepartmentId && "border-amber-400 dark:border-amber-800",
            )}
            options={classroomOptions}
            value={classroomDepartmentId}
            onValueChange={(value) => onClassroomChange(row.lineNumber, value)}
          />
        </div>
        <div className="space-y-1.5">
          <span className={fieldLabel}>Admission status</span>
          <Select
            value={decision?.admissionType ?? fallbackAdmissionType}
            onValueChange={(value) =>
              onAdmissionTypeChange(
                row.lineNumber,
                value as "UNCLASSIFIED" | "NEW_ADMISSION" | "RETURNING",
              )
            }
          >
            <Select.Trigger className="h-11 w-full bg-background text-sm sm:h-8 sm:text-xs">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="UNCLASSIFIED">Needs classification</Select.Item>
              <Select.Item value="NEW_ADMISSION">New admission</Select.Item>
              <Select.Item value="RETURNING">Returning student</Select.Item>
            </Select.Content>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className={fieldLabel}>Name split</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            aria-expanded={showSearch}
            onClick={() => setShowSearch((visible) => !visible)}
          >
            <Search className="size-3.5" aria-hidden="true" />
            Find existing student
          </Button>
        </div>
        <div
          dir={nameDirection}
          className={cn(
            "flex min-w-0 flex-wrap items-center gap-1.5",
            nameDirection === "rtl" && "justify-end",
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
        </div>
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

      <p className="truncate font-mono text-[11px] text-muted-foreground">
        Line {row.lineNumber} · {row.originalText}
      </p>
    </fieldset>
  );
}

const BLOCKER_LABELS = {
  classroom: "Pick a class",
  gender: "Set gender",
  action: "Choose what to do with the match",
  match: "Pick which student to match",
} as const;

/** Mirrors getStudentImportRowBlockReason, but lists every missing value for display. */
function getReviewRowBlockers({
  row,
  decision,
  manualGender,
  classroomDepartmentId,
}: {
  row: VerifyResult;
  decision?: RowDecision;
  manualGender?: "Male" | "Female";
  classroomDepartmentId: string;
}) {
  const blockers: string[] = [];
  const action = decision?.action;

  if (!classroomDepartmentId) blockers.push(BLOCKER_LABELS.classroom);
  if (!resolveGender(row, manualGender)) blockers.push(BLOCKER_LABELS.gender);
  if (!action) {
    blockers.push(
      getCandidates(row).length ? BLOCKER_LABELS.action : "Choose an action",
    );
  }
  if (
    blockers.length === 0 &&
    !isStudentImportAutoSkippedRow(row, decision) &&
    (action === "keep_match" || action === "update_match_with_name") &&
    !decision?.existingStudentId
  ) {
    blockers.push(BLOCKER_LABELS.match);
  }

  return blockers;
}

function buildReviewListRow({
  row,
  decision,
  manualGender,
  classroomDepartmentId,
  classroomLabel,
  checked,
  imported,
  importing,
  error,
  formatStudentName,
}: {
  row: VerifyResult;
  decision?: RowDecision;
  manualGender?: "Male" | "Female";
  classroomDepartmentId: string;
  classroomLabel: string | null;
  checked: boolean;
  imported: boolean;
  importing: boolean;
  error: NormalizedStudentImportError | null;
  formatStudentName: (student: MatchCandidate) => string;
}): ReviewListRow {
  const candidates = getCandidates(row);
  const blockers = getReviewRowBlockers({
    row,
    decision,
    manualGender,
    classroomDepartmentId,
  });
  const action = decision?.action;
  const autoSkipped = isStudentImportAutoSkippedRow(row, decision);
  const skipped = action === "skip" || autoSkipped;
  const gender = resolveGender(row, manualGender);
  const selectedCandidate =
    candidates.find((candidate) => candidate.id === decision?.existingStudentId) ||
    (candidates.length === 1 ? candidates[0] : undefined);
  const candidateLabel = (candidate: MatchCandidate | undefined) =>
    candidate
      ? [formatStudentName(candidate), candidate.classRoom?.trim()]
          .filter(Boolean)
          .join(" · ")
      : "";
  const withClass = (parts: (string | null | undefined)[]) =>
    parts.filter(Boolean).join(" · ");

  let statusText: string;
  let tone: ReviewRowTone = "neutral";

  if (imported) {
    tone = "success";
    statusText =
      action === "keep_match"
        ? `Kept ${candidateLabel(selectedCandidate)}`
        : action === "update_match_with_name"
          ? `Updated ${candidateLabel(selectedCandidate)}`
          : withClass(["New student created", classroomLabel]);
  } else if (error) {
    tone = "danger";
    statusText = `Import failed · ${error.message}`;
  } else if (blockers.length) {
    tone = "attention";
    const firstCandidate = selectedCandidate || candidates[0];
    statusText =
      !action && firstCandidate
        ? withClass([
            `Possible match: ${candidateLabel(firstCandidate)}`,
            ...blockers.filter((item) => item !== BLOCKER_LABELS.action),
          ])
        : blockers.join(" · ");
  } else if (autoSkipped) {
    tone = "muted";
    statusText = "Already enrolled this term";
  } else if (skipped) {
    tone = "muted";
    statusText = "Skipped";
  } else if (action === "keep_match") {
    statusText = `Matches ${candidateLabel(selectedCandidate)}`;
  } else if (action === "update_match_with_name") {
    statusText = `Updates name of ${candidateLabel(selectedCandidate)}`;
  } else {
    statusText = withClass([
      "New student",
      classroomLabel,
      gender === "Male" ? "M" : gender === "Female" ? "F" : null,
    ]);
  }

  return {
    lineNumber: row.lineNumber,
    group: imported
      ? "imported"
      : blockers.length
        ? "attention"
        : candidates.length
          ? "matched"
          : "ready",
    primaryName: [row.name, row.surname].filter(Boolean).join(" "),
    secondaryName: row.otherName || "",
    dir: getNameDirection(row),
    // Joined Arabic letters read as a word, so RTL names show a single initial.
    initials:
      (getNameDirection(row) === "rtl"
        ? (row.name?.[0] ?? "")
        : `${row.name?.[0] ?? ""}${row.surname?.[0] ?? ""}`.toUpperCase()) || "?",
    statusText,
    tone,
    checked: checked && !imported,
    imported,
    importing,
    canImport: !imported && !blockers.length && !skipped,
    blocked: !imported && blockers.length > 0,
  };
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
          className="h-9 min-w-0 max-w-[10rem] border-0 bg-transparent p-0 text-left text-sm font-medium shadow-none sm:h-5 sm:max-w-[12rem] sm:text-xs"
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
          className="h-9 w-9 px-0 sm:h-5 sm:w-5"
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
	const formatStudentName = useStudentNameFormatter();
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
							{formatStudentName(item.student)}
            </Arabic>
          )}
          renderListItem={({ item, isChecked }) => (
            <div className="flex w-full items-center justify-between gap-3">
              <div className="min-w-0">
                <Arabic className="block truncate font-medium">
									{formatStudentName(item.student)}
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
      <Select.Trigger aria-label="Assign classroom" className={cn("h-11 min-w-0 bg-background text-sm sm:h-8 sm:text-xs", className)}>
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
        compact ? "w-[5.5rem] sm:w-[4.25rem]" : "w-full",
        missing && "ring-1 ring-red-300 dark:ring-red-900",
      )}
    >
      <ToggleGroupItem
        value="Male"
        aria-label="Set row gender to Male"
        className={cn(
          "min-w-0 bg-background",
          compact ? "h-11 px-2 sm:h-6" : "h-11 sm:h-8",
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
          compact ? "h-11 px-2 sm:h-6" : "h-11 sm:h-8",
          missing &&
            "border-red-300 text-red-700 dark:border-red-900 dark:text-red-300",
        )}
      >
        F
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

function getCandidateMatchLabel(
	candidate: MatchCandidate,
	formatStudentName: (student: MatchCandidate) => string,
) {
  const classroom = candidate.classRoom?.trim() || "No classroom";
	return `${formatStudentName(candidate)} - ${classroom}`;
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
	const formatStudentName = useStudentNameFormatter();
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
							{getCandidateMatchLabel(candidate, formatStudentName)}
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
  fallbackAdmissionType,
  manualClassroomRequiredLineNumbers,
}: {
  row: VerifyResult;
  decision?: RowDecision;
  manualGender?: "Male" | "Female";
  fallbackClassroomDepartmentId: string;
  fallbackAdmissionType: "UNCLASSIFIED" | "NEW_ADMISSION" | "RETURNING";
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
      admissionType: decision?.admissionType ?? fallbackAdmissionType,
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
            admissionType:
              decision.admissionType === "NEW_ADMISSION" ||
              decision.admissionType === "RETURNING"
                ? decision.admissionType
                : decision.admissionType === "UNCLASSIFIED"
                  ? "UNCLASSIFIED"
                  : undefined,
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

  return areLineNumberRecordsEqual(current, next, areRowDecisionsEqual)
    ? current
    : next;
}

function reconcileCheckedRows(
  rows: VerifyResult[],
  current: Record<number, boolean>,
) {
  const next: Record<number, boolean> = {};

  for (const row of rows) {
    next[row.lineNumber] = current[row.lineNumber] ?? true;
  }

  return areLineNumberRecordsEqual(current, next) ? current : next;
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

  return areLineNumberRecordsEqual(record, next) ? record : next;
}

function areLineNumberRecordsEqual<T>(
  current: Record<number, T>,
  next: Record<number, T>,
  isEqual: (a: T, b: T) => boolean = Object.is,
) {
  const currentKeys = Object.keys(current);
  const nextKeys = Object.keys(next);

  if (currentKeys.length !== nextKeys.length) return false;

  for (const key of currentKeys) {
    const lineNumber = Number(key);
    if (!(lineNumber in next)) return false;
    if (!isEqual(current[lineNumber], next[lineNumber])) return false;
  }

  return true;
}

function areRowDecisionsEqual(
  current: RowDecision | undefined,
  next: RowDecision | undefined,
) {
  return (
    current?.action === next?.action &&
    current?.existingStudentId === next?.existingStudentId &&
    current?.touched === next?.touched
  );
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
		.filter(({ isExactFullName, score }) => isExactFullName || score >= 70)
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
    reason: student.historyNeedsReview ? "Selected student has academic history requiring review." : "Selected from existing students",
    historyNeedsReview: student.historyNeedsReview,
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
