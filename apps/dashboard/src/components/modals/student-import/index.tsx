import { useZodForm } from "@/hooks/use-zod-form";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Dialog, Field, InputGroup, Tabs } from "@school-clerk/ui/composite";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@school-clerk/ui/select";
import { Separator } from "@school-clerk/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@school-clerk/ui/toggle-group";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
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
  raw: z.string().min(1, "Student data is required"),
});

export function StudentImportModal() {
  const searchParams = useSearchParams();
  const [, setParams] = useQueryStates({
    action: parseAsString,
  });
  const [ls, setLs] = useLocalStorage("student-import-data", "");
  const open = searchParams.get("action") === "student-import";

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

  const parse = useMemo(() => {
    const selectedDept = classList?.data?.find((d) => d.id === classRoomId);
    const classRoomName = selectedDept
      ? selectedDept.classRoom
        ? `${selectedDept.classRoom.name} - ${selectedDept.departmentName}`
        : selectedDept.departmentName
      : "";
    return parseRawInput(
      raw,
      classRoomName,
      classRoomId || "",
      globalGender,
      importNameGuide?.names || [],
      classList?.data || [],
    );
  }, [raw, classRoomId, classList?.data, globalGender, importNameGuide?.names]);
  const warningCount = parse?.warnings?.length || 0;
  const parsedStudentCount = parse?.students?.length || 0;
  const rawLineCount = useMemo(
    () => raw.split(/\r?\n/).filter((line) => line.trim()).length,
    [raw],
  );
  const setupFixCount =
    warningCount + (raw.trim() && parsedStudentCount === 0 ? 1 : 0);
  const canStartAnalysis =
    Boolean(raw?.trim()) && !isClassListLoading && parsedStudentCount > 0;
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
      <Dialog.Content className="flex h-dvh max-h-dvh w-screen max-w-none flex-col overflow-hidden rounded-none border-0 p-0 sm:h-[88vh] sm:max-h-[88vh] sm:w-[96vw] sm:max-w-5xl sm:rounded-lg sm:border lg:max-w-6xl xl:max-w-7xl">
        <Dialog.Header className="shrink-0 border-b px-3 py-2.5 sm:px-6 sm:py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Dialog.Title className="text-base leading-tight font-semibold">
                Import Students
              </Dialog.Title>
              <Dialog.Description className="hidden max-w-[18rem] text-[11px] leading-4 text-muted-foreground sm:block sm:max-w-none sm:text-xs">
                Paste names, review the rows that need decisions, then import
                the checked rows.
              </Dialog.Description>
            </div>
            <Badge
              variant="outline"
              className="hidden shrink-0 bg-background sm:inline-flex"
            >
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
              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-3 sm:gap-3 sm:px-6 sm:py-4">
                <div className="grid grid-cols-[minmax(0,1fr)_9.75rem] gap-2 sm:grid-cols-[minmax(14rem,1fr)_13rem]">
                  <Controller
                    name="classRoomId"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field
                        className="min-w-0 gap-1"
                        data-invalid={fieldState.invalid}
                      >
                        <Field.Label
                          htmlFor="classroom-select"
                          className="sr-only sm:not-sr-only sm:text-xs"
                        >
                          Fallback classroom
                        </Field.Label>
                        <Select
                          value={field.value || ""}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger
                            id="classroom-select"
                            aria-invalid={fieldState.invalid}
                            className="h-9 bg-background"
                          >
                            <SelectValue
                              placeholder={
                                isClassListLoading
                                  ? "Loading classrooms..."
                                  : "Classroom"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {classList?.data?.map((dept) => (
                                <SelectItem key={dept.id} value={dept.id}>
                                  {dept.classRoom
                                    ? `${dept.classRoom.name} - ${dept.departmentName}`
                                    : dept.departmentName}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  />
                  <Controller
                    name="globalGender"
                    control={form.control}
                    render={({ field }) => (
                      <Field className="min-w-0 gap-1">
                        <Field.Label className="sr-only sm:not-sr-only sm:text-xs">
                          Global gender
                        </Field.Label>
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
                          className="grid w-full grid-cols-3 justify-start"
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

                <Controller
                  name="raw"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field
                      data-invalid={fieldState.invalid}
                      className="min-h-0 flex-1 gap-2"
                    >
                      <div className="flex items-end justify-between gap-2">
                        <div className="min-w-0">
                          <Field.Label htmlFor="student-data">
                            Student data
                          </Field.Label>
                          <p className="hidden text-xs text-muted-foreground sm:line-clamp-2">
                            Paste classroom headers, gender markers, and student
                            names in one batch.
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Badge variant="secondary">
                            {parsedStudentCount} students
                          </Badge>
                          <Badge variant="outline">
                            {rawLineCount} line{rawLineCount === 1 ? "" : "s"}
                          </Badge>
                        </div>
                      </div>

                      <InputGroup className="min-h-0 flex-1 overflow-hidden rounded-md border bg-background">
                        <InputGroup.TextArea
                          {...field}
                          id="student-data"
                          dir="rtl"
                          aria-invalid={fieldState.invalid}
                          className="min-h-[52dvh] border-0 text-sm leading-7 shadow-none focus-visible:ring-0 sm:min-h-[46vh]"
                          placeholder={`JSS 1 - A\nM | Male\nJohn Doe\n\nF | Female\nMaryam Bello\n\nJSS 2 - B\nYusuf Ahmad, M`}
                        />
                      </InputGroup>
                    </Field>
                  )}
                />

                {warningCount > 0 ? (
                  <details className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-foreground">
                    <summary className="cursor-pointer font-medium">
                      {warningCount} warning
                      {warningCount === 1 ? "" : "s"} in pasted data
                    </summary>
                    <div className="mt-2 flex max-h-32 flex-col gap-1 overflow-y-auto">
                      {parse?.warnings.map((w, index) => (
                        <div
                          key={`${w.lineNumber}-${index}`}
                          className="rounded border bg-background/80 px-2 py-1"
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
              <div className="flex shrink-0 flex-col gap-2 bg-background px-3 py-2.5 sm:flex-row sm:items-center sm:px-6 sm:py-3">
                <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto text-xs text-muted-foreground">
                  <Badge
                    variant="outline"
                    className={
                      canStartAnalysis
                        ? "shrink-0 border-primary/30 text-primary"
                        : setupFixCount > 0
                          ? "shrink-0 border-border text-muted-foreground"
                          : "shrink-0"
                    }
                  >
                    {canStartAnalysis ? (
                      <CheckCircle2 className="mr-1" data-icon="inline-start" />
                    ) : setupFixCount > 0 ? (
                      <AlertTriangle
                        className="mr-1"
                        data-icon="inline-start"
                      />
                    ) : null}
                    {canStartAnalysis
                      ? "Ready"
                      : parsedStudentCount
                        ? "Needs review"
                        : "Waiting for rows"}
                  </Badge>
                  <span className="shrink-0">
                    {parsedStudentCount} parsed student
                    {parsedStudentCount === 1 ? "" : "s"}
                  </span>
                  <span className="hidden shrink-0 sm:inline">
                    {rawLineCount} pasted line{rawLineCount === 1 ? "" : "s"}
                  </span>
                  <span className="hidden shrink-0 sm:inline">
                    {setupFixCount} line{setupFixCount === 1 ? "" : "s"} to fix
                  </span>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-2 sm:ml-auto sm:flex sm:items-center">
                  <Button
                    type="submit"
                    className="h-10 font-medium sm:h-9 sm:w-auto sm:px-5"
                    disabled={!canStartAnalysis}
                  >
                    Proceed
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={closeImport}
                    className="h-10 px-4 sm:h-9 sm:w-auto"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
          </Tabs.Content>
          <Tabs.Content
            value="importing"
            className="m-0 min-h-0 flex-1 overflow-hidden px-4 py-4 sm:px-6"
          >
            {tab === "importing" ? (
              <ImportActivity
                classrooms={
                  classList?.data?.map((c) => ({ title: c.departmentName })) ||
                  []
                }
                students={parse?.students || []}
                isActive={open && tab === "importing"}
                onCancelImport={() => {
                  setImportPhase("review");
                  setTab("main");
                }}
                onStartNewImport={startNewImport}
                onCloseImport={closeImport}
                onPhaseChange={setImportPhase}
              />
            ) : null}
          </Tabs.Content>
        </Tabs.Root>
      </Dialog.Content>
    </Dialog.Root>
  );
}
