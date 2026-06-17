import { useZodForm } from "@/hooks/use-zod-form";
import { Button } from "@school-clerk/ui/button";
import { Dialog, Field, InputGroup, Tabs } from "@school-clerk/ui/composite";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@school-clerk/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@school-clerk/ui/toggle-group";
import { parseAsString, useQueryStates } from "nuqs";
import { useEffect, useMemo, useState } from "react";
import { Controller } from "react-hook-form";
import { z } from "zod";
import { ImportActivity } from "./import-activities";
import { _trpc } from "@/components/static-trpc";
import { useQuery } from "@tanstack/react-query";
import { useLocalStorage } from "@/hooks/use-local-storage";

interface ParsedStudent {
  name: string;
  surname: string;
  otherName?: string;
  gender?: string;
  classRoom: string;
  classroomDepartmentId: string;
  lineNumber: number;
  originalText: string;
  parsedGender?: "M" | "F";
}

interface ParsedWarning {
  lineNumber: number;
  text: string;
  warning: string;
}

function parseGenderAlias(value: string): "M" | "F" | undefined {
  const lowerGender = value.trim().toLowerCase();

  if (lowerGender === "m" || lowerGender === "male") {
    return "M";
  }

  if (lowerGender === "f" || lowerGender === "female") {
    return "F";
  }

  return undefined;
}

function parseRawInput(
  rawText: string,
  classRoomName: string,
  classRoomId: string,
  globalGender?: "Male" | "Female" | "unset" | ""
): { students: ParsedStudent[]; warnings: ParsedWarning[] } {
  const students: ParsedStudent[] = [];
  const warnings: ParsedWarning[] = [];

  if (!rawText) {
    return { students, warnings };
  }

  const lines = rawText.split("\n");
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();
    if (!trimmed) return;

    const hasPunctuationNameDelimiter = /[,.]/.test(trimmed);
    const delimitedParts = hasPunctuationNameDelimiter
      ? trimmed
          .split(/[,.]/)
          .map((part) => part.trim())
          .filter(Boolean)
      : [];
    const lastDelimitedPart = delimitedParts[delimitedParts.length - 1] || "";
    const parsedGenderFromDelimitedPart = lastDelimitedPart
      ? parseGenderAlias(lastDelimitedPart)
      : undefined;
    const nameSourceParts = parsedGenderFromDelimitedPart
      ? delimitedParts.slice(0, -1)
      : delimitedParts;
    const nameTokens =
      hasPunctuationNameDelimiter && nameSourceParts.length > 1
        ? nameSourceParts
        : (nameSourceParts[0] || trimmed).split(/\s+/).filter(Boolean);

    if (!nameTokens.length) {
      warnings.push({
        lineNumber,
        text: trimmed,
        warning: "Empty student name part on line",
      });
      return;
    }

    const parsedGender: "M" | "F" | undefined = parsedGenderFromDelimitedPart;

    const effectiveGender =
      parsedGender ||
      (globalGender === "Male"
        ? "M"
          : globalGender === "Female"
            ? "F"
            : undefined);

    const name = nameTokens[0] || "";
    const surname = nameTokens[1] || "";
    const otherName = nameTokens.slice(2).join(" ") || undefined;

    if (!surname) {
      warnings.push({
        lineNumber,
        text: trimmed,
        warning: "Surname missing",
      });
    }

    students.push({
      name,
      surname,
      otherName,
      gender: effectiveGender,
      classRoom: classRoomName,
      classroomDepartmentId: classRoomId,
      lineNumber,
      originalText: trimmed,
      parsedGender,
    });
  });

  return { students, warnings };
}

const studentImportSchema = z.object({
  classRoomId: z
    .string({
      required_error: "Target classroom is required",
    })
    .min(1, "Target classroom is required"),
  globalGender: z.enum(["Male", "Female", "unset", ""]).optional(),
  raw: z.string().min(1, "Student data is required"),
});

