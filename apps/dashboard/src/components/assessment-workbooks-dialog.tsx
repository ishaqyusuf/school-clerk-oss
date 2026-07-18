"use client";

import { useTRPC } from "@/trpc/client";
import type { AssessmentWorkbookColumnResolution } from "@school-clerk/assessment-workbooks";
import { getAssessmentDisplayTitle } from "@school-clerk/assessment-results";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Checkbox } from "@school-clerk/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@school-clerk/ui/dialog";
import { Input } from "@school-clerk/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@school-clerk/ui/select";
import { Spinner } from "@school-clerk/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@school-clerk/ui/table";
import { toast } from "@school-clerk/ui/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type WorkbookSubject = {
  id: string;
  subject: { title: string };
  assessments: Array<{
    id: number;
    title: string;
    obtainable: number;
    parentAssessment?: { title?: string | null } | null;
  }>;
};

type Props = {
  departmentId: string;
  termId: string;
  direction: "ltr" | "rtl";
  subjects: WorkbookSubject[];
  initiallySelectedSubjectIds: string[];
};

type Mode = "download" | "upload";
type DownloadSelection = Record<string, Array<number | "bare">>;
type Resolutions = Record<string, AssessmentWorkbookColumnResolution>;
const MAX_WORKBOOK_BYTES = 10 * 1024 * 1024;

