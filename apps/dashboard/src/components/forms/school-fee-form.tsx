import { createSchoolFeeAction } from "@/actions/create-school-fee";
import { useSchoolFeeParams } from "@/hooks/use-school-fee-params";
import { useAction } from "next-safe-action/hooks";

import FormInput from "../controls/form-input";
import { CustomSheetContentPortal } from "../custom-sheet-content";
import { FormActionButton } from "../form-action-button";
import { FormDebugBtn } from "../form-debug-btn";
import { useSchoolFeeFormContext } from "../school-fee/form-context";

export function Form({}) {
  const { setParams } = useSchoolFeeParams();
  const { watch, control, trigger, handleSubmit, formState } =
    useSchoolFeeFormContext();
  const create = useAction(createSchoolFeeAction, {
    onSuccess(args) {
      setParams(null);
    },
    onError(e) {
      console.log(e);
    },
  });

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
        <FormActionButton action={create} />
      </CustomSheetContentPortal>
    </div>
  );
}
