import { createBillableAction } from "@/actions/create-billable-action";
import { useTermBillableParams } from "@/hooks/use-term-billable-params";
import { useAction } from "next-safe-action/hooks";

import { useBillableFormContext } from "../billable/form-context";
import FormInput from "../controls/form-input";
import { CustomSheetContentPortal } from "../custom-sheet-content";
import { FormActionButton } from "../form-action-button";

export function Form({}) {
  const { billableId, setParams } = useTermBillableParams();
  const { watch, control, trigger, handleSubmit, formState } =
    useBillableFormContext();
  const create = useAction(createBillableAction, {
    onSuccess(args) {
      setParams(null);
    },
    onError(e) {
      console.log(e);
    },
  });

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
        <FormActionButton action={create} />
      </CustomSheetContentPortal>
    </div>
  );
}
