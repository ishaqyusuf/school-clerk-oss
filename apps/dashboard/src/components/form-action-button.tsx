import { useFormContext } from "react-hook-form";

import { FormDebugBtn } from "./form-debug-btn";
import { SubmitButton } from "./submit-button";

interface Props {
  action;
  label?;
  noDebug?: boolean;
  More?;
}
export function FormActionButton({
  action,
  noDebug,
  More,
  label = "Submit",
}: Props) {
  const { handleSubmit } = useFormContext();
  return (
    <form className="grid gap-4" onSubmit={handleSubmit(action.execute)}>
      <div className="flex justify-end">
        {!noDebug || <FormDebugBtn />}
        <div className="flex">
          <SubmitButton isSubmitting={action?.isExecuting}>Submit</SubmitButton>
        </div>
      </div>
    </form>
  );
}
