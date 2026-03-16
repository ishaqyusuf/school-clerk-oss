"use client";

import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useTermBillableParams } from "@/hooks/use-term-billable-params";

import { Button } from "@school-clerk/ui/button";
import FormInput from "../controls/form-input";
import FormSelect from "../controls/form-select";
import { CustomSheetContentPortal } from "../custom-sheet-content";
import { Icons } from "@school-clerk/ui/custom/icons";
import { Menu } from "../menu";
import { useStaffFormContext } from "../staffs/form-context";
import { SubmitButton } from "../submit-button";

export function Form({}) {
  const { setParams } = useTermBillableParams();
  const { control, getValues, trigger, handleSubmit } = useStaffFormContext();
  const toast = useLoadingToast();
  const trpc = useTRPC();
  const qc = useQueryClient();

  const { mutate, isPending } = useMutation(
    trpc.staff.createStaff.mutationOptions({
      onSuccess() {
        toast.success("Created");
        qc.invalidateQueries({ queryKey: trpc.staff.getStaffList.queryKey() });
        setParams(null);
      },
    })
  );

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
            onSubmit={handleSubmit(
              (data) => mutate(data),
              () => toast.error("Invalid Form")
            )}
          >
            <div className="flex">
              <SubmitButton size="sm" isSubmitting={isPending}>
                Submit
              </SubmitButton>
              <Menu
                Icon={Icons.more}
                Trigger={
                  <Button className="border-l" type="button" size="sm">
                    <span>&</span>
                  </Button>
                }
              >
                <Menu.Item
                  onClick={async () => {
                    const isValid = await trigger();
                    if (isValid) {
                      mutate(getValues());
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
