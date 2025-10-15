import { getCachedClassRooms } from "@/actions/cache/classrooms";
import { getCachedFees } from "@/actions/cache/fees";
import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { createStaffAction } from "@/actions/create-staff";
import { createStudentAction } from "@/actions/create-student";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useTermBillableParams } from "@/hooks/use-term-billable-params";
import { timeout } from "@/utils/timeout";
import { randomInt } from "@/utils/utils";
import { useAction } from "next-safe-action/hooks";
import { useFieldArray } from "react-hook-form";
import { useAsyncMemo } from "use-async-memo";

import { Button } from "@school-clerk/ui/button";
import { cn } from "@school-clerk/ui/cn";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@school-clerk/ui/table";

import { CollapseForm } from "../collapse-form";
import { FormDate } from "../controls/form-date";
import FormInput from "../controls/form-input";
import FormSelect from "../controls/form-select";
import { NumberInput } from "../currency-input";
import { CustomSheetContentPortal } from "../custom-sheet-content";
import { Icons } from "../icons";
import { Menu } from "../menu";
import { useStaffFormContext } from "../staffs/form-context";
import { useStudentFormContext } from "../students/form-context";
import { SubmitButton } from "../submit-button";

export function Form({}) {
  const { setParams } = useTermBillableParams();
  const { watch, control, getValues, reset, trigger, handleSubmit, formState } =
    useStaffFormContext();
  const toast = useLoadingToast();
  const onError = (e) => {
    console.log(e);
  };
  const onSuccess = (args?) => {
    toast.success("Created");
  };
  const create = useAction(createStaffAction, {
    onSuccess(args) {
      onSuccess(args);
      setParams(null);
    },
    onError,
  });
  const createAndNew = useAction(createStaffAction, {
    onSuccess(args) {
      onSuccess(args);
      // reset()
    },
    onError,
  });

  // const classList = useAsyncMemo(async () => {
  //   await timeout(randomInt(250));
  //   const profile = await getAuthCookie();
  //   const classList = await getCachedClassRooms(
  //     profile.termId,
  //     profile.sessionId,
  //   );
  //   return classList;
  // }, []);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4">
        <FormSelect
          className="w-16"
          name="title"
          label="Title"
          options={["Mr", "Mrs", "Ustaadh", "Ustaadha"]}
          control={control}
        />
        <FormInput
          className="flex-1"
          name="name"
          label="Name"
          control={control}
        />
      </div>
      <FormInput name="email" label="Email" control={control} />
      <FormInput name="phone" label="Phone" control={control} />
      <FormInput name="phone2" label="Phone 2" control={control} />

      <CustomSheetContentPortal>
        <div className="flex justify-end">
          <form
            onSubmit={handleSubmit(create.execute, (arg) => {
              toast.error("Invalid Form");
            })}
          >
            <div className="flex">
              <SubmitButton size="sm" isSubmitting={create?.isExecuting}>
                Submit
              </SubmitButton>
              <Menu
                Icon={Icons.more}
                Trigger={
                  <Button className="border-l" type="button" size="sm">
                    {/* <Icons.more className="size-4" /> */}
                    <span>&</span>
                  </Button>
                }
              >
                <Menu.Item
                  onClick={async (e) => {
                    // e.preventDefault();
                    const isValid = await trigger(); // run validation manually
                    if (isValid) {
                      const values = getValues();
                      createAndNew.execute(values); // only execute if form is valid
                    } else {
                      toast.error("Invalid Form");
                    }
                  }}
                >
                  New
                </Menu.Item>
              </Menu>
            </div>
          </form>
        </div>
      </CustomSheetContentPortal>
    </div>
  );
}
