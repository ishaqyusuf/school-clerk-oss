import { useFormContext } from "react-hook-form";

import { Button } from "@school-clerk/ui/button";

export function FormDebugBtn({}) {
  const { trigger, formState } = useFormContext();

  return (
    <div className="px-4">
      <Button
        type="button"
        onClick={() => {
          trigger().then((e) => {
            console.log(formState);
            console.log(formState.errors);
          });
        }}
      >
        Debug Submit
      </Button>
    </div>
  );
}
