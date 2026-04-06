"use client";

import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useClassroomParams } from "@/hooks/use-classroom-params";
import { useFieldArray } from "react-hook-form";
import { useMemo } from "react";

import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@school-clerk/ui/table";

import { useClassroomFormContext } from "../classroom/form-context";
import FormCheckbox from "../controls/form-checkbox";
import FormInput from "../controls/form-input";
import { CustomSheetContentPortal } from "../custom-sheet-content";
import { SubmitButton } from "../submit-button";
import ConfirmBtn from "../confirm-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@school-clerk/ui/select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@school-clerk/ui/form";

export function Form({}) {
  const { setParams } = useClassroomParams();
  const { control, handleSubmit, watch, setValue } = useClassroomFormContext();
  const trpc = useTRPC();
  const qc = useQueryClient();
  const hasSubClass = watch("hasSubClass");
  const progressionMode = watch("progressionMode");
  const className = watch("className");

  const { mutate, isPending } = useMutation(
    trpc.classrooms.createClassroom.mutationOptions({
      onSuccess() {
        qc.invalidateQueries({ queryKey: trpc.classrooms.all.queryKey({}) });
        qc.invalidateQueries({
          queryKey: trpc.classrooms.getCurrentSessionClassroom.queryKey(),
        });
        qc.invalidateQueries({
          queryKey: trpc.academics.getClassrooms.infiniteQueryKey({}),
        });
        setParams(null);
      },
    })
  );
  const departments = useFieldArray({
    control,
    name: "departments",
    keyName: "_id",
  });
  const { data: classroomStructures } = useQuery(
    trpc.classrooms.getCurrentSessionClassroom.queryOptions(),
  );

  const structureSuggestions = useMemo(() => {
    const rows = classroomStructures?.data ?? [];
    const groups = new Map<
      string,
      {
        className: string;
        classLevel: number | null;
        streams: { name: string; departmentLevel: number | null }[];
      }
    >();

    for (const row of rows) {
      const classRoomId = row.classRoom?.id;
      if (!classRoomId) continue;
      const existing = groups.get(classRoomId) ?? {
        className: row.classRoom?.name ?? "Class",
        classLevel: row.classRoom?.classLevel ?? null,
        streams: [],
      };
      existing.streams.push({
        name: row.departmentName ?? row.displayName ?? "",
        departmentLevel: row.departmentLevel ?? null,
      });
      groups.set(classRoomId, existing);
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        streams: group.streams.sort(
          (a, b) => (a.departmentLevel ?? 9999) - (b.departmentLevel ?? 9999),
        ),
      }))
      .filter((group) => group.streams.length > 0)
      .sort((a, b) => {
        const exactName = Number(
          a.className.toLowerCase() === className?.trim().toLowerCase(),
        );
        const exactNameB = Number(
          b.className.toLowerCase() === className?.trim().toLowerCase(),
        );
        if (exactName !== exactNameB) return exactNameB - exactName;
        return (a.classLevel ?? 9999) - (b.classLevel ?? 9999);
      })
      .slice(0, 6);
  }, [className, classroomStructures]);

  const applySuggestion = (
    suggestion: (typeof structureSuggestions)[number],
  ) => {
    setValue("hasSubClass", suggestion.streams.length > 1);
    setValue(
      "progressionMode",
      suggestion.streams.some((stream) => stream.departmentLevel !== null)
        ? "department"
        : "classroom",
    );
    setValue(
      "departments",
      suggestion.streams.map((stream) => ({
        name: stream.name,
        departmentLevel:
          suggestion.streams.some((item) => item.departmentLevel !== null)
            ? stream.departmentLevel
            : null,
      })),
    );
  };

  const onSubmit = handleSubmit((data) => {
    const normalizedDepartments = data.hasSubClass
      ? (data.departments ?? []).filter((department) => department?.name?.trim())
      : [
          {
            name: data.className.trim(),
            departmentLevel:
              data.progressionMode === "department" ? 1 : null,
          },
        ];

    if (!normalizedDepartments.length) {
      return;
    }

    if (
      data.progressionMode === "department" &&
      normalizedDepartments.some((department) => department.departmentLevel == null)
    ) {
      return;
    }

    mutate({
      classRoomId: data.classRoomId,
      className: data.className,
      classLevel: data.classLevel,
      departments: normalizedDepartments,
    });
  });
  return (
    <div className="grid gap-4 ">
      <FormInput
        name="className"
        label="Class Name"
        control={control}
        placeholder="Pre Nur"
      />
      <FormInput
        name="classLevel"
        label="Class Level"
        type="number"
        control={control}
      />
      <FormCheckbox
        name="hasSubClass"
        control={control}
        switchInput
        label="Sub-class"
        description="Turn this on when the class has multiple streams like Emerald/Gold/Silver or A/B/C."
      />
      <FormField
        control={control}
        name="progressionMode"
        render={({ field }) => (
          <FormItem className="mx-1">
            <FormLabel>Progression Mode</FormLabel>
            <FormControl>
              <Select
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select progression mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classroom">Between Classes</SelectItem>
                  <SelectItem value="department">Within Sub-classes</SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
          </FormItem>
        )}
      />

      {hasSubClass && structureSuggestions.length > 0 && (
        <div className="mx-1 space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Quick Fill from Existing Structures</p>
              <p className="text-xs text-muted-foreground">
                Reuse stream setups already used in this school. Clicking a suggestion fills stream levels too when available.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {structureSuggestions.map((suggestion, index) => (
              <Button
                key={`${suggestion.className}-${index}`}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applySuggestion(suggestion)}
                className="h-auto flex-col items-start gap-1 px-3 py-2 text-left"
              >
                <span className="font-medium">
                  {suggestion.className}
                  {suggestion.classLevel ? ` · Level ${suggestion.classLevel}` : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {suggestion.streams
                    .map((stream) =>
                      stream.departmentLevel != null
                        ? `${stream.name} (${stream.departmentLevel})`
                        : stream.name,
                    )
                    .join(", ")}
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {!hasSubClass && (
        <div className="mx-1 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          This class will create one default stream automatically because the system stores enrollment by stream internally.
        </div>
      )}

      {hasSubClass && (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Stream</TableHead>
            {progressionMode === "department" && <TableHead>Stream Level</TableHead>}
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {departments.fields.map((d, i) => (
            <TableRow key={d._id}>
              <TableCell>
                <FormInput
                  name={`departments.${i}.name`}
                  control={control}
                  placeholder="Emerald"
                />
              </TableCell>
              {progressionMode === "department" && (
                <TableCell>
                  <FormInput
                    type="number"
                    name={`departments.${i}.departmentLevel`}
                    control={control}
                  />
                </TableCell>
              )}
              <TableCell className="w-12">
                <ConfirmBtn
                  trash
                  onClick={(e) => {
                    departments.remove(i);
                  }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      )}
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => {
            departments.append({
              name: "",
              departmentLevel:
                progressionMode === "department"
                  ? (departments.fields.length || 0) + 1
                  : null,
            });
          }}
          disabled={!hasSubClass}
        >
          Add Stream
        </Button>
      </div>
      {hasSubClass && departments.fields.length > 0 && (
        <div className="mx-1 flex flex-wrap gap-2">
          {departments.fields.map((department, index) => (
            <Badge key={department._id} variant="outline">
              {department.name || `Stream ${index + 1}`}
              {progressionMode === "department"
                ? ` · ${watch(`departments.${index}.departmentLevel`) ?? "—"}`
                : ""}
            </Badge>
          ))}
        </div>
      )}
      <CustomSheetContentPortal>
        <form onSubmit={onSubmit}>
          <div className="flex justify-end">
            <SubmitButton isSubmitting={isPending}>Submit</SubmitButton>
          </div>
        </form>
      </CustomSheetContentPortal>
    </div>
  );
}
