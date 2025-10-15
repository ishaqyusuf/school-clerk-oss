import { useTRPC } from "@/trpc/client";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { TableSkeleton } from "../tables/skeleton";
import { Suspense } from "react";
import { useClassroomParams } from "@/hooks/use-classroom-params";
import { useStudentParams } from "@/hooks/use-student-params";

import { useZodForm } from "@/hooks/use-zod-form";

import { Form } from "@school-clerk/ui/form";
import { useDebugToast } from "@/hooks/use-debug-console";
import { SubmitButton } from "../submit-button";
import { useStudentOverviewSheet } from "@/hooks/use-student-overview-sheet";
import { FormDebugBtn } from "../form-debug-btn";
import { useState } from "react";
import { Icons } from "@school-clerk/ui/icons";
import { applyPaymentSchema } from "@api/db/queries/accounting";
import { FormInput } from "@school-clerk/ui/controls/form-input";
import { Button } from "@school-clerk/ui/button";
import { cn } from "@school-clerk/ui/cn";
import { NumericFormat } from "react-number-format";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@school-clerk/ui/collapsible";
import { AnimatedNumber } from "../animated-number";
import { CreateStudentBilling } from "../create-student-billing";
import { Menu } from "../menu";
export function StudentTransactionOverview({}) {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <Content />
    </Suspense>
  );
}
function Content({}) {
  const { setParams, ...params } = useStudentParams();

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const ctx = useClassroomParams();
  const svc = useStudentOverviewSheet();
  const [openForm, setOpenForm] = useState<"bill" | "pay">();
  const { data } = useQuery(
    trpc.transactions.studentAccounting.queryOptions(
      {
        studentId: params.studentViewId,
      },
      {
        enabled: !!params.studentViewId,
      }
    )
  );
  const qc = useQueryClient();
  const { mutate: cancelFeeMutate, isPending } = useMutation(
    trpc.transactions.cancelStudentFee.mutationOptions({
      meta: {
        toastTitle: {
          error: "Something went wrong",
          loading: "Cancelling...",
          success: "Cancelled",
        },
      },
      onSuccess(data, variables, context) {
        qc.invalidateQueries({
          queryKey: trpc.transactions.studentAccounting.queryKey({
            studentId: params.studentViewId,
          }),
        });
      },
      onError(error, variables, context) {},
    })
  );
  const _openForm = (frm) => {
    setOpenForm(frm == openForm ? null : frm);
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 justify-end">
        <Button
          onClick={() => _openForm("bill")}
          variant={openForm === "bill" ? "default" : "secondary"}
          className={cn("")}
          size="xs"
          type="button"
        >
          <span>Bill</span>
          <Icons.Add className="size-4" />
        </Button>
        <Button
          onClick={() => _openForm("pay")}
          variant={openForm === "pay" ? "default" : "secondary"}
          className={cn("")}
          size="xs"
          type="button"
        >
          <span>Pay</span>
          <Icons.Add className="size-4" />
        </Button>
      </div>
      <Collapsible open={openForm == "bill"}>
        <CollapsibleContent>
          <CreateStudentBilling
            termId={params.studentViewTermId}
            studentId={params.studentViewId}
          />
        </CollapsibleContent>
      </Collapsible>
      <Collapsible open={openForm == "pay"}>
        <CollapsibleContent>
          <ApplyPaymentForm studentId="" owingAmount={data?.pendingAmount} />
        </CollapsibleContent>
      </Collapsible>

      <div className="flex justify-center flex-col items-center">
        <span className="text-4xl font-bold">
          <AnimatedNumber value={data?.pendingAmount} currency="NGN" />
        </span>
        <span>Pending</span>
      </div>
      <div className="divide-y">
        {data?.payments.map((p, pi) => (
          <div className="" key={pi}>
            <div>{p.description}</div>
            <div>{p.transactionDate}</div>
            <NumericFormat readOnly value={p.amount} prefix="NGN" />
          </div>
        ))}
      </div>
      <div className="divide-y">
        {data?.fees?.map((f, fi) => (
          <div className="py-2" key={fi}>
            <div className="flex gap-4">
              <div>{f.feeTitle}</div>
              <div>{f.description}</div>
              <div>{f.termDescription}</div>
              <div>{f.status}</div>
            </div>
            <div className="">
              <NumericFormat readOnly value={f.billAmount} prefix="NGN" />
              <NumericFormat
                value={f.pendingAmount}
                prefix="NGN"
                suffix=" Pending"
                readOnly
              />
            </div>
            <Menu>
              <Menu.Item
                onClick={(e) => {
                  cancelFeeMutate({
                    id: f.id,
                    reason: ``,
                  });
                }}
                disabled={f.status === "cancelled"}
              >
                Cancel
              </Menu.Item>
              <Menu.Item disabled={f.status != "active" || !f.pendingAmount}>
                Pay
              </Menu.Item>
            </Menu>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApplyPaymentForm({ studentId, owingAmount }) {
  const { setParams, ...params } = useStudentParams();
  const form = useZodForm(applyPaymentSchema, {
    defaultValues: {
      studentId: params.studentViewId,
      pendingAmount: owingAmount,
      amount: null,
      // studentId,
      // owingAmount,
    },
  });
  const qc = useQueryClient();
  const trpc = useTRPC();
  const { isPending, mutate } = useMutation(
    trpc.transactions.applyPayment.mutationOptions({
      onSuccess() {
        qc.invalidateQueries({
          queryKey: trpc.transactions.studentAccounting.queryKey({
            studentId: params.studentViewId,
          }),
        });
      },
      meta: {
        toastTitle: {
          loading: "Applying...",
          success: "Applied",
          error: "Unable to complete!",
        },
      },
    })
  );
  const onSubmit = (data) => {
    mutate(data);
  };
  return (
    <div>
      <Form {...form}>
        <form
          className="flex items-end gap-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="flex-1">
            <FormInput
              label="Amount"
              control={form.control}
              name="amount"
              className="flex-1"
              numericProps={{
                prefix: "NGN ",
                suffix: ` /NGN ${owingAmount}`,
                placeholder: `NGN 0 /NGN ${owingAmount}`,
              }}
            />
          </div>
          <SubmitButton isSubmitting={isPending}>
            <Icons.Add className="size-4" />
          </SubmitButton>

          <FormDebugBtn />
        </form>
      </Form>
    </div>
  );
}
