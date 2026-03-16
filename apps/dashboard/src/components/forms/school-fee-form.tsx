"use client";

import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSchoolFeeParams } from "@/hooks/use-school-fee-params";

import FormInput from "../controls/form-input";
import { CustomSheetContentPortal } from "../custom-sheet-content";
import { SubmitButton } from "../submit-button";
import { useSchoolFeeFormContext } from "../school-fee/form-context";

export function Form({}) {
  const { setParams } = useSchoolFeeParams();
  const { control, handleSubmit } = useSchoolFeeFormContext();
  const trpc = useTRPC();
  const qc = useQueryClient();

  const { mutate, isPending } = useMutation(
    trpc.transactions.createSchoolFee.mutationOptions({
      onSuccess() {
        qc.invalidateQueries({
          queryKey: trpc.transactions.getSchoolFees.queryKey(),
        });
        setParams(null);
      },
    })
  );

  return (
    <div className="grid gap-4">
      <FormInput name="title" label="Fee Title" control={control} />
      <FormInput
        name="description"
        label="Description"
        type="textarea"
        control={control}
      />
      <FormInput name="amount" type="number" label="Amount" control={control} />
      <CustomSheetContentPortal>
        <form
          className="grid gap-4"
          onSubmit={handleSubmit((data) => mutate(data))}
        >
          <div className="flex justify-end">
            <SubmitButton isSubmitting={isPending}>Submit</SubmitButton>
          </div>
        </form>
      </CustomSheetContentPortal>
    </div>
  );
}
