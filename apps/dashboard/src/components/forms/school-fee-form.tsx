"use client";

import FormMultipleSelector from "@/components/controls/form-multiple-selector";
import { useAuth } from "@/hooks/use-auth";
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
import { toast } from "@school-clerk/ui/use-toast";

import FormInput from "../controls/form-input";
import { CustomSheetContentPortal } from "../custom-sheet-content";
import { useSchoolFeeFormContext } from "../school-fee/form-context";
import { SubmitButton } from "../submit-button";

type FeeItemType = "TUITION_FEE" | "BOOK" | "OTHER";

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
  const auth = useAuth();
  const qc = useQueryClient();

  const { data: streams = [] } = useQuery(
    trpc.finance.getStreams.queryOptions({ filter: "term" }),
  );
  const { data: classrooms } = useQuery(
    trpc.classrooms.getCurrentSessionClassroom.queryOptions(),
  );
  const [
    streamId,
    streamName,
    title,
    collectionStatus,
    classroomDepartmentIds,
  ] = watch([
    "streamId",
    "streamName",
    "title",
    "collectionStatus",
    "classroomDepartmentIds",
  ]);

  const [feeTarget, setFeeTarget] = useState<"general" | "specific">(
    classroomDepartmentIds?.length ? "specific" : "general",
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
      onSuccess(result) {
        qc.invalidateQueries({
          queryKey: trpc.finance.getItems.queryKey(),
        });
        qc.invalidateQueries({
          queryKey: trpc.finance.getStreams.queryKey({ filter: "term" }),
        });
        qc.invalidateQueries({
          queryKey: trpc.finance.overview.queryKey(),
        });
        if (result.reconciliation.status === "PARTIAL") {
          toast({
            title: "Fee saved; some students need a retry",
            description: `${result.reconciliation.failedTermFormIds.length} student fee assignments could not be refreshed. Save the fee again to retry them.`,
            variant: "destructive",
          });
        }
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
        <Label>Student Audience</Label>
        <Select
          value={watch("studentAudience")}
          onValueChange={(value) =>
            setValue(
              "studentAudience",
              value as
                | "ALL_STUDENTS"
                | "NEW_ADMISSIONS_ONLY"
                | "RETURNING_STUDENTS_ONLY",
            )
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL_STUDENTS">All students</SelectItem>
            <SelectItem value="NEW_ADMISSIONS_ONLY">
              New admissions only
            </SelectItem>
            <SelectItem value="RETURNING_STUDENTS_ONLY">
              Returning students only
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Audience is separate from whether this fee is required or optional.
        </p>
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
            <Label
              htmlFor="target-general"
              className="font-normal cursor-pointer"
            >
              General (All Classes)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="specific" id="target-specific" />
            <Label
              htmlFor="target-specific"
              className="font-normal cursor-pointer"
            >
              Specific Classrooms
            </Label>
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
            const selectedClassroomIds =
              feeTarget === "specific"
                ? (data.classroomDepartmentIds ?? [])
                : [];
            const itemId = data.feeId || null;
            const classRoomDepartmentIds = selectedClassroomIds;
            const collectable = data.collectionStatus !== "NOT_REQUIRED";

            mutate({
              accountType: "CREDIT",
              amount: data.amount,
              classRoomDepartmentIds,
              collectable,
              studentAudience: data.studentAudience,
              description: data.description?.trim() || null,
              id: itemId,
              isActive: true,
              name: itemName,
              sessionId: data.feeId
                ? data.sessionId
                : data.sessionId ?? auth?.profile?.sessionId ?? null,
              streamId: data.streamId || null,
              streamName: resolvedTitle,
              termId: data.feeId
                ? data.termId
                : data.termId ?? auth?.profile?.termId ?? null,
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
