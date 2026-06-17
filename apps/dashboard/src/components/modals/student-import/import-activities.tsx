import { _qc, _trpc } from "@/components/static-trpc";
import { Arabic } from "@/components/arabic";
import { SubmitButton } from "@/components/submit-button";
import { studentDisplayName } from "@/utils/utils";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { cn } from "@school-clerk/ui/cn";
import { Select, Tabs } from "@school-clerk/ui/composite";
import { Separator } from "@school-clerk/ui/separator";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Import,
  RefreshCw,
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
}

type VerifyResult =
  RouterOutputs["students"]["verifyStudentImport"]["results"][number];
type MatchCandidate = NonNullable<VerifyResult["fullMatch"]>;
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

const EMPTY_IMPORT_ROWS: VerifyResult[] = [];

const actionLabels: Record<ImportAction, string> = {
  import_new: "Import new",
  keep_match: "Keep match",
  update_match_with_name: "Update match with name",
  skip: "Skip",
};

export function ImportActivity({ students }: Props) {
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
  const rows = verificationRows ?? EMPTY_IMPORT_ROWS;

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
      } else if (!row.needsGender && row.suspectedMatches.length === 0) {
        defaults[row.lineNumber] = {
          action: "import_new",
          existingStudentId: null,
          touched: false,
        };
      }
    }

    setRowDecisions(defaults);
    setManualGenders({});
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
          : "No rows to execute.",
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
    (row) => rowDecisions[row.lineNumber]?.action === "skip",
  ).length;

  return (
    <div className="flex max-h-[80vh] flex-col gap-3">
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

        <SubmitButton
          isSubmitting={isExecutingBatch}
          onClick={executeAll}
          className="ml-auto h-9"
          type="button"
        >
          Execute All
        </SubmitButton>
      </div>

      {selectedClassroom ? (
        <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          Reviewing {rows.length || students.length} pasted row(s) for{" "}
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
        <div className="flex flex-col items-center justify-center gap-4 p-12 text-xs">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-muted-foreground">
            Running verification and match analysis...
          </p>
        </div>
      ) : (
        <Tabs.Root
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as any)}
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

          <div className="mt-3 max-h-[56vh] overflow-y-auto pr-1">
            <Tabs.Content value="ready" className="m-0 space-y-3">
              <SectionHeader
                title="Ready to import"
                detail="Rows with no existing match and complete required fields."
                action={
                  readyRows.length > 0 ? (
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => applyBatch("ready", "import_new")}
                    >
                      <Import className="mr-2 size-4" />
                      Import all ready
                    </Button>
                  ) : null
                }
              />
              <RowsList
                emptyText="No rows are currently ready to import."
                rows={readyRows}
                rowDecisions={rowDecisions}
                manualGenders={manualGenders}
                onActionChange={setAction}
                onCandidateChange={setCandidate}
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
                  exactRows.length > 0 ? (
                    <BatchActionSelect
                      defaultValue="keep_match"
                      onValueChange={(action) => applyBatch("exact", action)}
                    />
                  ) : null
                }
              />
              <RowsList
                emptyText="No exact matches found."
                rows={exactRows}
                rowDecisions={rowDecisions}
                manualGenders={manualGenders}
                onActionChange={setAction}
                onCandidateChange={setCandidate}
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
                  suspectedRows.length > 0 ? (
                    <BatchActionSelect
                      placeholder="Set default"
                      onValueChange={(action) =>
                        applyBatch("suspected", action)
                      }
                    />
                  ) : null
                }
              />
              <RowsList
                emptyText="No possible matches found."
                rows={suspectedRows}
                rowDecisions={rowDecisions}
                manualGenders={manualGenders}
                onActionChange={setAction}
                onCandidateChange={setCandidate}
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
              />
              <RowsList
                emptyText="No rows need manual attention."
                rows={attentionRows}
                rowDecisions={rowDecisions}
                manualGenders={manualGenders}
                onActionChange={setAction}
                onCandidateChange={setCandidate}
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

