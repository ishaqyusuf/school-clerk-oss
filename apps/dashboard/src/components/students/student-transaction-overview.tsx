"use client";

import { useTRPC } from "@/trpc/client";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { TableSkeleton } from "../tables/skeleton";
import { Suspense, useState } from "react";
import { useStudentParams } from "@/hooks/use-student-params";

import { useZodForm } from "@/hooks/use-zod-form";
import { Form } from "@school-clerk/ui/form";
import { SubmitButton } from "../submit-button";
import { useStudentOverviewSheet } from "@/hooks/use-student-overview-sheet";
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
import { Badge } from "@school-clerk/ui/badge";
import { Icons } from "@school-clerk/ui/icons";
import { FormInput } from "@school-clerk/ui/controls/form-input";
import { applyPaymentSchema } from "@api/db/queries/accounting";
import { Label } from "@school-clerk/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@school-clerk/ui/select";
import { format } from "date-fns";
import { z } from "zod";

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
  const svc = useStudentOverviewSheet();
  const [openForm, setOpenForm] = useState<"bill" | "pay" | "purchase">();
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const { data } = useQuery(
    trpc.transactions.studentAccounting.queryOptions(
      { studentId: params.studentViewId },
      { enabled: !!params.studentViewId }
    )
  );

  const { data: payments } = useQuery(
    trpc.finance.getStudentPayments.queryOptions(
      { studentId: params.studentViewId },
      { enabled: !!params.studentViewId }
    )
  );

  const qc = useQueryClient();
  const { mutate: cancelFeeMutate, isPending: cancelFeePending } = useMutation(
    trpc.transactions.cancelStudentFee.mutationOptions({
      meta: {
        toastTitle: {
          error: "Something went wrong",
          loading: "Cancelling...",
          success: "Cancelled",
        },
      },
      onSuccess() {
        qc.invalidateQueries({
          queryKey: trpc.transactions.studentAccounting.queryKey({
            studentId: params.studentViewId,
          }),
        });
      },
    })
  );

  const _openForm = (frm: typeof openForm) => {
    setOpenForm(frm === openForm ? undefined : frm);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Action buttons */}
      <div className="flex gap-2 justify-end flex-wrap">
        <Button
          onClick={() => _openForm("bill")}
          variant={openForm === "bill" ? "default" : "secondary"}
          size="xs"
          type="button"
        >
          <span>Bill</span>
          <Icons.Add className="size-4 ml-1" />
        </Button>
        <Button
          onClick={() => _openForm("pay")}
          variant={openForm === "pay" ? "default" : "secondary"}
          size="xs"
          type="button"
        >
          <span>Pay Fees</span>
          <Icons.Add className="size-4 ml-1" />
        </Button>
        <Button
          onClick={() => _openForm("purchase")}
          variant={openForm === "purchase" ? "default" : "secondary"}
          size="xs"
          type="button"
        >
          <span>Purchase</span>
          <Icons.Add className="size-4 ml-1" />
        </Button>
      </div>

      {/* Bill form */}
      <Collapsible open={openForm === "bill"}>
        <CollapsibleContent>
          <CreateStudentBilling
            termId={params.studentViewTermId}
            studentId={params.studentViewId}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Pay fees form */}
      <Collapsible open={openForm === "pay"}>
        <CollapsibleContent>
          <ApplyPaymentForm
            studentId={params.studentViewId}
            owingAmount={data?.pendingAmount}
            onSuccess={() => {
              qc.invalidateQueries({
                queryKey: trpc.transactions.studentAccounting.queryKey({
                  studentId: params.studentViewId,
                }),
              });
              qc.invalidateQueries({
                queryKey: trpc.finance.getStudentPayments.queryKey({
                  studentId: params.studentViewId,
                }),
              });
            }}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Purchase form */}
      <Collapsible open={openForm === "purchase"}>
        <CollapsibleContent>
          <StudentPurchaseForm
            studentId={params.studentViewId}
            studentTermFormId={params.studentTermSheetId}
            onSuccess={() => {
              setOpenForm(undefined);
              qc.invalidateQueries({
                queryKey: trpc.finance.getStudentPayments.queryKey({
                  studentId: params.studentViewId,
                }),
              });
            }}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Balance summary */}
      <div className="flex justify-center flex-col items-center py-4 border rounded-lg bg-muted/30">
        <span className="text-4xl font-bold">
          <AnimatedNumber value={data?.pendingAmount} currency="NGN" />
        </span>
        <span className="text-sm text-muted-foreground">Outstanding Balance</span>
      </div>

      {/* Active fees */}
      <div className="divide-y">
        {data?.fees?.map((f, fi) => (
          <div className="py-2" key={fi}>
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <div className="text-sm font-medium">{f.feeTitle}</div>
                {f.description && (
                  <div className="text-xs text-muted-foreground">{f.description}</div>
                )}
                <div className="text-xs text-muted-foreground">{f.termDescription}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">
                  <NumericFormat readOnly value={f.billAmount} prefix="NGN " displayType="text" />
                </div>
                <div className="text-sm font-mono">
                  <NumericFormat
                    value={f.pendingAmount}
                    prefix="NGN "
                    suffix=" pending"
                    displayType="text"
                  />
                </div>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  f.status === "active"
                    ? "border-yellow-300 text-yellow-700"
                    : "border-gray-300 text-gray-500"
                )}
              >
                {f.status}
              </Badge>
              <Menu>
                <Menu.Item
                  onClick={() => cancelFeeMutate({ id: f.id, reason: "" })}
                  disabled={f.status === "cancelled"}
                >
                  Cancel Fee
                </Menu.Item>
              </Menu>
            </div>
          </div>
        ))}
      </div>

      {/* Payment history */}
      {payments && payments.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
            Payment History
          </p>
          <PaymentHistoryList
            payments={payments}
            studentId={params.studentViewId}
          />
        </div>
      )}
    </div>
  );
}

