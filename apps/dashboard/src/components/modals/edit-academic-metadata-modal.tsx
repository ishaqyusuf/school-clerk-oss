"use client";

import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import { FormDate } from "@school-clerk/ui/controls/form-date";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@school-clerk/ui/dialog";
import { Form } from "@school-clerk/ui/form";
import { FormInput } from "@school-clerk/ui/controls/form-input";
import { SubmitButton } from "@school-clerk/ui/submit-button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { z } from "zod";

const academicMetadataSchema = z
  .object({
    title: z.string().trim().min(1, "Name is required"),
    startDate: z.date().nullable(),
    endDate: z.date().optional().nullable(),
  })
  .refine(
    (value) =>
      !value.startDate ||
      !value.endDate ||
      value.endDate.getTime() >= value.startDate.getTime(),
    {
      message: "End date must be on or after the start date",
      path: ["endDate"],
    },
  );

export type AcademicMetadataTarget = {
  kind: "session" | "term";
  id: string;
  title: string;
  startDate: Date | string | null;
  endDate: Date | string | null;
};

type Props = {
  target: AcademicMetadataTarget | null;
  onOpenChange: (open: boolean) => void;
};

export function EditAcademicMetadataModal({
  target,
  onOpenChange,
}: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const form = useZodForm(academicMetadataSchema, {
    defaultValues: {
      title: "",
      startDate: null,
      endDate: null,
    },
  });

  useEffect(() => {
    if (!target) return;
    form.reset({
      title: target.title,
      startDate: target.startDate ? new Date(target.startDate) : null,
      endDate: target.endDate ? new Date(target.endDate) : null,
    });
  }, [form, target]);

  const finishUpdate = async () => {
    await queryClient.invalidateQueries({
      queryKey: trpc.academics.dashboard.queryKey({}),
    });
    onOpenChange(false);
  };

  const updateTerm = useMutation(
    trpc.academics.saveTermMetaData.mutationOptions({
      onSuccess: finishUpdate,
    }),
  );
  const updateSession = useMutation(
    trpc.academics.updateSessionMetadata.mutationOptions({
      onSuccess: finishUpdate,
    }),
  );

  const isPending = updateTerm.isPending || updateSession.isPending;
  const onSubmit = form.handleSubmit((values) => {
    if (!target) return;
    if (target.kind === "term") {
      updateTerm.mutate({
        termId: target.id,
        title: values.title,
        startDate: values.startDate,
        endDate: values.endDate,
      });
      return;
    }
    updateSession.mutate({
      sessionId: target.id,
      title: values.title,
      startDate: values.startDate,
      endDate: values.endDate,
    });
  });

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[455px]"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            Edit academic {target?.kind === "session" ? "session" : "term"}
          </DialogTitle>
          <DialogDescription>
            Update its name and optional calendar dates.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormInput
              control={form.control}
              name="title"
              label={target?.kind === "session" ? "Session name" : "Term title"}
              placeholder={
                target?.kind === "session" ? "2026/2027" : "Second Term"
              }
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormDate
                control={form.control}
                name="startDate"
                label="Start date"
                clearable
                showToday
              />
              <FormDate
                control={form.control}
                name="endDate"
                label="End date"
                clearable
                showToday
                calendarProps={{
                  disabled: (date) => {
                    const startDate = form.watch("startDate");
                    return !!startDate && date < startDate;
                  },
                }}
              />
            </div>
            <SubmitButton
              type="submit"
              isSubmitting={isPending}
              className="w-full"
            >
              Save changes
            </SubmitButton>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
