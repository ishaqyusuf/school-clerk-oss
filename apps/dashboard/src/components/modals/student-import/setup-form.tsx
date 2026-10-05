"use client";

import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Field, InputGroup } from "@school-clerk/ui/composite";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@school-clerk/ui/select";
import { Separator } from "@school-clerk/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@school-clerk/ui/toggle-group";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import type { parseRawInput } from "./parser";

export const studentImportSchema = z.object({
  classRoomId: z.string().optional(),
  globalGender: z.enum(["Male", "Female", "unset", ""]).optional(),
  raw: z.string().min(1, "Student data is required"),
});

type Props = {
  form: UseFormReturn<z.infer<typeof studentImportSchema>>;
  classList: { data: RouterOutputs["students"]["getStudentImportReference"]["classDepartments"] } | undefined;
  isClassListLoading: boolean;
  isReferenceLoading: boolean;
  referenceError: string | null;
  onRetryReferences: () => void;
  parse: ReturnType<typeof parseRawInput>;
  parsedStudentCount: number;
  rawLineCount: number;
  setupFixCount: number;
  canStartAnalysis: boolean;
  onSubmit: () => void;
  closeImport: () => void;
};

export function StudentImportSetupForm({
  form, classList, isClassListLoading, isReferenceLoading, referenceError,
  onRetryReferences, parse, parsedStudentCount, rawLineCount, setupFixCount,
  canStartAnalysis, onSubmit, closeImport,
}: Props) {
  const warningCount = parse.warnings.length;

  return (
    <form
      id="student-import-setup-form"
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-3 sm:gap-3 sm:px-6 sm:py-4">
        <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-[minmax(0,1fr)_9.75rem] sm:grid-cols-[minmax(0,1fr)_13rem]">
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
                    className="h-11 w-full min-w-0 bg-background sm:h-9"
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
                    className="h-11 min-w-0 sm:h-9"
                  >
                    None
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="Male"
                    aria-label="Use Male as the global gender"
                    className="h-11 min-w-0 sm:h-9"
                  >
                    M
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="Female"
                    aria-label="Use Female as the global gender"
                    className="h-11 min-w-0 sm:h-9"
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
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div className="h-11 min-w-0 sm:h-9">
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
                  className="min-h-[38dvh] resize-y border-0 text-base leading-7 shadow-none focus-visible:ring-0 sm:min-h-[46vh] sm:text-sm"
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

      {referenceError ? (
        <div role="alert" className="shrink-0 border-t px-3 py-2 text-sm sm:px-6">
          <p className="text-destructive">{referenceError}</p>
          <Button type="button" variant="outline" className="mt-2 min-h-11 sm:min-h-9" onClick={onRetryReferences}>
            Retry reference data
          </Button>
        </div>
      ) : null}
      <Separator />
      <div className="flex shrink-0 flex-col gap-2 bg-background px-3 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:px-6 sm:py-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground" role="status" aria-live="polite">
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
            {isReferenceLoading
              ? "Loading reference data"
              : referenceError
                ? "Reference data unavailable"
                : canStartAnalysis
              ? "Ready"
              : parsedStudentCount
                ? "Needs review"
                : "Waiting for rows"}
          </Badge>
          <span className="shrink-0">
            {parsedStudentCount} parsed student
            {parsedStudentCount === 1 ? "" : "s"}
          </span>
          <span className="shrink-0">
            {rawLineCount} pasted line{rawLineCount === 1 ? "" : "s"}
          </span>
          <span className="shrink-0">
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
  );
}