function RowsList({
  emptyText,
  rows,
  rowDecisions,
  manualGenders,
  onActionChange,
  onCandidateChange,
  onGenderChange,
}: {
  emptyText: string;
  rows: VerifyResult[];
  rowDecisions: Record<number, RowDecision>;
  manualGenders: Record<number, "Male" | "Female">;
  onActionChange: (row: VerifyResult, action: ImportAction) => void;
  onCandidateChange: (row: VerifyResult, candidateId: string) => void;
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
          onActionChange={onActionChange}
          onCandidateChange={onCandidateChange}
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
  onActionChange,
  onCandidateChange,
  onGenderChange,
}: {
  row: VerifyResult;
  decision?: RowDecision;
  manualGender?: "Male" | "Female";
  onActionChange: (row: VerifyResult, action: ImportAction) => void;
  onCandidateChange: (row: VerifyResult, candidateId: string) => void;
  onGenderChange: (lineNumber: number, gender: "Male" | "Female") => void;
}) {
  const candidates = useMemo(() => getCandidates(row), [row]);
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

  return (
    <div
      className={cn(
        "rounded-md border bg-card p-3 text-xs",
        isBlocked
          ? "border-red-300 bg-red-50/50 dark:bg-red-950/20"
          : "border-border",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Line {row.lineNumber}</Badge>
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
            {isBlocked ? (
              <span className="inline-flex items-center gap-1 text-red-600">
                <AlertCircle className="size-3.5" />
                Action required
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-green-600">
                <CheckCircle2 className="size-3.5" />
                Ready
              </span>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">Original:</span>
              <Arabic className="font-semibold">{row.originalText}</Arabic>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
              <Arabic>
                Parsed: {row.name} {row.surname} {row.otherName || ""}
              </Arabic>
              <span>
                Gender:{" "}
                {resolvedGender ? (
                  <span className="font-medium text-foreground">
                    {resolvedGender}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-orange-600">
                    <AlertTriangle className="size-3" />
                    Missing
                  </span>
                )}
              </span>
              {row.inferredGender ? (
                <span>
                  Inferred from existing names
                  {row.genderInferenceDetails
                    ? ` (${row.genderInferenceDetails.confidence}%, ${row.genderInferenceDetails.sampleSize} samples)`
                    : ""}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {needsGender ? (
            <Select
              value={manualGender || ""}
              onValueChange={(value) =>
                onGenderChange(row.lineNumber, value as "Male" | "Female")
              }
            >
              <Select.Trigger className="h-8 w-32 bg-background text-xs">
                <Select.Value placeholder="Gender" />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="Male">Male</Select.Item>
                <Select.Item value="Female">Female</Select.Item>
              </Select.Content>
            </Select>
          ) : null}

          <Select
            value={action || ""}
            onValueChange={(value) =>
              onActionChange(row, value as ImportAction)
            }
          >
            <Select.Trigger className="h-8 w-48 bg-background text-xs">
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
              <Select.Item value="skip">Skip</Select.Item>
            </Select.Content>
          </Select>
        </div>
      </div>

      {candidates.length > 0 ? (
        <div className="mt-3 rounded-md border bg-muted/20 p-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="font-semibold text-muted-foreground">
              Match candidates
            </span>
            {needsExistingMatch ? (
              <span className="text-red-600">
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
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "grid w-full gap-2 rounded-md border bg-background p-3 text-left transition-colors hover:bg-muted/60 sm:grid-cols-[1fr_auto]",
        selected ? "border-primary ring-1 ring-primary" : "border-border",
      )}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
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
          <Arabic className="font-semibold">
            {studentDisplayName(candidate)}
          </Arabic>
          <span className="text-[10px] text-muted-foreground">
            ID {candidate.id.slice(0, 8)}
          </span>
        </div>
        <div className="grid gap-1 text-[10px] text-muted-foreground sm:grid-cols-2">
          <span>Gender: {candidate.gender || "N/A"}</span>
          <Arabic>Class: {candidate.classRoom || "No classroom"}</Arabic>
          <span>Session: {candidate.sessionName || "No session"}</span>
          <span>Term: {candidate.termName || "No term"}</span>
        </div>
        {candidate.reason ? (
          <p className="text-[10px] text-muted-foreground">
            {candidate.reason}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <Badge variant={candidate.confidence === 100 ? "success" : "warning"}>
          {candidate.confidence}% confidence
        </Badge>
        <Badge
          variant={candidate.isCurrentTermMatch ? "success" : "outline"}
          className="whitespace-nowrap"
        >
          {candidate.isCurrentTermMatch
            ? "Term sheet exists"
            : "No current term"}
        </Badge>
        <Badge
          variant={candidate.isCurrentClassroomMatch ? "success" : "outline"}
          className="whitespace-nowrap"
        >
          {candidate.isCurrentClassroomMatch
            ? "Same classroom"
            : "Different class"}
        </Badge>
      </div>
    </button>
  );
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