function saveBase64File(fileBase64: string, fileName: string) {
  const binary = window.atob(fileBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  const url = URL.createObjectURL(
    new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function fileToBase64(file: File) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return window.btoa(binary);
}

function createInitialSelection(
  subjects: WorkbookSubject[],
  selectedIds: string[],
): DownloadSelection {
  const selected = selectedIds.length
    ? new Set(selectedIds)
    : new Set(subjects.slice(0, 1).map((subject) => subject.id));
  return Object.fromEntries(
    subjects.flatMap((subject) =>
      selected.has(subject.id)
        ? [
            [
              subject.id,
              subject.assessments.length
                ? subject.assessments.map((assessment) => assessment.id)
                : ["bare"],
            ],
          ]
        : [],
    ),
  );
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "danger" | "success";
}) {
  return (
    <div className="border bg-background p-3">
      <div
        className={
          tone === "danger"
            ? "text-xl font-semibold tabular-nums text-destructive"
            : tone === "success"
              ? "text-xl font-semibold tabular-nums text-emerald-600"
              : "text-xl font-semibold tabular-nums"
        }
      >
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export function AssessmentWorkbooksDialog({
  departmentId,
  termId,
  direction,
  subjects,
  initiallySelectedSubjectIds,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("download");
  const [downloadDirection, setDownloadDirection] = useState(direction);
  const [selection, setSelection] = useState<DownloadSelection>(() =>
    createInitialSelection(subjects, initiallySelectedSubjectIds),
  );
  const [fileName, setFileName] = useState("");
  const [fileBase64, setFileBase64] = useState("");
  const [resolutions, setResolutions] = useState<Resolutions>({});
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [previewIsCurrent, setPreviewIsCurrent] = useState(false);
  const resolutionVersionRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  useEffect(() => setDownloadDirection(direction), [direction]);
  useEffect(() => {
    if (!open) return;
    setSelection(createInitialSelection(subjects, initiallySelectedSubjectIds));
  }, [initiallySelectedSubjectIds, open, subjects]);

  const selectedSubjectCount = Object.values(selection).filter(
    (columns) => columns.length,
  ).length;
  const selectedColumnCount = Object.values(selection).reduce(
    (count, columns) => count + columns.length,
    0,
  );

  const downloadMutation = useMutation(
    trpc.assessments.downloadAssessmentWorkbook.mutationOptions({
      onError(error) {
        toast({
          title: "Workbook could not be generated",
          description: error.message,
          variant: "destructive",
        });
      },
      onSuccess(data) {
        saveBase64File(data.fileBase64, data.fileName);
        toast({
          title: "Assessment workbook downloaded",
          description:
            "Enter scores in the unlocked cells, then upload this same workbook for review.",
        });
      },
    }),
  );
  const previewMutation = useMutation(
    trpc.assessments.previewAssessmentWorkbook.mutationOptions({
      onError(error) {
        toast({
          title: "Workbook could not be reviewed",
          description: error.message,
          variant: "destructive",
        });
      },
    }),
  );
  const applyMutation = useMutation(
    trpc.assessments.applyAssessmentWorkbook.mutationOptions({
      onError(error) {
        toast({
          title: "Workbook was not applied",
          description: error.message,
          variant: "destructive",
        });
      },
      async onSuccess(data) {
        await queryClient.invalidateQueries({
          queryKey: trpc.assessments.getClassroomReportSheet.queryKey({
            departmentId: data.classroomId,
            sessionTermId: data.sessionTermId,
          }),
        });
        toast({
          title: data.alreadyApplied
            ? "Workbook was already applied"
            : "Assessment scores updated",
          description: data.alreadyApplied
            ? "No duplicate scores were created."
            : `${data.summary.create + data.summary.update} score change(s) and ${data.summary.assessmentCreate} assessment(s) saved atomically.`,
        });
        setOpen(false);
      },
    }),
  );

  const preview = previewMutation.data;
  const unresolvedColumns = useMemo(
    () =>
      preview?.columns.filter(
        (column) =>
          column.assessmentId == null ||
          column.resolution != null ||
          preview.blockers.some(
            (blocker) =>
              blocker.columnKey === column.key &&
              (blocker.code === "unresolved-column" ||
                blocker.code === "invalid-resolution" ||
                blocker.code === "unavailable-assessment"),
          ),
      ) ?? [],
    [preview],
  );

  function updateSubjectSelection(subject: WorkbookSubject, checked: boolean) {
    setSelection((current) => {
      if (!checked) {
        const next = { ...current };
        delete next[subject.id];
        return next;
      }
      return {
        ...current,
        [subject.id]: subject.assessments.length
          ? subject.assessments.map((assessment) => assessment.id)
          : ["bare"],
      };
    });
  }

  function updateColumnSelection(
    subjectId: string,
    column: number | "bare",
    checked: boolean,
  ) {
    setSelection((current) => {
      const existing = current[subjectId] ?? [];
      const nextColumns =
        column === "bare"
          ? checked
            ? ["bare" as const]
            : []
          : checked
            ? [...existing.filter((item) => item !== "bare"), column]
            : existing.filter((item) => item !== column);
      const next = { ...current };
      if (nextColumns.length) next[subjectId] = nextColumns;
      else delete next[subjectId];
      return next;
    });
  }

  function runPreview(nextResolutions = resolutions) {
    if (!fileBase64) return;
    const requestVersion = resolutionVersionRef.current;
    setPreviewIsCurrent(false);
    previewMutation.mutate(
      {
        fileBase64,
        resolutions: nextResolutions,
      },
      {
        onSuccess() {
          if (resolutionVersionRef.current === requestVersion) {
            setPreviewIsCurrent(true);
          }
        },
      },
    );
  }

  async function selectFile(file?: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      toast({
        title: "Choose an .xlsx workbook",
        description:
          "Only School Clerk generated Excel workbooks are accepted.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > MAX_WORKBOOK_BYTES) {
      toast({
        title: "Workbook is too large",
        description: "Assessment workbooks must be 10 MB or smaller.",
        variant: "destructive",
      });
      return;
    }
    const base64 = await fileToBase64(file);
    const nextKey = crypto.randomUUID();
    resolutionVersionRef.current += 1;
    const requestVersion = resolutionVersionRef.current;
    setFileName(file.name);
    setFileBase64(base64);
    setResolutions({});
    setIdempotencyKey(nextKey);
    setPreviewIsCurrent(false);
    previewMutation.mutate(
      { fileBase64: base64, resolutions: {} },
      {
        onSuccess() {
          if (resolutionVersionRef.current === requestVersion) {
            setPreviewIsCurrent(true);
          }
        },
      },
    );
  }

  function setResolution(
    columnKey: string,
    resolution: AssessmentWorkbookColumnResolution,
  ) {
    resolutionVersionRef.current += 1;
    setPreviewIsCurrent(false);
    setResolutions((current) => ({ ...current, [columnKey]: resolution }));
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <FileSpreadsheet className="size-4" />
        Assessment Workbooks
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          dir="ltr"
          className="flex max-h-[92vh] max-w-6xl flex-col gap-0 overflow-hidden p-0"
        >
          <DialogHeader className="border-b px-5 py-4 text-start">
            <DialogTitle>Assessment workbooks</DialogTitle>
            <DialogDescription>
              Download a protected classroom workbook, enter scores offline, and
              upload it for a verified review before any records change.
            </DialogDescription>
          </DialogHeader>

          <div className="flex border-b bg-muted/20 px-5">
            {(
              [
                ["download", Download, "Download workbook"],
                ["upload", Upload, "Upload and review"],
              ] as const
            ).map(([value, Icon, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium ${
                  mode === value
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {mode === "download" ? (
              <div className="space-y-5">
                <div className="grid gap-4 border bg-muted/10 p-4 sm:grid-cols-[1fr_220px]">
                  <div>
                    <h3 className="font-medium">Choose workbook columns</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Select one or more subjects, then choose the scoreable
                      assessments for each. A subject-only column can be linked
                      or created during import.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      Sheet direction
                    </label>
                    <Select
                      value={downloadDirection}
                      onValueChange={(value: "ltr" | "rtl") =>
                        setDownloadDirection(value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ltr">Left to right</SelectItem>
                        <SelectItem value="rtl">Right to left</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="divide-y border" dir={downloadDirection}>
                  {subjects.map((subject) => {
                    const subjectColumns = selection[subject.id] ?? [];
                    const selected = subjectColumns.length > 0;
                    return (
                      <div key={subject.id} className="p-4">
                        <label className="flex cursor-pointer items-center gap-3">
                          <Checkbox
                            checked={selected}
                            onCheckedChange={(checked) =>
                              updateSubjectSelection(subject, checked === true)
                            }
                          />
                          <span className="font-medium" dir="auto">
                            {subject.subject.title}
                          </span>
                          <Badge
                            variant="outline"
                            className="ms-auto"
                            dir="ltr"
                          >
                            {subjectColumns.length} column
                            {subjectColumns.length === 1 ? "" : "s"}
                          </Badge>
                        </label>
                        {selected ? (
                          <div className="ms-7 mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            <label className="flex cursor-pointer items-start gap-2 border p-3">
                              <Checkbox
                                checked={subjectColumns.includes("bare")}
                                onCheckedChange={(checked) =>
                                  updateColumnSelection(
                                    subject.id,
                                    "bare",
                                    checked === true,
                                  )
                                }
                              />
                              <span dir="ltr">
                                <span className="block text-sm font-medium">
                                  Subject only
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                  Link or create an assessment during import
                                </span>
                              </span>
                            </label>
                            {subject.assessments.map((assessment) => (
                              <label
                                key={assessment.id}
                                className="flex cursor-pointer items-start gap-2 border p-3"
                              >
                                <Checkbox
                                  checked={subjectColumns.includes(
                                    assessment.id,
                                  )}
                                  onCheckedChange={(checked) =>
                                    updateColumnSelection(
                                      subject.id,
                                      assessment.id,
                                      checked === true,
                                    )
                                  }
                                />
                                <span>
                                  <span
                                    className="block text-sm font-medium"
                                    dir="auto"
                                  >
                                    {getAssessmentDisplayTitle(assessment)}
                                  </span>
                                  <span
                                    className="block text-xs text-muted-foreground"
                                    dir="ltr"
                                  >
                                    Maximum {assessment.obtainable}
                                  </span>
                                </span>
                              </label>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={(event) => selectFile(event.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 border border-dashed p-8 text-center transition-colors hover:bg-muted/20"
                >
                  <Upload className="size-6 text-muted-foreground" />
                  <span className="font-medium">
                    {fileName || "Choose a School Clerk assessment workbook"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    .xlsx only · maximum 10 MB · custom and legacy workbooks are
                    rejected
                  </span>
                </button>

                {previewMutation.isPending ? (
                  <div className="flex h-28 items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Spinner size={16} />
                    Verifying workbook and comparing live scores...
                  </div>
                ) : preview ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3 border bg-muted/10 p-4">
                      <div>
                        <h3 className="font-medium" dir="auto">
                          {preview.classroomLabel}
                        </h3>
                        <p className="text-sm text-muted-foreground" dir="auto">
                          {preview.termLabel}
                        </p>
                      </div>
                      {preview.blockers.length ? (
                        <Badge variant="destructive" className="gap-1.5">
                          <AlertTriangle className="size-3.5" />
                          {preview.blockers.length} item
                          {preview.blockers.length === 1 ? "" : "s"} to resolve
                        </Badge>
                      ) : (
                        <Badge className="gap-1.5 bg-emerald-600">
                          <CheckCircle2 className="size-3.5" />
                          Ready to apply
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                      <SummaryCard
                        label="Assessments"
                        value={preview.summary.assessmentCreate}
                        tone="success"
                      />
                      <SummaryCard
                        label="New scores"
                        value={preview.summary.create}
                        tone="success"
                      />
                      <SummaryCard
                        label="Updated"
                        value={preview.summary.update}
                        tone="success"
                      />
                      <SummaryCard
                        label="Unchanged"
                        value={preview.summary.unchanged}
                      />
                      <SummaryCard
                        label="Blank"
                        value={preview.summary.blank}
                      />
                      <SummaryCard
                        label="Conflicts"
                        value={preview.summary.conflict}
                        tone="danger"
                      />
                      <SummaryCard
                        label="Invalid"
                        value={preview.summary.invalid}
                        tone="danger"
                      />
                      <SummaryCard
                        label="Stale rows"
                        value={preview.summary.stale}
                        tone="danger"
                      />
                    </div>

                    {unresolvedColumns.length ? (
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-medium">
                            Match workbook columns
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Choose a scoreable assessment or create a standalone
                            assessment. Group headings cannot receive scores.
                          </p>
                        </div>
                        {unresolvedColumns.map((column) => {
                          const resolution = resolutions[column.key];
                          return (
                            <div
                              key={column.key}
                              className="grid gap-3 border p-4 lg:grid-cols-[minmax(160px,1fr)_minmax(220px,1.2fr)_2fr]"
                              dir={direction}
                            >
                              <div>
                                <div className="text-sm font-medium" dir="auto">
                                  {column.subjectTitle}
                                </div>
                                <div
                                  className="text-xs text-muted-foreground"
                                  dir="ltr"
                                >
                                  {column.key.startsWith("bare:")
                                    ? "Subject-only spreadsheet column"
                                    : "Downloaded assessment is no longer available"}
                                </div>
                              </div>
                              <Select
                                dir={direction}
                                value={
                                  resolution?.kind === "existing"
                                    ? `existing:${resolution.assessmentId}`
                                    : resolution?.kind === "create"
                                      ? "create"
                                      : ""
                                }
                                onValueChange={(value) => {
                                  if (value === "create") {
                                    setResolution(column.key, {
                                      kind: "create",
                                      title: `${column.subjectTitle} Assessment`,
                                      obtainable: 100,
                                      percentageObtainable: 0,
                                    });
                                  } else {
                                    setResolution(column.key, {
                                      kind: "existing",
                                      assessmentId: Number(
                                        value.replace("existing:", ""),
                                      ),
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select or create assessment" />
                                </SelectTrigger>
                                <SelectContent>
                                  {column.availableAssessments.map(
                                    (assessment) => (
                                      <SelectItem
                                        key={assessment.id}
                                        value={`existing:${assessment.id}`}
                                        dir="auto"
                                      >
                                        {assessment.title} (
                                        {assessment.obtainable})
                                      </SelectItem>
                                    ),
                                  )}
                                  <SelectItem value="create" dir="ltr">
                                    Create standalone assessment
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              {resolution?.kind === "create" ? (
                                <div className="grid grid-cols-[1fr_110px_120px] items-end gap-2">
                                  <label className="space-y-1" dir="ltr">
                                    <span className="block text-xs font-medium">
                                      Title
                                    </span>
                                    <Input
                                      aria-label="Assessment title"
                                      dir={direction}
                                      value={resolution.title}
                                      onChange={(event) =>
                                        setResolution(column.key, {
                                          ...resolution,
                                          title: event.target.value,
                                        })
                                      }
                                    />
                                  </label>
                                  <label className="space-y-1" dir="ltr">
                                    <span className="block text-xs font-medium">
                                      Maximum
                                    </span>
                                    <Input
                                      aria-label="Maximum obtainable score"
                                      dir="ltr"
                                      type="number"
                                      min="0.01"
                                      step="0.01"
                                      value={resolution.obtainable}
                                      onChange={(event) =>
                                        setResolution(column.key, {
                                          ...resolution,
                                          obtainable: Number(
                                            event.target.value,
                                          ),
                                        })
                                      }
                                    />
                                  </label>
                                  <label className="space-y-1" dir="ltr">
                                    <span className="block text-xs font-medium">
                                      Weight
                                    </span>
                                    <span className="relative block">
                                      <Input
                                        aria-label="Assessment weight percentage"
                                        className="pe-7"
                                        dir="ltr"
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={
                                          resolution.percentageObtainable ?? 0
                                        }
                                        onChange={(event) =>
                                          setResolution(column.key, {
                                            ...resolution,
                                            percentageObtainable: Number(
                                              event.target.value,
                                            ),
                                          })
                                        }
                                      />
                                      <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-sm text-muted-foreground">
                                        %
                                      </span>
                                    </span>
                                  </label>
                                </div>
                              ) : (
                                <div className="flex items-center text-sm text-muted-foreground">
                                  Existing assessment scores will be updated.
                                </div>
                              )}
                            </div>
                          );
                        })}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => runPreview()}
                        >
                          Review mappings and scores again
                        </Button>
                        {!previewIsCurrent ? (
                          <p className="text-sm text-amber-700">
                            Mapping changes must be reviewed again before they
                            can be applied.
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {preview.assessmentCreations.length ? (
                      <div className="border border-emerald-600/30 bg-emerald-50/50 p-4">
                        <h3 className="font-medium">Assessments to create</h3>
                        <ul className="mt-2 space-y-1 text-sm">
                          {preview.assessmentCreations.map((assessment) => (
                            <li key={assessment.columnKey} dir="auto">
                              {assessment.subjectTitle}: {assessment.title} —
                              maximum{" "}
                              <span dir="ltr">{assessment.obtainable}</span>,
                              weight{" "}
                              <span dir="ltr">
                                {assessment.percentageObtainable}%
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {preview.blockers.length ? (
                      <div className="border border-destructive/30 bg-destructive/5 p-4">
                        <h3 className="font-medium text-destructive">
                          Resolve before applying
                        </h3>
                        <ul className="mt-2 space-y-1 text-sm">
                          {preview.blockers.map((blocker, index) => (
                            <li
                              key={`${blocker.code}-${blocker.columnKey ?? ""}-${blocker.studentTermFormId ?? ""}-${index}`}
                            >
                              {blocker.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {preview.changes.length ? (
                      <div className="overflow-x-auto border" dir={direction}>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead dir="ltr">Student</TableHead>
                              <TableHead dir="ltr">Subject</TableHead>
                              <TableHead dir="ltr">Assessment</TableHead>
                              <TableHead dir="ltr">Downloaded</TableHead>
                              <TableHead dir="ltr">Current</TableHead>
                              <TableHead dir="ltr">Uploaded</TableHead>
                              <TableHead dir="ltr">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {preview.changes.map((change) => (
                              <TableRow
                                key={`${change.studentTermFormId}-${change.columnKey}`}
                              >
                                <TableCell dir="auto">
                                  {change.studentName}
                                </TableCell>
                                <TableCell dir="auto">
                                  {change.subjectTitle}
                                </TableCell>
                                <TableCell dir="auto">
                                  {change.assessmentTitle}
                                </TableCell>
                                <TableCell dir="ltr">
                                  {change.downloaded ?? "—"}
                                </TableCell>
                                <TableCell dir="ltr">
                                  {change.current ?? "—"}
                                </TableCell>
                                <TableCell dir="ltr" className="font-medium">
                                  {change.uploaded}
                                </TableCell>
                                <TableCell dir="ltr">
                                  <Badge
                                    variant={
                                      change.status === "conflict"
                                        ? "destructive"
                                        : "outline"
                                    }
                                  >
                                    {change.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="border p-6 text-center text-sm text-muted-foreground">
                        No score changes were found. Blank cells are accepted
                        and leave current records unchanged.
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            )}
          </div>

          <DialogFooter className="border-t bg-background px-5 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
            {mode === "download" ? (
              <Button
                type="button"
                disabled={
                  !selectedSubjectCount ||
                  !selectedColumnCount ||
                  downloadMutation.isPending
                }
                onClick={() =>
                  downloadMutation.mutate({
                    departmentId,
                    sessionTermId: termId,
                    direction: downloadDirection,
                    subjects: subjects.flatMap((subject) => {
                      const columns = selection[subject.id];
                      return columns?.length
                        ? [
                            {
                              departmentSubjectId: subject.id,
                              columns: columns.map((column) =>
                                column === "bare"
                                  ? ({ kind: "bare" } as const)
                                  : ({
                                      kind: "assessment",
                                      assessmentId: column,
                                    } as const),
                              ),
                            },
                          ]
                        : [];
                    }),
                  })
                }
              >
                {downloadMutation.isPending ? (
                  <Spinner size={16} />
                ) : (
                  <Download className="size-4" />
                )}
                Download {selectedColumnCount} column
                {selectedColumnCount === 1 ? "" : "s"}
              </Button>
            ) : preview ? (
              <Button
                type="button"
                disabled={
                  preview.blockers.length > 0 ||
                  !previewIsCurrent ||
                  applyMutation.isPending ||
                  previewMutation.isPending ||
                  !idempotencyKey
                }
                onClick={() =>
                  applyMutation.mutate({
                    fileBase64,
                    resolutions,
                    idempotencyKey,
                    previewToken: preview.previewToken,
                  })
                }
              >
                {applyMutation.isPending ? (
                  <Spinner size={16} />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                Apply{" "}
                {preview.summary.assessmentCreate +
                  preview.summary.create +
                  preview.summary.update}{" "}
                write
                {preview.summary.assessmentCreate +
                  preview.summary.create +
                  preview.summary.update ===
                1
                  ? ""
                  : "s"}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
