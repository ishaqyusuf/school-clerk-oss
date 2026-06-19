import { useZodForm } from "@/hooks/use-zod-form";
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
import { parseRawInput } from "./parser";

const studentImportSchema = z.object({
  classRoomId: z.string().optional(),
  globalGender: z.enum(["Male", "Female", "unset", ""]).optional(),
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
      raw: ls,
    },
  });

  const [tab, setTab] = useState("main");
  const onSubmit = () => {
    setTab("importing");
  };
  const startNewImport = () => {
    form.setValue("raw", "", {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setLs("");
    setTab("main");
  };
  const closeImport = () => {
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
      <Dialog.Content className="flex h-[85vh] max-h-[85vh] flex-col overflow-hidden">
        <Dialog.Header>
          <Dialog.Title>Import Students</Dialog.Title>
          <Dialog.Description>
            Select a default classroom or paste raw class-name headers before
            each group of student names.
          </Dialog.Description>
        </Dialog.Header>
        <Tabs.Root value={tab} className="flex min-h-0 flex-1 flex-col">
          <Tabs.Content
            value="main"
            className="min-h-0 flex-1 overflow-y-auto pr-1"
          >
            <form id="form-rhf-demo" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid w-full gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Controller
                    name="classRoomId"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <Field.Label htmlFor="classroom-select">
                          Default Classroom
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
                                  : "Use raw class headers or choose fallback"
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
                        <Field.Label>Global Gender (Optional)</Field.Label>
                        <ToggleGroup
                          type="single"
                          variant="outline"
                          size="sm"
                          value={
                            field.value === "Male" || field.value === "Female"
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
                          Student Data
                        </Field.Label>
                        <p className="text-xs text-muted-foreground">
                          Paste class names as headers, then student names
                          below. Use M/F marker lines for batch gender, or
                          row-level gender like John Doe, M.
                        </p>

                        <InputGroup>
                          <InputGroup.TextArea
                            {...field}
                            dir="rtl"
                            aria-invalid={fieldState.invalid}
                            className="min-h-[20vh]"
                            placeholder={`JSS 1 - A\nM | Male\nJohn Doe\n\nF | Female\nMaryam Bello\n\nJSS 2 - B\nYusuf Ahmad, M`}
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
                                !raw?.trim() ||
                                isClassListLoading ||
                                !parse?.students?.length
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
          <Tabs.Content
            value="importing"
            className="min-h-0 flex-1 overflow-hidden"
          >
            <ImportActivity
              classrooms={
                classList?.data?.map((c) => ({ title: c.departmentName })) || []
              }
              students={parse?.students || []}
              onCancelImport={() => setTab("main")}
              onStartNewImport={startNewImport}
              onCloseImport={closeImport}
            />
          </Tabs.Content>
        </Tabs.Root>
      </Dialog.Content>
    </Dialog.Root>
  );
}
