import { useEffect } from "react";
import { getCachedBillables } from "@/actions/cache/billables";
import { getCachedStaffs } from "@/actions/cache/staffs";
import { createBillAction } from "@/actions/create-bill-action";
import { createStaffAction } from "@/actions/create-staff";
import { useBillParams } from "@/hooks/use-bill-params";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useTermBillableParams } from "@/hooks/use-term-billable-params";
import { timeout } from "@/utils/timeout";
import { randomInt } from "@/utils/utils";
import { useAction } from "next-safe-action/hooks";
import { useAsyncMemo } from "use-async-memo";

import { Button } from "@school-clerk/ui/button";

import { AnimatedNumber } from "../animated-number";
import { useBillFormContext } from "../bill/form-context";
import FormInput from "../controls/form-input";
import FormSelect from "../controls/form-select";
import { CustomSheetContentPortal } from "../custom-sheet-content";
import { Icons } from "../icons";
import { Menu } from "../menu";
import { useStaffFormContext } from "../staffs/form-context";
import { SubmitButton } from "../submit-button";

export function Form({}) {
  const { setParams } = useBillParams();
  const {
    watch,
    control,
    getValues,
    reset,
    setValue,
    trigger,
    handleSubmit,
    formState,
    resetField,
  } = useBillFormContext();
  const toast = useLoadingToast();
  const onError = (e) => {
    console.log(e);
  };
  const onSuccess = (args?) => {
    toast.success("Created");
  };
  const create = useAction(createBillAction, {
    onSuccess(args) {
      onSuccess(args);
      setParams(null);
    },
    onError,
  });
  const createAndNew = useAction(createBillAction, {
    onSuccess(args) {
      onSuccess(args);
      // reset()
    },
    onError,
  });

  const data = useAsyncMemo(async () => {
    await timeout(randomInt(250));
    return await Promise.all([getCachedBillables(), getCachedStaffs()]);
  }, []);
  const [billables, staffs] = data || [];
  const [selectedBillableId, billableId] = watch([
    "selectedBillableId",
    "billableId",
  ]);
  useEffect(() => {
    const billable =
      selectedBillableId == "custom"
        ? ({} as any)
        : billables?.find((b) => b.id == selectedBillableId);
    console.log({ billable, selectedBillableId });
    // reset({
    //   billableId: billable?.id || "",
    //   billableHistoryId: billable?.historyId || "",
    //   description: billable?.description || "",
    //   title: billable?.title || "",
    //   amount: billable?.amount || "",
    // });
    // return;
    setValue("title", billable?.title || "");
    setValue("billableId", billable?.id || "");
    setValue("billableHistoryId", billable?.historyId || "");
    setValue("description", billable?.description || "");
    setValue("amount", billable?.amount || "");
  }, [selectedBillableId, billables]);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <FormSelect
          className=""
          name="selectedBillableId"
          label="Billable"
          titleKey="description"
          valueKey="id"
          options={[
            {
              title: "Custom",
              description: "",
              amount: null,
              id: "custom",
            },
            ...(billables || []),
          ]}
          control={control}
          Item={({ option }) => (
            <>
              <div className="flex w-full">
                <div className="flex gap-1">
                  <span>{option?.title}</span>
                  <span>{option?.description}</span>
                  <span>
                    {!option?.amount || (
                      <AnimatedNumber value={option?.amount} />
                    )}
                  </span>
                </div>
              </div>
            </>
          )}
        />
        <FormSelect
          name="staffTermProfileId"
          label="Bill For"
          control={control}
          options={staffs}
          titleKey="name"
          valueKey="staffTermId"
        />
        <FormInput
          name="title"
          // disabled={!!billableId}
          label="Title"
          control={control}
        />
        <FormInput
          name="amount"
          // disabled={!!billableId}
          type="number"
          label="Amount"
          control={control}
        />
      </div>
      <FormInput
        name="description"
        // disabled={!!billableId}
        label="Description"
        control={control}
      />

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
