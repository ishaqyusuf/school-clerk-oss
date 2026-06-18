import { _qc, _trpc } from "@/components/static-trpc";
import { Arabic } from "@/components/arabic";
import { SubmitButton } from "@/components/submit-button";
import { studentDisplayName } from "@/utils/utils";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Checkbox } from "@school-clerk/ui/checkbox";
import { cn } from "@school-clerk/ui/cn";
import { ComboboxDropdown } from "@school-clerk/ui/combobox-dropdown";
import { Item, Select, Tabs } from "@school-clerk/ui/composite";
import { Separator } from "@school-clerk/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@school-clerk/ui/toggle-group";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Import,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

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
  }[];
  onCancelImport?: () => void;
}

type VerifyResult =
  RouterOutputs["students"]["verifyStudentImport"]["results"][number];
type MatchCandidate = NonNullable<VerifyResult["fullMatch"]>;
type ExistingStudent =
  RouterOutputs["students"]["studentsRecentRecord"]["students"][number];
type ExecuteRow = {
  lineNumber: number;
  name: string;
  surname: string;
  otherName: string | null;
  gender: "Male" | "Female";
  action: "import_new" | "keep_match" | "update_match_with_name";
  existingStudentId: string | null;
};
type ImportAction =
  | "import_new"
  | "keep_match"
  | "update_match_with_name"
  | "skip";

