import { useZodForm } from "@/hooks/use-zod-form";
import { FormInput } from "@school-clerk/ui/controls/form-input";
import { Form } from "@school-clerk/ui/form";
import { Label } from "@school-clerk/ui/label";
import { SubmitButton } from "./submit-button";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@school-clerk/ui/button";
import { Icons } from "@school-clerk/ui/custom/icons";
import { createSchoolFeeSchema } from "@api/db/queries/accounting";
import { FormDebugBtn } from "./form-debug-btn";

interface Props {
  onCreate?;
  onClose?;
  termId;
}
export function CreateSchoolBill(props: Props) {
  const form = useZodForm(createSchoolFeeSchema, {
    defaultValues: {
      termId: props.termId,
      amount: null,
      description: "",
      feeId: null,
      title: "",
    },
  });
  const trpc = useTRPC();
  const qc = useQueryClient();
  const { isPending, mutate } = useMutation(
    trpc.transactions.createSchoolFee.mutationOptions({
      meta: {
        toastTitle: {
          error: "Something went wrong",
          loading: "Saving...",
          success: "Success",
        },
      },
      onSuccess(data, variables, context) {
        qc?.invalidateQueries({
          queryKey: trpc.transactions.getTermFees.queryKey(),
        });
        props?.onCreate();
      },
    })
  );
  const onSubmit = (data) => {
    mutate({
      ...data,
      streamName: data.title?.trim() || undefined,
    });
  };
  return (
    <Form {...form}>
      <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex gap-4 items-center">
          <Label>Create School Billing</Label>
          <div className="flex-1"></div>
          {!props.onClose || (
            <Button
              onClick={props.onClose}
              className="size-5 p-0"
              variant="link"
              size="icon"
              type="button"
            >
              <Icons.X className="size-x" />
            </Button>
          )}
        </div>
        <div className="text-sm">
          Tips: The title becomes the account stream automatically. Example:
          title <strong>Books</strong> creates or uses the <strong>Books</strong>{" "}
          stream, while description can hold details like Mathematics JSS 2 or
          Size 4.
        </div>
        <FormInput label="Title" control={form.control} name="title" />
        <FormInput
          label="Description"
          control={form.control}
          name="description"
        />
        <FormInput
          label="Amount"
          control={form.control}
          name="amount"
          numericProps={{
            prefix: "NGN ",
            placeholder: "NGN 0",
          }}
        />
        <SubmitButton isSubmitting={isPending}>Save</SubmitButton>
        <FormDebugBtn />
      </form>
    </Form>
  );
}
