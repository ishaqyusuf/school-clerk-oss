"use client";

import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTermBillableParams } from "@/hooks/use-term-billable-params";

import { useBillableFormContext } from "../billable/form-context";
import FormInput from "../controls/form-input";
import { CustomSheetContentPortal } from "../custom-sheet-content";
import { SubmitButton } from "../submit-button";

export function Form({}) {
  const { setParams } = useTermBillableParams();
  const { control, handleSubmit } = useBillableFormContext();
  const trpc = useTRPC();
  const qc = useQueryClient();

  const { mutate, isPending } = useMutation(
    trpc.finance.createBillable.mutationOptions({
      onSuccess() {
        qc.invalidateQueries({ queryKey: trpc.finance.getBillables.queryKey() });
        setParams(null);
      },
    })
  );

  return (
    <div className="grid gap-4">
      <FormInput name="title" label="Billable Title" control={control} />
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