export function StudentImportModal() {
  const [{ action }, setParams] = useQueryStates({
    action: parseAsString,
  });
  const [ls, setLs] = useLocalStorage("student-import-data", "");

  const { data: classList, isLoading: isClassListLoading } = useQuery(
    _trpc.classrooms.getCurrentSessionClassroom.queryOptions()
  );

  const form = useZodForm(studentImportSchema, {
    defaultValues: {
      classRoomId: "",
      globalGender: "unset",
      raw: ls,
    },
  });

  const [tab, setTab] = useState("main");
  const onSubmit = () => {
    setTab("importing");
  };

  const open = action == "student-import";
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

    return parseRawInput(raw, classRoomName, classRoomId, globalGender);
  }, [raw, classRoomId, classList?.data, globalGender]);

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
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Import Students</Dialog.Title>
          <Dialog.Description>
            Select a classroom and paste one student name per line.
          </Dialog.Description>
        </Dialog.Header>
        <Tabs.Root value={tab}>
          <Tabs.Content value="main">
            <form id="form-rhf-demo" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid w-full gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Controller
                    name="classRoomId"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <Field.Label htmlFor="classroom-select">
                          Target Classroom <span className="text-red-500">*</span>
                        </Field.Label>
                        <Select
                          value={field.value || ""}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger
                            id="classroom-select"
                            aria-invalid={fieldState.invalid}
                          >
                            <SelectValue
                              placeholder={
                                isClassListLoading
                                  ? "Loading classrooms..."
                                  : "Select a classroom"
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
                      </Field>
                    )}
                  />
                  <Controller
                    name="globalGender"
                    control={form.control}
                    render={({ field }) => (
                      <Field>
                        <Field.Label>
                          Global Gender (Optional)
                        </Field.Label>
                        <ToggleGroup
                          type="single"
                          variant="outline"
                          size="sm"
                          value={
                            field.value === "Male" ||
                            field.value === "Female"
                              ? field.value
                              : ""
                          }
                          onValueChange={(value) =>
                            field.onChange(value || "unset")
                          }
                          className="justify-start"
                        >
                          <ToggleGroupItem
                            value="Male"
                            aria-label="Use Male as the global gender"
                            className="w-14"
                          >
                            M
                          </ToggleGroupItem>
                          <ToggleGroupItem
                            value="Female"
                            aria-label="Use Female as the global gender"
                            className="w-14"
                          >
                            F
                          </ToggleGroupItem>
                        </ToggleGroup>
                      </Field>
                    )}
                  />
                </div>

                <Field.Group>
                  <Controller
                    name="raw"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <Field.Label htmlFor="student-data">
                          Student Data (One student per line)
                        </Field.Label>

                        <InputGroup>
                          <InputGroup.TextArea
                            {...field}
                            dir="rtl"
                            aria-invalid={fieldState.invalid}
                            className="min-h-[20vh]"
                            placeholder="Paste student name, optional gender (e.g. John Doe, Male)"
                          />
                          <InputGroup.Addon align="block-end">
                            <p className="text-xs text-muted-foreground mt-1">
                              {parse?.students?.length || 0} students
                            </p>
                            <InputGroup.Button
                              type="submit"
                              className="ml-auto"
                              size="sm"
                              variant="default"
                              disabled={
                                !form.formState.isValid || isClassListLoading
                              }
                            >
                              Submit
                            </InputGroup.Button>
                          </InputGroup.Addon>
                        </InputGroup>
                      </Field>
                    )}
                  />
                </Field.Group>

                {parse?.warnings && parse.warnings.length > 0 && (
                  <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4 space-y-2 max-h-40 overflow-y-auto text-xs font-mono">
                    <p className="font-semibold text-yellow-600 uppercase tracking-wide">
                      Warnings ({parse.warnings.length})
                    </p>
                    {parse.warnings.map((w, index) => (
                      <div
                        key={index}
                        className="text-yellow-600/90 py-0.5 border-b border-yellow-500/10 last:border-0"
                      >
                        Line {w.lineNumber}: {w.warning} (Text: "{w.text}")
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </form>
          </Tabs.Content>
          <Tabs.Content value="importing">
            <ImportActivity
              classrooms={
                classList?.data?.map((c) => ({ title: c.departmentName })) || []
              }
              students={parse?.students || []}
              onCancelImport={() => setTab("main")}
            />
          </Tabs.Content>
        </Tabs.Root>
      </Dialog.Content>
    </Dialog.Root>
  );
}
