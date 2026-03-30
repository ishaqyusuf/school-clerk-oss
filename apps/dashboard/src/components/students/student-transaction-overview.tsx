"use client";

import { useTRPC } from "@/trpc/client";
import {
  useMutation,
  useQuery,
  useQueryClient,
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
import { Card, CardContent } from "@school-clerk/ui/card";
import {
  Receipt,
  Wallet,
  AlertTriangle,
  Plus,
  ScrollText,
  Info,
  CheckCircle2,
  Circle,
  AlertCircle,
  ChevronDown,
} from "lucide-react";

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

  const { data: feeStatus, refetch: refetchFeeStatus } = useQuery(
    trpc.transactions.getStudentFeeStatus.queryOptions(
      { studentTermFormId: params.studentTermSheetId! },
      { enabled: !!params.studentTermSheetId }
    )
  );

  const { mutate: initializeFees, isPending: initializingFees } = useMutation(
    trpc.transactions.initializeStudentFees.mutationOptions({
      meta: {
        toastTitle: {
          loading: "Initializing fees...",
          success: "Fees initialized",
          error: "Failed to initialize fees",
        },
      },
      onSuccess() {
        refetchFeeStatus();
        qc.invalidateQueries({
          queryKey: trpc.transactions.studentAccounting.queryKey({
            studentId: params.studentViewId,
          }),
        });
      },
    })
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

  // Calculate totals from fees
  const totalInvoiced = data?.fees?.reduce((sum, f) => sum + (f.billAmount || 0), 0) || 0;
  const totalPaid = totalInvoiced - (data?.pendingAmount || 0);
  const paidPercentage = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold tracking-tight text-foreground">
            Financial Overview
          </h3>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => _openForm("bill")}
            variant={openForm === "bill" ? "default" : "outline"}
            size="sm"
            type="button"
          >
            <Plus className="w-4 h-4 mr-1" />
            Bill
          </Button>
          <Button
            onClick={() => _openForm("pay")}
            variant={openForm === "pay" ? "default" : "outline"}
            size="sm"
            type="button"
          >
            <Plus className="w-4 h-4 mr-1" />
            Pay Fees
          </Button>
          <Button
            onClick={() => _openForm("purchase")}
            variant={openForm === "purchase" ? "default" : "outline"}
            size="sm"
            type="button"
          >
            <Plus className="w-4 h-4 mr-1" />
            Purchase
          </Button>
        </div>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Invoiced */}
        <Card className="bg-card rounded-xl shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <Receipt className="w-4 h-4" />
              </div>
              <p className="text-muted-foreground text-sm font-medium">
                Total Invoiced
              </p>
            </div>
            <p className="text-foreground text-2xl font-bold">
              <AnimatedNumber value={totalInvoiced} currency="NGN" />
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              All fees and charges
            </p>
          </CardContent>
        </Card>

        {/* Total Paid */}
        <Card className="bg-card rounded-xl shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400">
                <Wallet className="w-4 h-4" />
              </div>
              <p className="text-muted-foreground text-sm font-medium">
                Total Paid
              </p>
            </div>
            <p className="text-foreground text-2xl font-bold">
              <AnimatedNumber value={totalPaid} currency="NGN" />
            </p>
            <div className="w-full bg-muted h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-green-500 h-1.5 rounded-full transition-all"
                style={{ width: `${paidPercentage}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        {/* Outstanding */}
        <Card className="bg-card rounded-xl shadow-sm border-red-100 dark:border-red-900/30 relative overflow-hidden">
          <div className="absolute right-0 top-0 h-full w-1 bg-red-500"></div>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <p className="text-muted-foreground text-sm font-medium">
                Outstanding
              </p>
            </div>
            <p className="text-red-600 dark:text-red-400 text-2xl font-bold">
              <AnimatedNumber value={data?.pendingAmount} currency="NGN" />
            </p>
            <p className="text-xs text-red-500 mt-1 font-medium">
              Balance due
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Fee Initialization Status */}
      {params.studentTermSheetId && (feeStatus?.uninitialized?.length ?? 0) > 0 && (
        <Card className="bg-card rounded-xl shadow-sm overflow-hidden border-amber-100 dark:border-amber-900/30">
          <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-amber-50/50 dark:bg-amber-900/10">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Fees Not Initialized ({feeStatus!.uninitialized.length})
              </h3>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1"
              disabled={initializingFees}
              onClick={() =>
                initializeFees({
                  studentTermFormId: params.studentTermSheetId!,
                })
              }
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Initialize All
            </Button>
          </div>
          <div className="divide-y divide-border">
            {feeStatus!.uninitialized.map((fee) => (
              <div
                key={fee.feeHistoryId}
                className="flex items-center gap-3 px-5 py-3"
              >
                <Circle className="h-4 w-4 text-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{fee.title}</p>
                  {fee.classRoomName && (
                    <p className="text-xs text-muted-foreground">
                      {fee.classRoomName}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">
                    <AnimatedNumber value={fee.amount} currency="NGN" />
                  </span>
                  <Button
                    size="xs"
                    variant="outline"
                    className="text-xs"
                    disabled={initializingFees}
                    onClick={() =>
                      initializeFees({
                        studentTermFormId: params.studentTermSheetId!,
                        feeHistoryIds: [fee.feeHistoryId],
                      })
                    }
                  >
                    Initialize
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Fee Structure */}
      {data?.fees && data.fees.length > 0 && (
        <Card className="bg-card rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-muted/30">
            <h3 className="text-foreground text-base font-bold">
              Fee Structure
            </h3>
          </div>
          <div className="p-5 flex flex-col gap-4">
            {data.fees.map((f, fi) => (
              <div key={fi} className="flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground font-medium">
                      {f.feeTitle}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        f.status === "active"
                          ? "border-yellow-300 text-yellow-700 dark:border-yellow-800 dark:text-yellow-400"
                          : "border-muted text-muted-foreground"
                      )}
                    >
                      {f.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-foreground font-bold">
                      <NumericFormat
                        readOnly
                        value={f.billAmount}
                        prefix="NGN "
                        displayType="text"
                      />
                    </span>
                    <Menu>
                      <Menu.Item
                        onClick={() =>
                          cancelFeeMutate({ id: f.id, reason: "" })
                        }
                        disabled={f.status === "cancelled"}
                      >
                        Cancel Fee
                      </Menu.Item>
                    </Menu>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-muted h-2 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        f.pendingAmount === 0
                          ? "bg-green-500"
                          : f.pendingAmount < f.billAmount
                            ? "bg-primary"
                            : "bg-muted-foreground/30"
                      )}
                      style={{
                        width: `${
                          f.billAmount > 0
                            ? Math.round(
                                ((f.billAmount - f.pendingAmount) /
                                  f.billAmount) *
                                  100
                              )
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {f.pendingAmount === 0 ? (
                      <span className="text-green-600 font-medium">Paid</span>
                    ) : (
                      <NumericFormat
                        readOnly
                        value={f.pendingAmount}
                        prefix="NGN "
                        suffix=" pending"
                        displayType="text"
                      />
                    )}
                  </span>
                </div>
                {f.description && (
                  <p className="text-xs text-muted-foreground">
                    {f.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Payment history */}
      {payments && payments.length > 0 && (
        <Card className="bg-card rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex justify-between items-center">
            <h3 className="text-foreground text-base font-bold">
              Payment History
            </h3>
          </div>
          <PaymentHistoryList
            payments={payments}
            studentId={params.studentViewId}
          />
        </Card>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-lg p-4 flex gap-3">
        <Info className="text-blue-600 dark:text-blue-400 shrink-0 h-5 w-5 mt-0.5" />
        <div>
          <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">
            Payment Information
          </h4>
          <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
            All payment records are scoped to the current term. Use the term
            selector in the header to view payment history for other terms.
          </p>
        </div>
      </div>
    </div>
  );
}

function PaymentHistoryList({
  payments,
  studentId,
}: {
  payments: any[];
  studentId: string;
}) {
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
    <div className="divide-y divide-border">
      {payments.map((p) => {
        const date = p.walletTransaction?.transactionDate || p.createdAt;
        const canReverse =
          p.status === "success" &&
          p.walletTransaction?.status === "success" &&
          p.walletTransaction?.id;

        return (
          <div
            key={p.id}
            className="py-3 px-5 flex items-center gap-3 hover:bg-muted/20 transition-colors"
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {p.studentFee?.feeTitle || p.paymentType || "Payment"}
              </p>
              {p.description && (
                <p className="text-xs text-muted-foreground">
                  {p.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {date ? format(new Date(date), "dd MMM yyyy") : ""}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-mono font-medium text-foreground">
                <AnimatedNumber value={p.amount} currency="NGN" />
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs mt-0.5",
                  p.status === "success"
                    ? "border-green-300 text-green-600 dark:border-green-800 dark:text-green-400"
                    : "border-red-300 text-red-500 dark:border-red-800 dark:text-red-400"
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
    <div className="border border-border rounded-lg p-4 bg-muted/20">
      <Form {...form}>
        <form
          className="flex flex-col gap-3"
          onSubmit={form.handleSubmit(onSubmit)}
        >
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

  const PRESETS = [
    "Uniform",
    "Textbooks",
    "Exercise Books",
    "Stationery",
    "PE Kit",
    "School Bag",
  ];

  if (!studentTermFormId) {
    return (
      <div className="border border-border rounded-lg p-4 text-sm text-muted-foreground">
        Student must be enrolled in a term to record purchases.
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg p-4 bg-muted/20">
      <div className="flex flex-wrap gap-2 mb-3">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setTitle(p)}
            className={cn(
              "text-xs px-2 py-1 rounded border border-border hover:bg-accent transition-colors",
              title === p && "bg-accent"
            )}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label className="text-sm">Item</Label>
          <input
            className="flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm"
            placeholder="e.g. School Uniform"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-sm">Amount (NGN)</Label>
          <input
            type="number"
            className="flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm"
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
            className="flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm"
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
