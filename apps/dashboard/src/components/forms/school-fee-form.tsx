"use client";

import FormMultipleSelector from "@/components/controls/form-multiple-selector";
import { useSchoolFeeParams } from "@/hooks/use-school-fee-params";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { ComboboxDropdown } from "@school-clerk/ui/combobox-dropdown";
import { Label } from "@school-clerk/ui/label";
import { RadioGroup, RadioGroupItem } from "@school-clerk/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@school-clerk/ui/select";

import FormInput from "../controls/form-input";
import { CustomSheetContentPortal } from "../custom-sheet-content";
import { useSchoolFeeFormContext } from "../school-fee/form-context";
import { SubmitButton } from "../submit-button";

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

export function Form() {
  const { schoolFeeId, setParams } = useSchoolFeeParams();
  const { control, handleSubmit, watch, setValue } = useSchoolFeeFormContext();
  const trpc = useTRPC();
  const qc = useQueryClient();

  const { data: streams = [] } = useQuery(
    trpc.finance.getStreams.queryOptions({ filter: "term" }),
  );
  const { data: classrooms } = useQuery(
    trpc.classrooms.getCurrentSessionClassroom.queryOptions(),
  );
  const { data: financeItems = [] } = useQuery(
    trpc.finance.getItems.queryOptions(),
  );
  const [streamId, streamName, title, collectionStatus, classroomDepartmentIds] = watch([
    "streamId",
    "streamName",
    "title",
    "collectionStatus",
    "classroomDepartmentIds"
  ]);

  const [feeTarget, setFeeTarget] = useState<"general" | "specific">(
    classroomDepartmentIds?.length ? "specific" : "general"
  );

  useEffect(() => {
    if (classroomDepartmentIds?.length) {
      setFeeTarget("specific");
    }
  }, [classroomDepartmentIds]);

  const streamOptions = useMemo(
    () =>
      streams.map((stream) => ({
        id: stream.id,
        label: stream.name,
      })),
    [streams],
  );
  const selectedStream =
    streamOptions.find((stream) => stream.id === streamId) ||
    (streamName?.trim() || title?.trim()
      ? {
          id: streamId || "__new__",
          label: (streamName || title).trim(),
        }
      : undefined);
  const classroomOptions =
    classrooms?.data?.map((department) => ({
      value: department.id,
      label: department.displayName,
    })) ?? [];

  const { mutate, isPending } = useMutation(
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
        setParams(null);
      },
    }),
  );

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label>Fee Title</Label>
        <ComboboxDropdown
          items={streamOptions}
          selectedItem={selectedStream}
          placeholder="Select or create a fee title"
          searchPlaceholder="Search or create fee title..."
          onSelect={(stream) => {
            setValue("streamId", stream.id);
            setValue("streamName", stream.label);
            setValue("title", stream.label);
          }}
          onCreate={(value) => {
            const nextTitle = value.trim();
            setValue("streamId", "");
            setValue("streamName", nextTitle);
            setValue("title", nextTitle);
          }}
          renderOnCreate={(value) => (
            <span>Create new fee title "{value}"</span>
          )}
        />
        <p className="text-sm text-muted-foreground">
          The fee title is also used as the incoming revenue stream for
          reporting.
        </p>
      </div>
      <FormInput
        name="description"
        label="Description"
        type="textarea"
        control={control}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormInput
          name="amount"
          label="Amount"
          control={control}
          numericProps={{
            prefix: "NGN ",
            placeholder: "NGN 0",
            thousandSeparator: true,
          }}
        />
        <div className="grid gap-2">
          <Label>Fee Type</Label>
          <Select
            value={collectionStatus ?? "NOT_COLLECTED"}
            onValueChange={(value) => {
              setValue(
                "collectionStatus",
                value as "NOT_REQUIRED" | "NOT_COLLECTED" | "COLLECTED",
              );
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NOT_COLLECTED">Required</SelectItem>
              <SelectItem value="NOT_REQUIRED">Optional</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-2 border-t pt-4">
        <Label>Target Audience</Label>
        <RadioGroup
          value={feeTarget}
          onValueChange={(val: "general" | "specific") => setFeeTarget(val)}
          className="flex flex-col gap-3 sm:flex-row sm:gap-6 mt-1"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="general" id="target-general" />
            <Label htmlFor="target-general" className="font-normal cursor-pointer">General (All Classes)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="specific" id="target-specific" />
            <Label htmlFor="target-specific" className="font-normal cursor-pointer">Specific Classrooms</Label>
          </div>
        </RadioGroup>
      </div>

      {feeTarget === "specific" && (
        <FormMultipleSelector
          control={control}
          name="classroomDepartmentIds"
          label="Applicable Classrooms"
          options={classroomOptions}
          placeholder="Select classrooms..."
        />
      )}
      <CustomSheetContentPortal>
        <form
          className="grid gap-4"
          onSubmit={handleSubmit((data) => {
            const resolvedTitle =
              (data.streamName?.trim() || data.title?.trim()) ?? "";
            const itemName = data.description?.trim() || resolvedTitle;
            const itemType = inferFeeItemType(resolvedTitle);
            const selectedClassroomIds = feeTarget === "specific" ? (data.classroomDepartmentIds ?? []) : [];
            const existingItem = (financeItems as ExistingFinanceItem[]).find(
              (item) =>
                item.type === itemType &&
                item.streamName?.trim().toLowerCase() ===
                  resolvedTitle.toLowerCase() &&
                item.name?.trim().toLowerCase() === itemName.toLowerCase(),
            );
            const itemId = data.feeId || existingItem?.id || null;
            const classRoomDepartmentIds = data.feeId
              ? selectedClassroomIds
              : Array.from(
                  new Set([
                    ...(existingItem?.classroomDepartments?.map(
                      (department) => department.id,
                    ) ?? []),
                    ...selectedClassroomIds,
                  ]),
                );
            const collectable =
              data.collectionStatus !== "NOT_REQUIRED" ||
              (!data.feeId && Boolean(existingItem?.collectable));

            mutate({
              accountType: "CREDIT",
              amount: data.amount,
              classRoomDepartmentIds,
              collectable,
              description: data.description?.trim() || null,
              id: itemId,
              isActive: true,
              name: itemName,
              sessionId: null,
              streamId: data.streamId || existingItem?.streamId || null,
              streamName: resolvedTitle,
              termId: null,
              type: itemType,
            });
          })}
        >
          <div className="flex justify-end">
            <SubmitButton isSubmitting={isPending}>
              {schoolFeeId ? "Update Fee" : "Create Fee"}
            </SubmitButton>
          </div>
        </form>
      </CustomSheetContentPortal>
    </div>
  );
}
