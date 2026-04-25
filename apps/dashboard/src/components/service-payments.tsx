"use client";

import { useMemo } from "react";
import { useState, Suspense } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { TableSkeleton } from "./tables/skeleton";
import { Button } from "@school-clerk/ui/button";
import { Badge } from "@school-clerk/ui/badge";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import { ComboboxDropdown } from "@school-clerk/ui/combobox-dropdown";
import { Card, CardContent, CardHeader, CardTitle } from "@school-clerk/ui/card";
import { SubmitButton } from "./submit-button";
import { AnimatedNumber } from "./animated-number";
import { format } from "date-fns";
import {
  Download,
  PlusCircle,
  TrendingUp,
  AlertTriangle,
  Clock,
  Wallet,
  Search,
  X,
  CheckCircle2,
} from "lucide-react";

export function ServicePayments() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <Content />
    </Suspense>
  );
}

function Content() {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [repayingId, setRepayingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: bills } = useSuspenseQuery(
    trpc.finance.getServicePayments.queryOptions({})
  );

  const invalidate = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: trpc.finance.getServicePayments.queryKey({}) }),
      qc.invalidateQueries({ queryKey: trpc.finance.getStreams.queryKey({ filter: "term" }) }),
    ]);

  const paid = bills.filter(
    (b) => b.billPaymentId && b.billPayment?.transaction?.status === "success"
  );
  const cancelled = bills.filter(
    (b) => b.billPaymentId && b.billPayment?.transaction?.status === "cancelled"
  );
  const pending = bills.filter(
    (b) => !b.billPaymentId || b.billPayment?.transaction?.status === "cancelled"
  );
  const owing = bills.filter(
    (b) =>
      b.billPaymentId &&
      b.billPayment?.transaction?.status === "success" &&
      ((b.billPayment?.settlement?.owingAmount || 0) ||
        (b.billPayment?.invoice?.amount || 0)) > 0
  );

  const filtered = bills.filter((b) => {
    if (!search) return true;
    return b.title?.toLowerCase().includes(search.toLowerCase());
  });

  const totalPaid = paid.reduce((s, b) => s + (b.amount || 0), 0);
  const totalPending = pending.reduce((s, b) => s + (b.amount || 0), 0);
  const totalOwing = owing.reduce(
    (sum, bill) =>
      sum +
      (bill.billPayment?.settlement?.owingAmount ||
        bill.billPayment?.invoice?.amount ||
        0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Service Payments</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage utilities, repairs, and other operational expenses for the current term.
          </p>
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="gap-2" size="sm">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
          <Button type="button" className="gap-2 shadow-sm" size="sm" onClick={() => setShowCreate(!showCreate)}>
            <PlusCircle className="h-4 w-4" />
            Record Expense
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-6 flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-muted-foreground">Total Paid (This Term)</p>
            <CheckCircle2 className="text-green-600 h-5 w-5" />
          </div>
          <p className="text-2xl font-bold">
            <AnimatedNumber value={totalPaid} currency="NGN" />
          </p>
          <p className="text-green-600 text-xs font-semibold flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" /> {paid.length} payments processed
          </p>
        </Card>

        <Card className="p-6 flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-muted-foreground">Unpaid Expenses</p>
            <AlertTriangle className="text-amber-500 h-5 w-5" />
          </div>
          <p className="text-2xl font-bold">
            <AnimatedNumber value={totalPending} currency="NGN" />
          </p>
          <p className="text-amber-600 text-xs font-semibold flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" /> {pending.length} pending
          </p>
        </Card>

        <Card className="p-6 flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-muted-foreground">Service Payments</p>
            <Clock className="text-muted-foreground h-5 w-5" />
          </div>
          <p className="text-2xl font-bold">{bills.length} Total</p>
          <p className="text-muted-foreground text-xs font-semibold">
            {cancelled.length} cancelled
          </p>
        </Card>

        <Card className="p-6 flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-muted-foreground">Outstanding Owing</p>
            <Wallet className="text-amber-600 h-5 w-5" />
          </div>
          <p className="text-2xl font-bold">
            <AnimatedNumber value={totalOwing} currency="NGN" />
          </p>
          <p className="text-amber-600 text-xs font-semibold">{owing.length} expenses owing</p>
        </Card>
      </div>

      {/* Create Form */}
      {showCreate && (
        <CreateServicePaymentForm onSuccess={() => { setShowCreate(false); invalidate(); }} />
      )}

      {/* Table */}
      {bills.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center">
          <AlertTriangle className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="font-medium text-muted-foreground">No service payments recorded</p>
          <p className="text-sm text-muted-foreground mt-1">
            Use &quot;Record Expense&quot; to add utilities, repairs, and other costs.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden border-border">
          <div className="p-4 border-b border-border bg-muted/20">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Expense</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Description</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((bill) => {
                  const owingAmount =
                    bill.billPayment?.settlement?.owingAmount ||
                    bill.billPayment?.invoice?.amount ||
                    0;
                  const fundedAmount = bill.billPayment?.transaction?.amount || 0;
                  const isPaid =
                    !!bill.billPaymentId &&
                    bill.billPayment?.transaction?.status === "success";
                  const hasOwing = isPaid && owingAmount > 0;

                  return (
                  <tr key={bill.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-foreground">{bill.title}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-muted-foreground">{bill.description || "—"}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {bill.createdAt ? format(new Date(bill.createdAt), "MMM dd, yyyy") : "—"}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-sm">
                      <AnimatedNumber value={fundedAmount || bill.amount || 0} currency="NGN" />
                      {hasOwing && (
                        <div className="text-xs font-medium text-amber-600">
                          Owing: <AnimatedNumber value={owingAmount} currency="NGN" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {hasOwing ? (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                          Paid with owing
                        </Badge>
                      ) : bill.billPaymentId && bill.billPayment?.transaction?.status === "success" ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">Paid</Badge>
                      ) : bill.billPaymentId && bill.billPayment?.transaction?.status === "cancelled" ? (
                        <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                          Cancelled
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">Pending</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(!bill.billPaymentId ||
                        bill.billPayment?.transaction?.status === "cancelled") && (
                        <div className="flex items-center justify-end gap-2">
                          {payingId === bill.id ? (
                            <PayInlineForm
                              bill={bill}
                              onPaid={() => { setPayingId(null); invalidate(); }}
                              onCancel={() => setPayingId(null)}
                            />
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => setPayingId(bill.id)}
                            >
                              Pay Now
                            </Button>
                          )}
                        </div>
                      )}
                      {hasOwing && (
                        <div className="flex items-center justify-end gap-2">
                          {repayingId === bill.id ? (
                            <RepayOwingInlineForm
                              bill={bill}
                              onPaid={() => {
                                setRepayingId(null);
                                invalidate();
                              }}
                              onCancel={() => setRepayingId(null)}
                            />
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => setRepayingId(bill.id)}
                            >
                              Repay owing
                            </Button>
                          )}
                        </div>
                      )}
                      {bill.billPaymentId && bill.billPayment?.transaction?.status === "success" && (
                        <div className="flex items-center justify-end gap-2">
                          {cancellingId === bill.id ? (
                            <CancelServicePaymentButton
                              billId={bill.id}
                              onCancel={() => setCancellingId(null)}
                              onSuccess={() => {
                                setCancellingId(null);
                                invalidate();
                              }}
                            />
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs text-rose-600 hover:text-rose-700"
                              onClick={() => setCancellingId(bill.id)}
                            >
                              Cancel payment
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                  );
                })}
                {filtered.length === 0 && bills.length > 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
                      No expenses match your search. Try a different keyword.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {filtered.length} of {bills.length} expenses
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

function CancelServicePaymentButton({
  billId,
  onCancel,
  onSuccess,
}: {
  billId: string;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const trpc = useTRPC();
  const { mutate, isPending } = useMutation(
    trpc.finance.cancelServiceBillPayment.mutationOptions({
      meta: {
        toastTitle: {
          loading: "Cancelling payment...",
          success: "Payment cancelled",
          error: "Cancellation failed",
        },
      },
      onSuccess,
    })
  );

  return (
    <div className="flex items-center gap-2">
      <SubmitButton
        isSubmitting={isPending}
        type="button"
        size="sm"
        variant="destructive"
        onClick={() => mutate({ billId })}
      >
        Confirm
      </SubmitButton>
      <Button variant="ghost" size="sm" type="button" onClick={onCancel}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

function PayInlineForm({
  bill,
  onPaid,
  onCancel,
}: {
  bill: any;
  onPaid: () => void;
  onCancel: () => void;
}) {
  const trpc = useTRPC();
  const [amount, setAmount] = useState(String(bill.amount || ""));
  const { mutate, isPending } = useMutation(
    trpc.finance.payServiceBill.mutationOptions({
      meta: {
        toastTitle: {
          loading: "Processing payment...",
          success: "Bill paid",
          error: "Payment failed",
        },
      },
      onSuccess: onPaid,
    })
  );

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="h-8 w-28 text-sm"
      />
      <SubmitButton
        isSubmitting={isPending}
        disabled={!amount}
        type="button"
        size="sm"
        onClick={() => mutate({ billId: bill.id, amount: parseFloat(amount) })}
      >
        Pay
      </SubmitButton>
      <Button variant="ghost" size="sm" type="button" onClick={onCancel}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

function RepayOwingInlineForm({
  bill,
  onPaid,
  onCancel,
}: {
  bill: any;
  onPaid: () => void;
  onCancel: () => void;
}) {
  const trpc = useTRPC();
  const [amount, setAmount] = useState(
    String(
      bill.billPayment?.settlement?.owingAmount ||
        bill.billPayment?.invoice?.amount ||
        ""
    )
  );
  const { mutate, isPending } = useMutation(
    trpc.finance.repayBillOwing.mutationOptions({
      meta: {
        toastTitle: {
          loading: "Repaying owing...",
          success: "Owing repaid",
          error: "Repayment failed",
        },
      },
      onSuccess: onPaid,
    })
  );

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="h-8 w-28 text-sm"
      />
      <SubmitButton
        isSubmitting={isPending}
        disabled={!amount}
        type="button"
        size="sm"
        onClick={() => mutate({ billId: bill.id, amount: parseFloat(amount) })}
      >
        Repay
      </SubmitButton>
      <Button variant="ghost" size="sm" type="button" onClick={onCancel}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

function CreateServicePaymentForm({ onSuccess }: { onSuccess: () => void }) {
  const trpc = useTRPC();
  const [title, setTitle] = useState("");
  const [streamId, setStreamId] = useState("");
  const [streamName, setStreamName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const { data: streams = [] } = useSuspenseQuery(
    trpc.finance.getStreams.queryOptions({ filter: "term" })
  );
  const streamOptions = useMemo(
    () =>
      streams
        .filter((stream) => stream.type === "bill" || stream.defaultType === "outgoing")
        .map((stream) => ({
          id: stream.id,
          name: stream.name,
          label: stream.name,
          description:
            stream.type === "bill"
              ? "Bill stream"
              : `${stream.defaultType === "outgoing" ? "Outgoing" : "Incoming"} stream`,
          amount: stream.balance,
        })),
    [streams]
  );
  const selectedStream =
    streamOptions.find((stream) => stream.id === streamId) ||
    (streamName || title
      ? {
          id: streamId || "__new__",
          name: (streamName || title).trim(),
          label: (streamName || title).trim(),
          description: "New bill stream",
          amount: null,
        }
      : undefined);

  const { mutate, isPending } = useMutation(
    trpc.finance.createServicePayment.mutationOptions({
      meta: {
        toastTitle: {
          loading: "Saving...",
          success: "Expense recorded",
          error: "Failed to save",
        },
      },
      onSuccess,
    })
  );

  const PRESETS = [
    "Electricity Bill",
    "Water Bill",
    "Generator Fuel",
    "Building Repairs",
    "Cleaning Supplies",
    "Internet Bill",
    "Security Services",
  ];

  return (
    <Card className="border-dashed">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Record New Expense</CardTitle>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onSuccess}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setTitle(p)}
              className="text-xs px-2.5 py-1 rounded-full border hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
        <div className="grid sm:grid-cols-4 gap-4 items-end">
          <div className="grid gap-1.5">
            <Label>Title</Label>
            <ComboboxDropdown
              items={streamOptions}
              selectedItem={selectedStream}
              placeholder="Select or create bill stream"
              searchPlaceholder="Search or create bill stream..."
              onSelect={(stream) => {
                setStreamId(stream.id);
                setStreamName(stream.name);
                setTitle(stream.name);
              }}
              onCreate={(value) => {
                const nextTitle = value.trim();
                setStreamId("");
                setStreamName(nextTitle);
                setTitle(nextTitle);
              }}
              renderOnCreate={(value) => (
                <span>Create account bill stream "{value}"</span>
              )}
              renderListItem={({ item }) => (
                <div className="flex w-full items-center gap-2">
                  <span className="font-medium">{item.name}</span>
                  <span className="truncate text-muted-foreground">
                    {item.description}
                  </span>
                  <span className="ml-auto">
                    {!item.amount || <AnimatedNumber value={item.amount} />}
                  </span>
                </div>
              )}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Description (optional)</Label>
            <Input
              placeholder="Additional notes"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Amount (NGN)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <SubmitButton
            isSubmitting={isPending}
            disabled={!title || !amount}
            onClick={() =>
              mutate({
                title,
                streamId: streamId || undefined,
                streamName: (streamName || title).trim() || undefined,
                description: description || undefined,
                amount: parseFloat(amount),
              })
            }
            type="button"
          >
            Record Expense
          </SubmitButton>
          <Button variant="ghost" type="button" onClick={onSuccess}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