function PaymentHistoryList({ payments, studentId }: { payments: any[]; studentId: string }) {
  const trpc = useTRPC();
  const qc = useQueryClient();

  const { mutate: reverse, isPending } = useMutation(
    trpc.finance.reverseStudentPayment.mutationOptions({
      meta: {
        toastTitle: {
          loading: "Reversing payment...",
          success: "Payment reversed",
          error: "Failed to reverse",
        },
      },
      onSuccess() {
        qc.invalidateQueries({
          queryKey: trpc.finance.getStudentPayments.queryKey({ studentId }),
        });
        qc.invalidateQueries({
          queryKey: trpc.transactions.studentAccounting.queryKey({ studentId }),
        });
      },
    })
  );

  return (
    <div className="divide-y border rounded-md">
      {payments.map((p) => {
        const date = p.walletTransaction?.transactionDate || p.createdAt;
        const canReverse =
          p.status === "success" &&
          p.walletTransaction?.status === "success" &&
          p.walletTransaction?.id;

        return (
          <div key={p.id} className="py-2 px-3 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium">
                {p.studentFee?.feeTitle || p.paymentType || "Payment"}
              </p>
              {p.description && (
                <p className="text-xs text-muted-foreground">{p.description}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {date ? format(new Date(date), "dd MMM yyyy") : ""}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-mono">
                <AnimatedNumber value={p.amount} currency="NGN" />
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs mt-0.5",
                  p.status === "success"
                    ? "border-green-300 text-green-600"
                    : "border-red-300 text-red-500"
                )}
              >
                {p.status}
              </Badge>
            </div>
            {canReverse && (
              <Button
                variant="ghost"
                size="xs"
                type="button"
                disabled={isPending}
                onClick={() =>
                  reverse({
                    studentPaymentId: p.id,
                    transactionId: p.walletTransaction.id,
                  })
                }
              >
                Reverse
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ApplyPaymentForm({
  studentId,
  owingAmount,
  onSuccess,
}: {
  studentId: string;
  owingAmount?: number;
  onSuccess?: () => void;
}) {
  const { setParams, ...params } = useStudentParams();
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const form = useZodForm(applyPaymentSchema, {
    defaultValues: {
      studentId: params.studentViewId,
      pendingAmount: owingAmount,
      amount: null,
    },
  });
  const qc = useQueryClient();
  const trpc = useTRPC();
  const { isPending, mutate } = useMutation(
    trpc.transactions.applyPayment.mutationOptions({
      onSuccess() {
        onSuccess?.();
        form.reset();
      },
      meta: {
        toastTitle: {
          loading: "Applying...",
          success: "Payment applied",
          error: "Unable to complete!",
        },
      },
    })
  );
  const onSubmit = (data: any) => {
    mutate({ ...data, description: paymentMethod });
  };
  return (
    <div className="border rounded-lg p-4 bg-muted/20">
      <Form {...form}>
        <form className="flex flex-col gap-3" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Amount (NGN)"
              control={form.control}
              name="amount"
              numericProps={{
                prefix: "NGN ",
                suffix: ` /NGN ${owingAmount ?? 0}`,
                placeholder: `0`,
              }}
            />
            <div className="grid gap-1.5">
              <Label className="text-sm">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Card">Card (POS)</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Online">Online Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <SubmitButton isSubmitting={isPending}>Apply Payment</SubmitButton>
          </div>
        </form>
      </Form>
    </div>
  );
}

const purchaseSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  amount: z.number().positive(),
  paid: z.boolean().default(true),
  paymentMethod: z.string().optional().nullable(),
});

function StudentPurchaseForm({
  studentId,
  studentTermFormId,
  onSuccess,
}: {
  studentId: string;
  studentTermFormId?: string | null;
  onSuccess?: () => void;
}) {
  const trpc = useTRPC();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [description, setDescription] = useState("");

  const { mutate, isPending } = useMutation(
    trpc.finance.createStudentPurchase.mutationOptions({
      meta: {
        toastTitle: {
          loading: "Recording purchase...",
          success: "Purchase recorded",
          error: "Failed to record purchase",
        },
      },
      onSuccess,
    })
  );

  const PRESETS = ["Uniform", "Textbooks", "Exercise Books", "Stationery", "PE Kit", "School Bag"];

  if (!studentTermFormId) {
    return (
      <div className="border rounded-lg p-4 text-sm text-muted-foreground">
        Student must be enrolled in a term to record purchases.
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 bg-muted/20">
      <div className="flex flex-wrap gap-2 mb-3">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setTitle(p)}
            className={`text-xs px-2 py-1 rounded border hover:bg-accent ${title === p ? "bg-accent" : ""}`}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label className="text-sm">Item</Label>
          <input
            className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm"
            placeholder="e.g. School Uniform"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-sm">Amount (NGN)</Label>
          <input
            type="number"
            className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-sm">Payment Method</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
              <SelectItem value="Card">Card (POS)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label className="text-sm">Notes (optional)</Label>
          <input
            className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm"
            placeholder="Additional notes"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>
      <div className="mt-3">
        <SubmitButton
          isSubmitting={isPending}
          disabled={!title || !amount}
          type="button"
          onClick={() =>
            mutate({
              studentId,
              studentTermFormId,
              title,
              description: description || undefined,
              amount: parseFloat(amount),
              paid: true,
              paymentMethod: method,
            })
          }
        >
          Record Purchase
        </SubmitButton>
      </div>
    </div>
  );
}
