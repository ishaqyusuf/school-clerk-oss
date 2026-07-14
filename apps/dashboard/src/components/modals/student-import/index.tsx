import { useZodForm } from "@/hooks/use-zod-form";
import { Alert, AlertDescription, AlertTitle } from "@school-clerk/ui/alert";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Dialog, Field, InputGroup, Tabs } from "@school-clerk/ui/composite";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@school-clerk/ui/select";
import { Separator } from "@school-clerk/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@school-clerk/ui/toggle-group";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileText,
  UsersRound,
} from "lucide-react";
import { parseAsString, useQueryStates } from "nuqs";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Controller } from "react-hook-form";
import { z } from "zod";
import { ImportActivity } from "./import-activities";
import { _trpc } from "@/components/static-trpc";
import { useQuery } from "@tanstack/react-query";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { parseRawInput } from "./parser";

const studentImportSchema = z.object({
  classRoomId: z.string().optional(),
  globalGender: z.enum(["Male", "Female", "unset", ""]).optional(),
  importMode: z.enum(["single", "multiple"]).optional(),
  raw: z.string().min(1, "Student data is required"),
});

export function StudentImportModal() {
  const [{ action }, setParams] = useQueryStates({
    action: parseAsString,
  });
  const [ls, setLs] = useLocalStorage("student-import-data", "");
  const open = action == "student-import";

  const { data: classList, isLoading: isClassListLoading } = useQuery(
    _trpc.classrooms.getCurrentSessionClassroom.queryOptions(),
  );
  const { data: importNameGuide } = useQuery(
    _trpc.students.getImportNameGuide.queryOptions(undefined, {
      enabled: open,
    }),
  );

  const form = useZodForm(studentImportSchema, {
    defaultValues: {
      classRoomId: "",
      globalGender: "unset",
      importMode: "multiple",
      raw: ls,
    },
  });

  const [tab, setTab] = useState("main");
  const [importPhase, setImportPhase] = useState<"review" | "import">("review");
  const onSubmit = () => {
    setImportPhase("review");
    setTab("importing");
  };
  const startNewImport = () => {
    form.setValue("raw", "", {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setLs("");
    setImportPhase("review");
    setTab("main");
  };
  const closeImport = () => {
    setImportPhase("review");
    setTab("main");
    setParams(null);
  };

  const raw = form.watch("raw");
  const classRoomId = form.watch("classRoomId");
  const globalGender = form.watch("globalGender");
  const importMode = form.watch("importMode") || "multiple";
  const needsClassroomSelection = importMode === "single" && !classRoomId;

  const parse = useMemo(() => {
    const selectedDept = classList?.data?.find((d) => d.id === classRoomId);
    const classRoomName = selectedDept
      ? selectedDept.classRoom
        ? `${selectedDept.classRoom.name} - ${selectedDept.departmentName}`
        : selectedDept.departmentName
      : "";
    const classroomsForParsing =
      importMode === "multiple" ? classList?.data || [] : [];

    return parseRawInput(
      raw,
      classRoomName,
      classRoomId || "",
      globalGender,
      importNameGuide?.names || [],
      classroomsForParsing,
    );
  }, [
    raw,
    classRoomId,
    classList?.data,
    globalGender,
    importMode,
    importNameGuide?.names,
  ]);
  const warningCount = parse?.warnings?.length || 0;
  const parsedStudentCount = parse?.students?.length || 0;
  const canStartAnalysis =
    Boolean(raw?.trim()) &&
    !isClassListLoading &&
    !needsClassroomSelection &&
    parsedStudentCount > 0;
  const workflowPhase =
    tab === "main"
      ? ("setup" as const)
      : importPhase === "import"
        ? "import"
        : "review";

  useEffect(() => {
    setLs(raw);
  }, [raw, setLs]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => {
        setParams(null);
      }}
    >
      <Dialog.Content className="flex h-[95vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden p-0 sm:h-[88vh] sm:max-h-[88vh] sm:max-w-5xl lg:max-w-6xl xl:max-w-7xl">
        <Dialog.Header className="shrink-0 border-b px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Dialog.Title className="text-lg font-semibold">
                  Import Students
                </Dialog.Title>
                <Badge variant="outline" className="bg-background">
                  {workflowPhase === "setup"
                    ? "Setup"
                    : workflowPhase === "review"
                      ? "Review"
                      : "Import"}
                </Badge>
              </div>
              <Dialog.Description className="max-w-2xl text-sm text-muted-foreground">
                Paste student names, assign classroom defaults, review matches,
                then import only the rows you approve.
              </Dialog.Description>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <WorkflowStep
                active={workflowPhase === "setup"}
                complete={
                  workflowPhase === "review" || workflowPhase === "import"
                }
                icon={<FileText className="size-3.5" />}
                label="Prepare"
              />
              <WorkflowStep
                active={workflowPhase === "review"}
                complete={workflowPhase === "import"}
                icon={<ClipboardList className="size-3.5" />}
                label="Review"
              />
              <WorkflowStep
                active={workflowPhase === "import"}
                complete={false}
                icon={<UsersRound className="size-3.5" />}
                label="Import"
              />
            </div>
          </div>
        </Dialog.Header>
        <Tabs.Root value={tab} className="flex min-h-0 flex-1 flex-col">
          <Tabs.Content
            value="main"
            className="m-0 flex min-h-0 flex-1 flex-col"
          >
            <form
              id="student-import-setup-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                  <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      <Controller
                        name="importMode"
                        control={form.control}
                        render={({ field }) => (
                          <Field className="rounded-md border bg-muted/10 p-3">
                            <Field.Label>Import mode</Field.Label>
                            <ToggleGroup
                              type="single"
                              variant="outline"
                              size="sm"
                              value={field.value || "multiple"}
                              onValueChange={(value) =>
                                field.onChange(value || "multiple")
                              }
                              className="grid grid-cols-2 justify-start"
                            >
                              <ToggleGroupItem
                                value="single"
                                aria-label="Import students into one classroom"
                                className="min-w-0"
                              >
                                Single
                              </ToggleGroupItem>
                              <ToggleGroupItem
                                value="multiple"
                                aria-label="Import students into multiple classrooms"
                                className="min-w-0"
                              >
                                Multiple
                              </ToggleGroupItem>
                            </ToggleGroup>
                          </Field>
                        )}
                      />
                      <Controller
                        name="classRoomId"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field
                            className="rounded-md border bg-muted/10 p-3 md:col-span-1"
                            data-invalid={
                              fieldState.invalid || needsClassroomSelection
                            }
                          >
                            <Field.Label htmlFor="classroom-select">
                              {importMode === "single"
                                ? "Classroom"
                                : "Fallback classroom"}
                            </Field.Label>
                            <Select
                              value={field.value || ""}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger
                                id="classroom-select"
                                aria-invalid={fieldState.invalid}
                                className="bg-background"
                              >
                                <SelectValue
                                  placeholder={
                                    isClassListLoading
                                      ? "Loading classrooms..."
                                      : importMode === "single"
                                        ? "Choose classroom"
                                        : "Optional fallback"
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {classList?.data?.map((dept) => (
                                  <SelectItem key={dept.id} value={dept.id}>
                                    {dept.classRoom
                                      ? `${dept.classRoom.name} - ${dept.departmentName}`
                                      : dept.departmentName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-[11px] text-muted-foreground">
                              {importMode === "single"
                                ? "Required for every pasted row."
                                : "Used only when a row has no resolved header."}
                            </p>
                            {needsClassroomSelection && (
                              <p className="text-xs text-destructive">
                                Choose a classroom for single-class import.
                              </p>
                            )}
                          </Field>
                        )}
                      />
                      <Controller
                        name="globalGender"
                        control={form.control}
                        render={({ field }) => (
                          <Field className="rounded-md border bg-muted/10 p-3">
                            <Field.Label>Global gender</Field.Label>
                            <ToggleGroup
                              type="single"
                              variant="outline"
                              size="sm"
                              value={
                                field.value === "Male" ||
                                field.value === "Female" ||
                                field.value === "unset"
                                  ? field.value
                                  : "unset"
                              }
                              onValueChange={(value) =>
                                field.onChange(value || "unset")
                              }
                              className="grid grid-cols-3 justify-start"
                            >
                              <ToggleGroupItem
                                value="unset"
                                aria-label="Do not use a global gender fallback"
                                className="min-w-0"
                              >
                                None
                              </ToggleGroupItem>
                              <ToggleGroupItem
                                value="Male"
                                aria-label="Use Male as the global gender"
                                className="min-w-0"
                              >
                                M
                              </ToggleGroupItem>
                              <ToggleGroupItem
                                value="Female"
                                aria-label="Use Female as the global gender"
                                className="min-w-0"
                              >
                                F
                              </ToggleGroupItem>
                            </ToggleGroup>
                            <p className="text-[11px] text-muted-foreground">
                              Optional fallback after row and section markers.
                            </p>
                          </Field>
                        )}
                      />
                    </div>

                    <Controller
                      name="raw"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <div className="flex flex-wrap items-end justify-between gap-2">
                            <div>
                              <Field.Label htmlFor="student-data">
                                Student data
                              </Field.Label>
                              <p className="text-xs text-muted-foreground">
                                {importMode === "single"
                                  ? "Paste student names. Gender markers and row-level gender are supported."
                                  : "Paste classroom headers, gender markers, and student names in one batch."}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary">
                                {parsedStudentCount} students
                              </Badge>
                              {warningCount > 0 ? (
                                <Badge
                                  variant="outline"
                                  className="border-amber-300 text-amber-700"
                                >
                                  {warningCount} warning
                                  {warningCount === 1 ? "" : "s"}
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="border-green-200 text-green-700"
                                >
                                  <CheckCircle2 className="mr-1 size-3" />
                                  No warnings
                                </Badge>
                              )}
                            </div>
                          </div>

                          <InputGroup className="mt-2 overflow-hidden rounded-md border bg-background">
                            <InputGroup.TextArea
                              {...field}
                              id="student-data"
                              dir="rtl"
                              aria-invalid={fieldState.invalid}
                              className="min-h-[42vh] border-0 text-sm leading-7 shadow-none focus-visible:ring-0"
                              placeholder={
                                importMode === "single"
                                  ? `M | Male\nJohn Doe\n\nF | Female\nMaryam Bello\nYusuf Ahmad, M`
                                  : `JSS 1 - A\nM | Male\nJohn Doe\n\nF | Female\nMaryam Bello\n\nJSS 2 - B\nYusuf Ahmad, M`
                              }
                            />
                          </InputGroup>
                        </Field>
                      )}
                    />

                    {warningCount > 0 && (
                      <Alert
                        variant="warning"
                        className="max-h-44 overflow-y-auto border-amber-200 bg-amber-50/70 text-amber-900 dark:text-amber-200"
                      >
                        <AlertTriangle className="size-4" />
                        <AlertTitle>
                          {warningCount} row
                          {warningCount === 1 ? "" : "s"} need a closer look
                        </AlertTitle>
                        <AlertDescription>
                          <div className="mt-2 space-y-1 text-xs">
                            {parse?.warnings.map((w, index) => (
                              <div
                                key={`${w.lineNumber}-${index}`}
                                className="rounded border border-amber-200/70 bg-background/70 px-2 py-1"
                              >
                                <span className="font-medium">
                                  Line {w.lineNumber}:
                                </span>{" "}
                                {w.warning}
                                <span className="text-muted-foreground">
                                  {" "}
                                  "{w.text}"
                                </span>
                              </div>
                            ))}
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <aside className="space-y-3">
                    <SetupSummaryCard
                      label="Rows parsed"
                      value={parsedStudentCount}
                      detail="Students ready for analysis"
                    />
                    <SetupSummaryCard
                      label="Mode"
                      value={importMode === "single" ? "Single" : "Multiple"}
                      detail={
                        importMode === "single"
                          ? "One classroom target"
                          : "Header-aware batch"
                      }
                    />
                    <SetupSummaryCard
                      label="Warnings"
                      value={warningCount}
                      detail={
                        warningCount
                          ? "Review before analysis"
                          : "No parser warnings"
                      }
                    />
                  </aside>
                </div>
              </div>

              <Separator />
              <div className="flex shrink-0 flex-col gap-3 bg-background px-4 py-3 sm:flex-row sm:items-center sm:px-6">
                <div className="min-w-0 text-xs text-muted-foreground">
                  <div className="font-medium text-foreground">
                    {canStartAnalysis
                      ? "Ready for import analysis"
                      : needsClassroomSelection
                        ? "Choose a classroom to continue"
                        : parsedStudentCount
                          ? "Resolve blockers to continue"
                          : "Paste at least one student row"}
                  </div>
                  <div>
                    {parsedStudentCount} parsed student
                    {parsedStudentCount === 1 ? "" : "s"}
                    {warningCount ? ` · ${warningCount} warning(s)` : ""}
                  </div>
                </div>
                <div className="flex flex-col-reverse gap-2 sm:ml-auto sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={closeImport}
                    className="sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="h-9 px-5 font-medium sm:w-auto"
                    disabled={!canStartAnalysis}
                  >
                    Start analysis
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                </div>
              </div>
            </form>
          </Tabs.Content>
          <Tabs.Content
            value="importing"
            className="m-0 min-h-0 flex-1 overflow-hidden px-4 py-4 sm:px-6"
          >
            <ImportActivity
              classrooms={
                classList?.data?.map((c) => ({ title: c.departmentName })) || []
              }
              students={parse?.students || []}
              onCancelImport={() => {
                setImportPhase("review");
                setTab("main");
              }}
              onStartNewImport={startNewImport}
              onCloseImport={closeImport}
              onPhaseChange={setImportPhase}
            />
          </Tabs.Content>
        </Tabs.Root>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function WorkflowStep({
  active,
  complete,
  icon,
  label,
}: {
  active: boolean;
  complete: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <div
      className={[
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1",
        active ? "border-primary bg-primary/5 text-foreground" : "",
        complete ? "border-green-200 bg-green-50 text-green-700" : "",
        !active && !complete ? "bg-muted/20" : "",
      ].join(" ")}
    >
      {complete ? <CheckCircle2 className="size-3.5" /> : icon}
      <span className="font-medium">{label}</span>
    </div>
  );
}

function SetupSummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail: string;
}) {
  return (
    <div className="rounded-md border bg-muted/10 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold leading-none text-foreground">
        {value}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}
