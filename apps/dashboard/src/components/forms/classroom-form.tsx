"use client";

import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useClassroomParams } from "@/hooks/use-classroom-params";
import { useFieldArray } from "react-hook-form";
import { useMemo, useState, type ReactNode } from "react";

import { cn } from "@school-clerk/ui/cn";
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
import { ComboboxDropdown } from "@school-clerk/ui/combobox-dropdown";
import { Label } from "@school-clerk/ui/label";
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

type Props = {
  onSuccess?: () => void;
  submitLabel?: ReactNode;
  submitPlacement?: "portal" | "inline";
};

type FeeItemType = "TUITION_FEE" | "BOOK" | "OTHER";
type ExistingFinanceItem = {
  id: string;
  type?: string | null;
  name?: string | null;
  streamId?: string | null;
  streamName?: string | null;
  collectable?: boolean | null;
  classroomDepartments?: { id: string }[];
};

function inferFeeItemType(title: string): FeeItemType {
  const normalized = title.toLowerCase();

  if (normalized.includes("tuition")) return "TUITION_FEE";
  if (normalized.includes("book")) return "BOOK";

  return "OTHER";
}

export function Form({
  onSuccess,
  submitLabel = "Submit",
  submitPlacement = "portal",
}: Props) {
  const { setParams } = useClassroomParams();
  const { control, handleSubmit, reset, watch, setValue } =
    useClassroomFormContext();
  const trpc = useTRPC();
  const qc = useQueryClient();
  const hasSubClass = watch("hasSubClass");
  const progressionMode = watch("progressionMode");
  const [enableFee, setEnableFee] = useState(false);

  const { data: streams = [] } = useQuery(
    trpc.finance.getStreams.queryOptions({ filter: "term" }),
  );
  const { data: financeItems = [] } = useQuery(
    trpc.finance.getItems.queryOptions(),
  );
  const defaultFees = watch("defaultFees") ?? [];

  const streamOptions = useMemo(
    () =>
      streams.map((stream) => ({
        id: stream.id,
        label: stream.name,
      })),
    [streams],
  );
  const feeTitleOptions = useMemo(() => {
    const options = new Map<
      string,
      { id: string; label: string; streamId?: string }
    >();

    for (const title of [
      "Tuition Fee",
      "Books",
      "Uniform",
      "Exam Fee",
      "Transport",
      "PTA Levy",
    ]) {
      options.set(title.toLowerCase(), { id: `preset:${title}`, label: title });
    }

    for (const stream of streamOptions) {
      options.set(stream.label.toLowerCase(), {
        id: stream.id,
        label: stream.label,
        streamId: stream.id,
      });
    }

    for (const item of financeItems as {
      name?: string | null;
      streamName?: string | null;
    }[]) {
      const title = item.streamName || item.name;
      if (!title) continue;

      options.set(title.toLowerCase(), {
        id: `item:${title}`,
        label: title,
      });
    }

    for (const fee of defaultFees) {
      const title = fee?.streamName;
      if (!title) continue;

      options.set(title.toLowerCase(), {
        id: `current:${title}`,
        label: title,
      });
    }

    return Array.from(options.values());
  }, [defaultFees, financeItems, streamOptions]);

  const getDescriptionOptions = (feeTitle?: string | null) => {
    const normalizedTitle = feeTitle?.trim().toLowerCase();
    const options = new Map<string, { id: string; label: string }>();

    const presets: Record<string, string[]> = {
      "tuition fee": ["Basic Tuition Fee"],
      books: ["English Language", "Mathematics", "Basic Science"],
      uniform: ["Shirt", "Trousers", "Sportswear"],
      "exam fee": ["Midterm Assessment", "Final Assessment"],
      transport: ["School Bus"],
      "pta levy": ["PTA Levy"],
    };

    for (const description of presets[normalizedTitle || ""] ?? []) {
      options.set(description.toLowerCase(), {
        id: `preset:${description}`,
        label: description,
      });
    }

    for (const item of financeItems as {
      name?: string | null;
      streamName?: string | null;
      description?: string | null;
    }[]) {
      if (
        normalizedTitle &&
        item.streamName?.trim().toLowerCase() !== normalizedTitle &&
        item.name?.trim().toLowerCase() !== normalizedTitle
      ) {
        continue;
      }

      if (!item.description) continue;

      options.set(item.description.toLowerCase(), {
        id: `item:${item.description}`,
        label: item.description,
      });
    }

    for (const fee of defaultFees) {
      if (
        normalizedTitle &&
        fee?.streamName?.trim().toLowerCase() !== normalizedTitle
      ) {
        continue;
      }

      for (const line of fee?.lines ?? []) {
        if (!line?.description) continue;

        options.set(line.description.toLowerCase(), {
          id: `current:${line.description}`,
          label: line.description,
        });
      }
    }

    return Array.from(options.values());
  };

  const { mutateAsync: createFinanceItem, isPending: creatingFee } = useMutation(
    trpc.finance.createItem.mutationOptions({
      onSuccess() {
        qc.invalidateQueries({
          queryKey: trpc.finance.getItems.queryKey(),
        });
        qc.invalidateQueries({
          queryKey: trpc.finance.getStreams.queryKey({ filter: "term" }),
        });
        qc.invalidateQueries({
          queryKey: trpc.finance.overview.queryKey(),
        });
      },
    }),
  );

  const { mutate, isPending } = useMutation(
    trpc.classrooms.createClassroom.mutationOptions({
      async onSuccess(data) {
        qc.invalidateQueries({ queryKey: trpc.classrooms.all.queryKey({}) });
        qc.invalidateQueries({
          queryKey: trpc.classrooms.getCurrentSessionClassroom.queryKey(),
        });
        qc.invalidateQueries({
          queryKey: trpc.academics.getClassrooms.infiniteQueryKey({}),
        });

        if (enableFee) {
          const classroomDepartmentIds = data.classRoomDepartments.map(
            (d) => d.id,
          );
          const financeItemInputs = defaultFees.flatMap((fee) => {
            const title = fee?.streamName?.trim();
            if (!title) return [];

            return (fee.lines ?? [])
              .filter((line) => line?.description?.trim() && line?.amount)
              .map((line) => {
                const name = line.description?.trim() || title;
                const type = inferFeeItemType(title);
                const existingItem = (
                  financeItems as ExistingFinanceItem[]
                ).find(
                  (item) =>
                    item.type === type &&
                    item.streamName?.trim().toLowerCase() ===
                      title.toLowerCase() &&
                    item.name?.trim().toLowerCase() === name.toLowerCase(),
                );
                const mergedClassroomDepartmentIds = Array.from(
                  new Set([
                    ...(existingItem?.classroomDepartments?.map(
                      (department) => department.id,
                    ) ?? []),
                    ...classroomDepartmentIds,
                  ]),
                );

                return {
                  accountType: "CREDIT" as const,
                  amount: line.amount ?? 0,
                  classRoomDepartmentIds: mergedClassroomDepartmentIds,
                  collectable: Boolean(existingItem?.collectable || fee.required),
                  description: line.description?.trim() || null,
                  name,
                  streamId: fee.streamId || existingItem?.streamId || null,
                  streamName: title,
                  type,
                  sessionId: null,
                  termId: null,
                  id: existingItem?.id ?? null,
                  isActive: true,
                };
              });
          });

          for (const item of financeItemInputs) {
            await createFinanceItem(item);
          }
        }

        reset();
        setParams(null);
        onSuccess?.();
      },
    }),
  );
  const departments = useFieldArray({
    control,
    name: "departments",
    keyName: "_id",
  });
  const feeGroups = useFieldArray({
    control,
    name: "defaultFees",
    keyName: "_id",
  });
  const { data: classroomStructures } = useQuery(
    trpc.classrooms.getCurrentSessionClassroom.queryOptions(),
  );

  const { data: allSchoolClassNames } = useQuery(
    trpc.classrooms.getSchoolClassNames.queryOptions(),
  );

  const suggestedClassNames = useMemo(() => {
    const fetchedNames = allSchoolClassNames || [];
    const currentNames = new Set(
      (classroomStructures?.data ?? []).map((c) =>
        c.classRoom?.name?.toLowerCase().trim(),
      ),
    );

    const defaultClasses = [
      { name: "Creche", classLevel: 1 },
      { name: "Pre Nur", classLevel: 2 },
      { name: "Nur 1", classLevel: 3 },
      { name: "Nur 2", classLevel: 4 },
      { name: "Basic 1", classLevel: 5 },
      { name: "Basic 2", classLevel: 6 },
      { name: "Basic 3", classLevel: 7 },
      { name: "Basic 4", classLevel: 8 },
      { name: "Basic 5", classLevel: 9 },
      { name: "JSS 1", classLevel: 10 },
      { name: "JSS 2", classLevel: 11 },
      { name: "JSS 3", classLevel: 12 },
      { name: "SS 1", classLevel: 13 },
      { name: "SS 2", classLevel: 14 },
      { name: "SS 3", classLevel: 15 },
    ];

    const combined = [...fetchedNames];
    const seen = new Set(fetchedNames.map((f) => f.name.toLowerCase()));

    for (const d of defaultClasses) {
      if (!seen.has(d.name.toLowerCase())) {
        combined.push(d);
        seen.add(d.name.toLowerCase());
      }
    }

    return combined
      .filter((c) => !currentNames.has(c.name.toLowerCase()))
      .sort((a, b) => (a.classLevel || 99) - (b.classLevel || 99))
      .slice(0, 15);
  }, [allSchoolClassNames, classroomStructures]);

  const highestClassLevel = useMemo(() => {
    const rows = classroomStructures?.data ?? [];
    let max = 0;
    for (const row of rows) {
      if (row.classRoom?.classLevel) {
        max = Math.max(max, row.classRoom.classLevel);
      }
    }
    return max;
  }, [classroomStructures]);

  const structureSuggestions = useMemo(() => {
    const rows = classroomStructures?.data ?? [];

    const classGroups = new Map<
      string,
      { name: string; departmentLevel: number | null }[]
    >();

    for (const row of rows) {
      const classRoomId = row.classRoom?.id;
      if (!classRoomId) continue;

      const existing = classGroups.get(classRoomId) ?? [];
      existing.push({
        name: row.departmentName ?? row.displayName ?? "",
        departmentLevel: row.departmentLevel ?? null,
      });
      classGroups.set(classRoomId, existing);
    }

    const uniqueGroups = new Map<
      string,
      { streams: { name: string; departmentLevel: number | null }[] }
    >();

    for (const streams of classGroups.values()) {
      if (streams.length <= 1) continue;

      const sortedStreams = streams.sort(
        (a, b) => (a.departmentLevel ?? 9999) - (b.departmentLevel ?? 9999),
      );

      const key = sortedStreams
        .map((s) => `${s.name.trim().toLowerCase()}_${s.departmentLevel}`)
        .join("|");

      if (!uniqueGroups.has(key)) {
        uniqueGroups.set(key, { streams: sortedStreams });
      }
    }

    return Array.from(uniqueGroups.values()).slice(0, 6);
  }, [classroomStructures]);

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
        departmentLevel: suggestion.streams.some(
          (item) => item.departmentLevel !== null,
        )
          ? stream.departmentLevel
          : null,
      })),
    );
  };

  const onSubmit = handleSubmit((data) => {
    const normalizedDepartments = data.hasSubClass
      ? (data.departments ?? []).filter((department) =>
          department?.name?.trim(),
        )
      : [
          {
            name: data.className.trim(),
            departmentLevel: data.progressionMode === "department" ? 1 : null,
          },
        ];

    if (!normalizedDepartments.length) {
      return;
    }

    if (
      data.progressionMode === "department" &&
      normalizedDepartments.some(
        (department) => department.departmentLevel == null,
      )
    ) {
      return;
    }

    mutate({
      classRoomId: data.classRoomId,
      className: data.className,
      classLevel: data.classLevel,
      hasSubClass: data.hasSubClass,
      progressionMode: data.progressionMode,
      departments: normalizedDepartments,
    });
  });
  const actions = (
    <form onSubmit={onSubmit}>
      <div className="flex justify-end">
        <SubmitButton isSubmitting={isPending || creatingFee}>
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );

  return (
    <div className="grid gap-4 ">
      <div>
        <FormInput
          name="className"
          label="Class Name"
          control={control}
          placeholder="Pre Nur"
        />
        {suggestedClassNames.length > 0 && (
          <div className="mx-1 mt-2 flex flex-wrap gap-2">
            {suggestedClassNames.map((suggestion) => (
              <Badge
                key={suggestion.name}
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/80"
                onClick={() => {
                  setValue("className", suggestion.name);
                  if (suggestion.classLevel != null) {
                    setValue("classLevel", suggestion.classLevel);
                  }
                }}
              >
                {suggestion.name}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <FormField
        control={control}
        name="classLevel"
        render={({ field }) => {
          const maxLevel = Math.max(
            10,
            highestClassLevel ? highestClassLevel + 3 : 10,
          );
          const levels = Array.from({ length: maxLevel }, (_, i) => i + 1);

          return (
            <FormItem className="mx-1">
              <FormLabel>Class Level</FormLabel>
              <FormControl>
                <div className="flex flex-row gap-2 flex-wrap">
                  {levels.map((level) => (
                    <Button
                      key={level}
                      type="button"
                      variant={
                        Number(field.value) === level ? "default" : "outline"
                      }
                      onClick={() => field.onChange(level)}
                      className="w-10 h-10 p-0"
                    >
                      {level}
                    </Button>
                  ))}
                </div>
              </FormControl>
            </FormItem>
          );
        }}
      />
      <FormCheckbox
        name="hasSubClass"
        control={control}
        switchInput
        label="Sub-class"
        description="Turn this on when the class has multiple streams like Emerald/Gold/Silver or A/B/C."
      />
      {hasSubClass && (
        <FormField
          control={control}
          name="progressionMode"
          render={({ field }) => (
            <FormItem className="mx-1">
              <FormLabel>Progression Mode</FormLabel>
              <FormControl>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div
                    className={cn(
                      "cursor-pointer rounded-lg border p-4 text-left transition-all hover:border-primary",
                      field.value === "classroom"
                        ? "border-primary bg-primary/5"
                        : "border-border",
                    )}
                    onClick={() => field.onChange("classroom")}
                  >
                    <p className="font-semibold text-sm">Between Classes</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Students progress to the next class level entirely.
                    </p>
                  </div>
                  <div
                    className={cn(
                      "cursor-pointer rounded-lg border p-4 text-left transition-all hover:border-primary",
                      field.value === "department"
                        ? "border-primary bg-primary/5"
                        : "border-border",
                    )}
                    onClick={() => field.onChange("department")}
                  >
                    <p className="font-semibold text-sm">Within Sub-classes</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Students progress through different sub-class levels
                      within this same class.
                    </p>
                  </div>
                </div>
              </FormControl>
            </FormItem>
          )}
        />
      )}

      {hasSubClass && structureSuggestions.length > 0 && (
        <div className="mx-1 space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">
                Quick Fill from Existing Structures
              </p>
              <p className="text-xs text-muted-foreground">
                Reuse stream setups already used in this school. Clicking a
                suggestion fills stream levels too when available.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {structureSuggestions.map((suggestion, index) => (
              <Button
                key={index}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applySuggestion(suggestion)}
                className="h-auto px-3 py-2 text-left font-medium"
              >
                {suggestion.streams
                  .map((stream) =>
                    stream.departmentLevel != null
                      ? `${stream.name} (${stream.departmentLevel})`
                      : stream.name,
                  )
                  .join(", ")}
              </Button>
            ))}
          </div>
        </div>
      )}

      {hasSubClass && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stream</TableHead>
              {progressionMode === "department" && (
                <TableHead>Stream Level</TableHead>
              )}
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
      {hasSubClass && (
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
          >
            Add Stream
          </Button>
        </div>
      )}
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

      <div className="mx-1 space-y-4 rounded-lg border p-4 bg-muted/20">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="enableFee"
            checked={enableFee}
            onChange={(e) => {
              setEnableFee(e.target.checked);
              if (e.target.checked && !feeGroups.fields.length) {
                feeGroups.append({
                  streamId: null,
                  streamName: "Tuition Fee",
                  required: true,
                  lines: [{ description: "Basic Tuition Fee", amount: null }],
                });
              } else if (!e.target.checked) {
                setValue("defaultFees", []);
              }
            }}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <div className="space-y-1 leading-none">
            <label
              htmlFor="enableFee"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Set fees for this class
            </label>
            <p className="text-xs text-muted-foreground">
              Add tuition, books, uniforms, and other required or optional fees.
            </p>
          </div>
        </div>

        {enableFee && (
          <div className="grid gap-4 pt-2 border-t">
            {feeGroups.fields.map((fee, feeIndex) => {
              const feeValue = defaultFees[feeIndex];
              const selectedFeeTitle =
                feeTitleOptions.find(
                  (option) => option.label === feeValue?.streamName,
                ) ||
                (feeValue?.streamName
                  ? {
                      id: `current:${feeValue.streamName}`,
                      label: feeValue.streamName,
                    }
                  : undefined);
              const feeLines = feeValue?.lines?.length
                ? feeValue.lines
                : [{ description: "", amount: null }];

              return (
                <div key={fee._id} className="grid gap-3 rounded-md border p-3">
                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <div className="grid gap-2">
                      <Label>Fee Title</Label>
                      <ComboboxDropdown
                        items={feeTitleOptions}
                        selectedItem={selectedFeeTitle}
                        placeholder="Select or create a fee title"
                        searchPlaceholder="Search or create fee title..."
                        onSelect={(stream) => {
                          setValue(
                            `defaultFees.${feeIndex}.streamId`,
                            stream.streamId ?? "",
                          );
                          setValue(
                            `defaultFees.${feeIndex}.streamName`,
                            stream.label,
                          );
                        }}
                        onCreate={(value) => {
                          const nextTitle = value.trim();
                          setValue(`defaultFees.${feeIndex}.streamId`, "");
                          setValue(
                            `defaultFees.${feeIndex}.streamName`,
                            nextTitle,
                          );
                        }}
                        renderOnCreate={(value) => (
                          <span>Create new fee title "{value}"</span>
                        )}
                      />
                    </div>
                    {feeGroups.fields.length > 1 && (
                      <div className="flex items-end justify-end">
                        <ConfirmBtn
                          trash
                          onClick={() => {
                            feeGroups.remove(feeIndex);
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid gap-2">
                    {feeLines.map((line, lineIndex) => {
                      const descriptionOptions = getDescriptionOptions(
                        feeValue?.streamName,
                      );
                      const selectedDescription =
                        descriptionOptions.find(
                          (option) => option.label === line?.description,
                        ) ||
                        (line?.description
                          ? {
                              id: `current:${line.description}`,
                              label: line.description,
                            }
                          : undefined);

                      return (
                        <div
                          key={`${fee._id}-${lineIndex}`}
                          className="flex flex-col gap-3 md:flex-row md:items-end"
                        >
                          <div className="grid gap-2 md:w-1/5">
                            {lineIndex === 0 ? <Label>Fee Type</Label> : null}
                            {lineIndex === 0 ? (
                              <Select
                                value={
                                  feeValue?.required === false
                                    ? "optional"
                                    : "required"
                                }
                                onValueChange={(value) => {
                                  setValue(
                                    `defaultFees.${feeIndex}.required`,
                                    value === "required",
                                  );
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="required">
                                    Required
                                  </SelectItem>
                                  <SelectItem value="optional">
                                    Optional
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="hidden h-10 md:block" />
                            )}
                          </div>
                          <div className="grid gap-2 md:w-full">
                            {lineIndex === 0 ? <Label>Description</Label> : null}
                            <ComboboxDropdown
                              items={descriptionOptions}
                              selectedItem={selectedDescription}
                              placeholder="Select or create description"
                              searchPlaceholder="Search or create description..."
                              onSelect={(description) => {
                                setValue(
                                  `defaultFees.${feeIndex}.lines.${lineIndex}.description`,
                                  description.label,
                                );
                              }}
                              onCreate={(value) => {
                                setValue(
                                  `defaultFees.${feeIndex}.lines.${lineIndex}.description`,
                                  value.trim(),
                                );
                              }}
                              renderOnCreate={(value) => (
                                <span>Create description "{value}"</span>
                              )}
                            />
                          </div>
                          <div className="md:w-1/5">
                            <FormInput
                              label={lineIndex === 0 ? "Amount" : undefined}
                              name={`defaultFees.${feeIndex}.lines.${lineIndex}.amount`}
                              control={control}
                              numericProps={{
                                prefix: "NGN ",
                                placeholder: "NGN 0",
                                thousandSeparator: true,
                              }}
                            />
                          </div>
                          {feeLines.length > 1 && (
                            <div className="flex items-end justify-end">
                              <ConfirmBtn
                                trash
                                onClick={() => {
                                  setValue(
                                    `defaultFees.${feeIndex}.lines`,
                                    feeLines.filter(
                                      (_line, index) => index !== lineIndex,
                                    ),
                                  );
                                }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setValue(`defaultFees.${feeIndex}.lines`, [
                          ...feeLines,
                          { description: "", amount: null },
                        ]);
                      }}
                    >
                      Add Sub Fee
                    </Button>
                  </div>
                </div>
              );
            })}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                feeGroups.append({
                  streamId: null,
                  streamName: "",
                  required: true,
                  lines: [{ description: "", amount: null }],
                });
              }}
            >
              Add More Fee
            </Button>
          </div>
        )}
      </div>

      {submitPlacement === "inline" ? (
        actions
      ) : (
        <CustomSheetContentPortal>{actions}</CustomSheetContentPortal>
      )}
    </div>
  );
}
