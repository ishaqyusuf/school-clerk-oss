import { useZodForm } from "@/hooks/use-zod-form";
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
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { parseAsString, useQueryStates } from "nuqs";
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
  const rawLineCount = useMemo(
    () => raw.split(/\r?\n/).filter((line) => line.trim()).length,
    [raw],
  );
  const setupFixCount =
    warningCount +
    (needsClassroomSelection ? 1 : 0) +
    (raw.trim() && parsedStudentCount === 0 ? 1 : 0);
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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Dialog.Title className="text-base font-semibold">
                Import Students
              </Dialog.Title>
              <Dialog.Description className="text-xs text-muted-foreground">
                Paste names, review the rows that need decisions, then import
                the checked rows.
              </Dialog.Description>
            </div>
            <Badge variant="outline" className="bg-background">
              {workflowPhase === "setup"
                ? "Setup"
                : workflowPhase === "review"
                  ? "Review"
                  : "Import"}
            </Badge>
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
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 sm:px-6">
                <div className="rounded-md border bg-background p-2">
                  <div className="grid gap-2 md:grid-cols-[12rem_minmax(14rem,1fr)_13rem]">
                    <Controller
                      name="importMode"
                      control={form.control}
                      render={({ field }) => (
                        <Field className="min-w-0 gap-1 px-2 py-1.5">
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
                          className="min-w-0 gap-1 px-2 py-1.5"
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
                          {needsClassroomSelection && (
                            <p className="text-[11px] text-destructive">
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
                        <Field className="min-w-0 gap-1 px-2 py-1.5">
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
                        </Field>
                      )}
                    />
                  </div>
                </div>

                <Controller
                  name="raw"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field
                      data-invalid={fieldState.invalid}
                      className="min-h-0 flex-1"
                    >
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
                          <Badge variant="outline">
                            {rawLineCount} line{rawLineCount === 1 ? "" : "s"}
                          </Badge>
                        </div>
                      </div>

                      <InputGroup className="mt-2 min-h-0 flex-1 overflow-hidden rounded-md border bg-background">
                        <InputGroup.TextArea
                          {...field}
                          id="student-data"
                          dir="rtl"
                          aria-invalid={fieldState.invalid}
                          className="min-h-[46vh] border-0 text-sm leading-7 shadow-none focus-visible:ring-0"
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

                {warningCount > 0 ? (
                  <details className="rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/15 dark:text-amber-200">
                    <summary className="cursor-pointer font-medium">
                      {warningCount} warning
                      {warningCount === 1 ? "" : "s"} in pasted data
                    </summary>
                    <div className="mt-2 max-h-32 space-y-1 overflow-y-auto">
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
                  </details>
                ) : null}
              </div>

              <Separator />
              <div className="flex shrink-0 flex-col gap-3 bg-background px-4 py-3 sm:flex-row sm:items-center sm:px-6">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge
                    variant="outline"
                    className={
                      canStartAnalysis
                        ? "border-green-200 text-green-700"
                        : setupFixCount > 0
                          ? "border-amber-300 text-amber-700"
                          : ""
                    }
                  >
                    {canStartAnalysis ? (
                      <CheckCircle2 className="mr-1 size-3" />
                    ) : setupFixCount > 0 ? (
                      <AlertTriangle className="mr-1 size-3" />
                    ) : null}
                    {canStartAnalysis
                      ? "Ready"
                      : needsClassroomSelection
                        ? "Classroom needed"
                        : parsedStudentCount
                          ? "Needs review"
                          : "Waiting for rows"}
                  </Badge>
                  <span>
                    {parsedStudentCount} parsed student
                    {parsedStudentCount === 1 ? "" : "s"}
                  </span>
                  <span>
                    {rawLineCount} pasted line{rawLineCount === 1 ? "" : "s"}
                  </span>
                  <span>
                    {setupFixCount} line{setupFixCount === 1 ? "" : "s"} to fix
                  </span>
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
                    Proceed
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