type RowDecision = {
  action?: ImportAction;
  existingStudentId?: string | null;
  touched?: boolean;
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

const EMPTY_IMPORT_ROWS: VerifyResult[] = [];
const EMPTY_LOCKED_NAME_SPANS: Partial<Record<EditableNamePart, NameTokenSpan>> =
  {};

const actionLabels: Record<ImportAction, string> = {
  import_new: "Import new",
  keep_match: "Keep match",
  update_match_with_name: "Update match with name",
  skip: "Skip",
};

export function ImportActivity({ students, onCancelImport }: Props) {
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

  const {
    data: records,
    refetch: refetchRecentRecords,
    isPending: isRecentRecordsPending,
  } = useQuery(_trpc.students.studentsRecentRecord.queryOptions({}));

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

    setClassroomDeptId(matched?.id || records.classDepartments[0]?.id || "");
  }, [classroomDeptId, records, students]);

  const verifyInput = useMemo(() => {
    if (!classroomDeptId || !students.length) return null;

    return {
      classroomDepartmentId: classroomDeptId,
      rows: students.map((student) => ({
        lineNumber: student.lineNumber,
        originalText: student.originalText,
        name: student.name,
        surname: student.surname,
        originalClassRoom: student.classRoom,
        otherName: student.otherName || null,
        gender:
          student.gender === "M"
            ? "Male"
            : student.gender === "F"
              ? "Female"
              : student.gender || null,
      })),
    };
  }, [classroomDeptId, students]);

  const {
    data: verificationReport,
    isPending: isVerifying,
    refetch: refetchVerification,
  } = useQuery(
    _trpc.students.verifyStudentImport.queryOptions(verifyInput!, {
      enabled: !!verifyInput,
    }),
  );

  const verificationRows = verificationReport?.results;
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
      !row.fullMatch && row.suspectedMatches.length === 0 && !row.needsGender,
  );
  const exactRows = rows.filter((row) => row.fullMatch);
  const suspectedRows = rows.filter(
    (row) => !row.fullMatch && row.suspectedMatches.length > 0,
  );
  const attentionRows = rows.filter(
    (row) =>
      !row.fullMatch && row.suspectedMatches.length === 0 && row.needsGender,
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

  const setNamePart = (
    row: VerifyResult,
    option: NamePartOption,
  ) => {
    const nextNames = resolveNameSelection(row, option);
    const editedRow = {
      ...row,
      name: nextNames.name ?? row.name,
      surname: nextNames.surname ?? row.surname,
      otherName:
        "otherName" in nextNames ? nextNames.otherName : row.otherName,
    };
    const suggestedMatch = findEditedNameMatch(
      editedRow,
      records?.students || [],
      records?.sessionTermId,
      records?.schoolSessionId,
      classroomDeptId,
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
      classroomDeptId,
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

    if (!classroomDeptId) {
      setPreSubmitError(
        "Select a target classroom before executing the import.",
      );
      return;
    }

    const importRows: ExecuteRow[] = [];
    const needsDecisionLines: number[] = [];
    let skippedBeforeExecution = 0;

    for (const row of rows) {
      if (!isRowChecked(checkedRows, row.lineNumber)) continue;

      const decision = rowDecisions[row.lineNumber];
      const action = decision?.action;
      const gender = resolveGender(row, manualGenders[row.lineNumber]);
      const needsExisting =
        action === "keep_match" || action === "update_match_with_name";

      if (!gender) {
        needsDecisionLines.push(row.lineNumber);
        continue;
      }

      if (!action) {
        needsDecisionLines.push(row.lineNumber);
        continue;
      }

      if (needsExisting && !decision?.existingStudentId) {
        needsDecisionLines.push(row.lineNumber);
        continue;
      }

      if (action === "skip") {
        skippedBeforeExecution += 1;
        continue;
      }

      importRows.push({
        lineNumber: row.lineNumber,
        name: row.name,
        surname: row.surname,
        otherName: row.otherName ?? null,
        gender,
        action,
        existingStudentId: decision?.existingStudentId || null,
      });
    }

    if (needsDecisionLines.length > 0) {
      setPreSubmitError(
        "Lines " +
          needsDecisionLines.join(", ") +
          " need gender, an import action, or a selected match before execution.",
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

    executeBatch({
      classroomDepartmentId: classroomDeptId,
      rows: importRows,
    });
  };

  const selectedClassroom = records?.classDepartments?.find(
    (classroom) => classroom.id === classroomDeptId,
  );
  const skippedBeforeExecution = rows.filter(
    (row) =>
      isRowChecked(checkedRows, row.lineNumber) &&
      rowDecisions[row.lineNumber]?.action === "skip",
  ).length;
  const selectedRowCount = rows.filter((row) =>
    isRowChecked(checkedRows, row.lineNumber),
  ).length;
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
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-64 flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Target Classroom
          </span>
          <Select
            value={classroomDeptId}
            onValueChange={(value) => {
              setClassroomDeptId(value);
            }}
          >
            <Select.Trigger className="h-9 w-72">
              <Select.Value
                placeholder={
                  isRecentRecordsPending
                    ? "Loading classrooms..."
                    : "Select classroom"
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

        <SubmitButton
          isSubmitting={isExecutingBatch}
          onClick={executeAll}
          className="ml-auto h-9"
          type="button"
        >
          Execute checked
        </SubmitButton>
      </div>

      {selectedClassroom ? (
        <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          Reviewing {selectedRowCount} of {rows.length || students.length}{" "}
          pasted row(s) for{" "}
          <span className="font-medium text-foreground">
            {selectedClassroom.classRoom.name} -{" "}
            {selectedClassroom.departmentName}
          </span>
          {skippedBeforeExecution > 0 ? (
            <span className="ml-2 text-amber-600">
              {skippedBeforeExecution} row(s) marked Skip
            </span>
          ) : null}
        </div>
      ) : null}

      {preSubmitError ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-700">
          {preSubmitError}
        </div>
      ) : null}

      {batchResult ? (
        <div className="rounded-md border bg-muted/20 p-3 text-xs">
          <div className="flex flex-wrap gap-3">
            <span className="text-green-600">
              Created: {batchResult.createdStudents}
            </span>
            <span className="text-blue-600">
              Kept: {batchResult.keptMatches}
            </span>
            <span className="text-orange-600">
              Updated: {batchResult.updatedMatches}
            </span>
            <span className="text-yellow-600">
              Term Sheets: {batchResult.termSheetsCreated}
            </span>
            <span className="text-muted-foreground">
              Skipped: {batchResult.skippedRows + skippedBeforeExecution}
            </span>
            <span className="text-red-600">
              Failed: {batchResult.failedRows}
            </span>
          </div>
          {batchResult.rows.some((row) => row.status === "failed") ? (
            <div className="mt-2 space-y-1 text-red-600">
              {batchResult.rows
                .filter((row) => row.status === "failed")
                .map((row) => (
                  <div key={row.lineNumber}>
                    Line {row.lineNumber}: {row.reason}
                  </div>
                ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <Separator />

      {isVerifying ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-12 text-xs">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-muted-foreground">
            Running verification and match analysis...
          </p>
        </div>
      ) : (
        <Tabs.Root
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as any)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <Tabs.List className="grid w-full grid-cols-3">
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
                        onValueChange={(action) => applyBatch("exact", action)}
                      />
                    ) : null}
                  </div>
                }
              />
              <RowsList
                emptyText="No exact matches found."
                rows={exactRows}
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
                      onUncheckAll={() => setRowsChecked(suspectedRows, false)}
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
                    onUncheckAll={() => setRowsChecked(attentionRows, false)}
                  />
                }
              />
              <RowsList
                emptyText="No rows need manual attention."
                rows={attentionRows}
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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/20 p-2">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
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
  onGenderChange,
}: {
  emptyText: string;
  rows: VerifyResult[];
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
  onNamePartChange: (
    row: VerifyResult,
    option: NamePartOption,
  ) => void;
  onNamePartsReset: (lineNumber: number) => void;
  onSearchStudentSelect: (row: VerifyResult, student: ExistingStudent) => void;
  onPromoteSearchMatch: (row: VerifyResult) => void;
  onPromoteNameMatch: (row: VerifyResult) => void;
  onGenderChange: (lineNumber: number, gender: "Male" | "Female") => void;
}) {
  if (!rows.length) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <RowCard
          key={row.lineNumber}
          row={row}
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
          onGenderChange={onGenderChange}
        />
      ))}
    </div>
  );
}

function RowCard({
  row,
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
  onGenderChange,
}: {
  row: VerifyResult;
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
  onNamePartChange: (
    row: VerifyResult,
    option: NamePartOption,
  ) => void;
  onNamePartsReset: (lineNumber: number) => void;
  onSearchStudentSelect: (row: VerifyResult, student: ExistingStudent) => void;
  onPromoteSearchMatch: (row: VerifyResult) => void;
  onPromoteNameMatch: (row: VerifyResult) => void;
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
  const isBlocked = needsGender || needsResolution || needsExistingMatch;
  const matchKind = row.fullMatch
    ? "Exact match"
    : row.suspectedMatches.length > 0
      ? "Possible match"
      : "No match";
  const statusLabel = isBlocked ? "Action required" : "Ready";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border bg-background text-xs shadow-sm",
        isBlocked
          ? "border-red-200 bg-red-50/40 dark:border-red-900/60 dark:bg-red-950/15"
          : "border-border",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
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
          <span
            className={cn(
              "inline-flex items-center gap-1 font-medium",
              isBlocked ? "text-red-600" : "text-green-600",
            )}
          >
            {isBlocked ? (
              <AlertCircle className="size-3.5" />
            ) : (
              <CheckCircle2 className="size-3.5" />
            )}
            {statusLabel}
          </span>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          {resolvedGender ? (
            <Badge variant="outline" className="bg-background">
              Gender: {resolvedGender}
            </Badge>
          ) : (
            <span className="inline-flex items-center gap-1 text-orange-600">
              <AlertTriangle className="size-3.5" />
              Gender missing
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0 space-y-3">
          <div className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-3">
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

        <div className="flex flex-row gap-4">
          <Button
            type="button"
            variant={showSearch ? "secondary" : "outline"}
            size="sm"
            className="h-8 w-8 px-0"
            onClick={() => setShowSearch((current) => !current)}
            aria-label={`Search existing students for line ${row.lineNumber}`}
          >
            <Search className="size-4" />
          </Button>

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
          >
            <Select.Trigger className="h-8 w-full bg-background text-xs sm:w-48 lg:w-full">
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
      </div>

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
    <div className="min-w-0">
      <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>{label}</span>
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
        <Select.Trigger className="h-7 border-0 bg-transparent p-0 text-xs shadow-none focus:ring-0">
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
          popoverProps={{ className: "w-[360px] p-0" }}
          onSearch={setSearchValue}
          renderSelectedItem={(item) => (
            <Arabic className="truncate">{studentDisplayName(item.student)}</Arabic>
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
          <Button
            type="button"
            size="sm"
            className="h-9"
            onClick={onPromote}
          >
            Move to match found
          </Button>
        ) : null}
      </div>
    </div>
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
      className="justify-start"
    >
      <ToggleGroupItem
        value="Male"
        aria-label="Set row gender to Male"
        className="h-8 w-10 bg-background"
      >
        M
      </ToggleGroupItem>
      <ToggleGroupItem
        value="Female"
        aria-label="Set row gender to Female"
        className="h-8 w-10 bg-background"
      >
        F
      </ToggleGroupItem>
    </ToggleGroup>
  );
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
    .filter(({ isExactNameSurname, score }) => isExactNameSurname || score >= 70)
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

function buildContiguousNameOptions(
  tokens: string[],
  as: EditableNamePart,
) {
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
  const source = row.originalText || [row.name, row.surname, row.otherName]
    .filter(Boolean)
    .join(" ");
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

  for (let start = 0; start <= tokens.length - selectedTokens.length; start += 1) {
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
