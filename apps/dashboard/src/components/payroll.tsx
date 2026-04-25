"use client";

import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { TableSkeleton } from "./tables/skeleton";
import { Button } from "@school-clerk/ui/button";
import { Badge } from "@school-clerk/ui/badge";
import { Checkbox } from "@school-clerk/ui/checkbox";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import { ComboboxDropdown } from "@school-clerk/ui/combobox-dropdown";
import { Card, CardContent, CardHeader, CardTitle } from "@school-clerk/ui/card";
import { SubmitButton } from "./submit-button";
import { AnimatedNumber } from "./animated-number";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@school-clerk/ui/select";
import { format } from "date-fns";
import {
  Download,
  PlusCircle,
  Wallet,
  TrendingUp,
  Users,
  Activity,
  Search,
  CheckCircle,
  AlertTriangle,
  X,
} from "lucide-react";

export function Payroll() {
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
    trpc.finance.getPayroll.queryOptions({ termId: undefined })
  );
  const { data: streams } = useSuspenseQuery(
    trpc.finance.getStreams.queryOptions({ filter: "term" })
  );

  const invalidate = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: trpc.finance.getPayroll.queryKey({ termId: undefined }) }),
      qc.invalidateQueries({ queryKey: trpc.finance.getStreams.queryKey({ filter: "term" }) }),
    ]);

  const paid = bills.filter(
    (b) => b.billPaymentId && b.billPayment?.transaction?.status === "success"
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
  const totalPending = pending.reduce((s, b) => s + (b.amount || 0), 0);
  const totalPaid = paid.reduce((s, b) => s + (b.billPayment?.amount || b.amount || 0), 0);
  const totalOwing = owing.reduce(
    (sum, bill) =>
      sum +
      (bill.billPayment?.settlement?.owingAmount ||
        bill.billPayment?.invoice?.amount ||
        0),
    0
  );
  const payrollBudget = bills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
  const unfundedBudget = Math.max(payrollBudget - totalPaid, 0);
  const payrollStreamIds = new Set(
    bills
      .map((bill) => bill.walletId)
      .filter((walletId): walletId is string => Boolean(walletId))
  );
  const payrollStreams = (streams ?? []).filter((stream) => payrollStreamIds.has(stream.id));
  const payrollStreamBalance = payrollStreams.reduce(
    (sum, stream) => sum + (stream.balance || 0),
    0
  );
  const payrollProjectedBalance = payrollStreams.reduce(
    (sum, stream) => sum + (stream.projectedBalance ?? stream.balance ?? 0),
    0
  );
  const payrollStreamPendingBills = payrollStreams.reduce(
    (sum, stream) => sum + (stream.pendingBills || 0),
    0
  );

  const filtered = bills.filter((b) => {
    if (!search) return true;
    const name = b.staffTermProfile?.staffProfile?.name?.toLowerCase() ?? "";
    const title = b.title?.toLowerCase() ?? "";
    return name.includes(search.toLowerCase()) || title.includes(search.toLowerCase());
  });

  const processedPct = bills.length > 0 ? Math.round((paid.length / bills.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Payroll</h1>
          <p className="text-muted-foreground mt-1">
            Review salaries, verify records, and finalize disbursements for staff.
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild type="button" variant="outline" className="gap-2" size="sm">
            <Link href="/finance/streams">
              <Wallet className="h-4 w-4" />
              Open Streams
            </Link>
          </Button>
          <Button type="button" variant="outline" className="gap-2" size="sm">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
          <Button
            type="button"
            className="gap-2 shadow-sm"
            size="sm"
            onClick={() => setShowCreate(!showCreate)}
          >
            <PlusCircle className="h-4 w-4" />
            Add Salary Bill
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <p className="text-muted-foreground text-sm font-medium">Total Disbursed</p>
            <div className="text-primary"><Activity className="h-5 w-5" /></div>
          </div>
          <p className="text-3xl font-bold">
            <AnimatedNumber value={totalPaid} currency="NGN" />
          </p>
          <p className="text-emerald-600 text-sm font-semibold flex items-center gap-1">
            <TrendingUp className="h-4 w-4" /> {paid.length} payments made
          </p>
        </Card>

        <Card className="p-6 flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <p className="text-muted-foreground text-sm font-medium">Staff Count</p>
            <div className="text-primary"><Users className="h-5 w-5" /></div>
          </div>
          <p className="text-3xl font-bold">{bills.length} Bills</p>
          <p className="text-muted-foreground text-sm font-medium">{pending.length} pending payments</p>
        </Card>

        <Card className="p-6 flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <p className="text-muted-foreground text-sm font-medium">Processing Progress</p>
            <div className="text-primary"><Activity className="h-5 w-5" /></div>
          </div>
          <p className="text-3xl font-bold">{processedPct}%</p>
          <div className="w-full bg-secondary h-2 rounded-full overflow-hidden mt-1">
            <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${processedPct}%` }} />
          </div>
        </Card>

        <Card className="p-6 flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <p className="text-muted-foreground text-sm font-medium">Outstanding Owing</p>
            <div className="text-amber-600"><AlertTriangle className="h-5 w-5" /></div>
          </div>
          <p className="text-3xl font-bold">
            <AnimatedNumber value={totalOwing} currency="NGN" />
          </p>
          <p className="text-amber-600 text-sm font-semibold">{owing.length} paid with owing</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.9fr] gap-4">
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Payroll Budget Snapshot</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight">
                Budget and live stream balances
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Current term payroll obligations compared with the balances on linked payroll streams.
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              {payrollStreams.length} linked stream{payrollStreams.length === 1 ? "" : "s"}
            </Badge>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Payroll Budget
              </p>
              <div className="mt-2 text-2xl font-bold">
                <AnimatedNumber value={payrollBudget} currency="NGN" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Gross value of all payroll bills this term
              </p>
            </div>
            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Remaining Budget
              </p>
              <div className="mt-2 text-2xl font-bold">
                <AnimatedNumber value={unfundedBudget} currency="NGN" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Gross payroll still not fully funded
              </p>
            </div>
            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Stream Balance
              </p>
              <div className="mt-2 text-2xl font-bold">
                <AnimatedNumber value={payrollStreamBalance} currency="NGN" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Combined live balance across payroll streams
              </p>
            </div>
            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Projected Balance
              </p>
              <div className="mt-2 text-2xl font-bold">
                <AnimatedNumber value={payrollProjectedBalance} currency="NGN" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                After stream pending bills and owing are applied
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Payroll Funding Streams</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight">Balance by linked stream</h2>
            </div>
            <Badge
              variant="outline"
              className={payrollProjectedBalance >= 0 ? "text-emerald-700 border-emerald-200 bg-emerald-50" : "text-rose-700 border-rose-200 bg-rose-50"}
            >
              {payrollProjectedBalance >= 0 ? "Funded" : "Needs attention"}
            </Badge>
          </div>

          <div className="mt-5 space-y-3">
            {payrollStreams.length ? (
              payrollStreams.map((stream) => (
                <div
                  key={stream.id}
                  className="rounded-xl border bg-muted/10 px-4 py-3 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{stream.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Pending bills: <AnimatedNumber value={stream.pendingBills || 0} currency="NGN" />{" "}
                      • Projected: <AnimatedNumber value={stream.projectedBalance ?? stream.balance} currency="NGN" />
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Balance
                    </p>
                    <p className="text-sm font-bold">
                      <AnimatedNumber value={stream.balance} currency="NGN" />
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                No payroll bills are linked to a funding stream yet.
              </div>
            )}
          </div>

          {payrollStreams.length > 0 && (
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>Total stream pending bills</span>
              <span className="font-semibold text-foreground">
                <AnimatedNumber value={payrollStreamPendingBills} currency="NGN" />
              </span>
            </div>
          )}
        </Card>
      </div>

      {/* Create Form */}
      {showCreate && (
        <CreateStaffBillForm onSuccess={() => { setShowCreate(false); invalidate(); }} />
      )}

      {/* Table */}
      <Card className="overflow-hidden border-border">
        {/* Toolbar */}
        <div className="p-4 border-b border-border bg-muted/20 flex flex-wrap gap-4 items-center justify-between">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or bill title..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Displaying:
            </span>
            <span className="text-sm font-bold">{filtered.length} records</span>
          </div>
        </div>

        {bills.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <Users className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="font-medium text-muted-foreground">No payroll records yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add salary bills using the &quot;Add Salary Bill&quot; button above.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Staff Member</th>
                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Bill Title</th>
                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Gross Pay</th>
                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Net Pay</th>
                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((bill) => {
                    const staff = bill.staffTermProfile?.staffProfile;
                    const initials = staff?.name
                      ? staff.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                      : "??";
                    const isPaid =
                      !!bill.billPaymentId &&
                      bill.billPayment?.transaction?.status === "success";
                    const owingAmount =
                      bill.billPayment?.settlement?.owingAmount ||
                      bill.billPayment?.invoice?.amount ||
                      0;
                    const fundedAmount = bill.billPayment?.transaction?.amount || 0;
                    const hasOwing = isPaid && owingAmount > 0;
                    const isCancelled =
                      !!bill.billPaymentId &&
                      bill.billPayment?.transaction?.status === "cancelled";

                    return (
                      <tr key={bill.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                              {initials}
                            </div>
                            <div>
                              <p className="text-sm font-bold">{staff?.name ?? "—"}</p>
                              <p className="text-xs text-muted-foreground">{staff?.title ?? "Staff"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">{bill.title}</td>
                        <td className="px-6 py-4 text-sm text-right font-medium">
                          <AnimatedNumber value={bill.amount || 0} currency="NGN" />
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-extrabold">
                          <AnimatedNumber value={fundedAmount || 0} currency="NGN" />
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
                          ) : isPaid ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" /> Paid
                            </Badge>
                          ) : isCancelled ? (
                            <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                              Cancelled
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                              Pending
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {!isPaid && (
                              payingId === bill.id ? (
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
                                  Pay
                                </Button>
                              )
                            )}
                            {hasOwing && (
                              repayingId === bill.id ? (
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
                              )
                            )}
                            {isPaid && bill.createdAt && (
                              <>
                                {cancellingId === bill.id ? (
                                  <CancelPayrollPaymentButton
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
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(bill.createdAt), "MMM dd")}
                                </span>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
                        No records found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {filtered.length} of {bills.length} records
              </p>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function CancelPayrollPaymentButton({
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
    trpc.finance.cancelStaffBillPayment.mutationOptions({
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
    trpc.finance.payStaffBill.mutationOptions({
      meta: {
        toastTitle: {
          loading: "Processing payment...",
          success: "Salary paid",
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

function CreateStaffBillForm({ onSuccess }: { onSuccess: () => void }) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [staffId, setStaffId] = useState("");
  const [title, setTitle] = useState("");
  const [streamId, setStreamId] = useState("");
  const [streamName, setStreamName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [markAsPaid, setMarkAsPaid] = useState(false);

  const { data: staffList } = useSuspenseQuery(
    trpc.finance.getStaff.queryOptions()
  );
  const { data: streams } = useSuspenseQuery(
    trpc.finance.getStreams.queryOptions({ filter: "term" })
  );
  const streamOptions = (streams ?? [])
    .filter((stream) => stream.type === "bill" || stream.defaultType === "outgoing")
    .map((stream) => ({
      id: stream.id,
      name: stream.name,
      label: stream.name,
      balance: stream.balance,
      projectedBalance: stream.projectedBalance ?? stream.balance,
      pendingBills: stream.pendingBills || 0,
      owingAmount: stream.owingAmount || 0,
      description:
        stream.type === "bill"
          ? "Bill stream"
          : `${stream.defaultType === "outgoing" ? "Outgoing" : "Incoming"} stream`,
      amount: stream.balance,
    }));
  const defaultPayrollStream =
    streamOptions.find((stream) => stream.name.trim().toLowerCase() === "payroll") ||
    streamOptions.find((stream) =>
      stream.name.trim().toLowerCase().includes("payroll")
    );

  useEffect(() => {
    if (!defaultPayrollStream) return;
    if (streamId || streamName || title) return;

    setStreamId(defaultPayrollStream.id);
    setStreamName(defaultPayrollStream.name);
    setTitle(defaultPayrollStream.name);
  }, [defaultPayrollStream, streamId, streamName, title]);

  const selectedStream =
    streamOptions.find((stream) => stream.id === streamId) ||
    (streamName || title
      ? {
          id: streamId || "__new__",
          name: (streamName || title).trim(),
          label: (streamName || title).trim(),
          description: "New bill stream",
          amount: null,
          balance: null,
          projectedBalance: null,
          pendingBills: 0,
          owingAmount: 0,
        }
      : undefined);

  const { mutateAsync: createBill, isPending: isCreating } = useMutation(
    trpc.finance.createStaffBill.mutationOptions({
      meta: {
        toastTitle: {
          loading: "Creating bill...",
          success: "Salary bill created",
          error: "Failed to create bill",
        },
      },
    })
  );
  const { mutateAsync: payBill, isPending: isPaying } = useMutation(
    trpc.finance.payStaffBill.mutationOptions({
      meta: {
        toastTitle: {
          loading: "Marking salary as paid...",
          success: "Salary bill created and paid",
          error: "Unable to mark salary as paid",
        },
      },
      onSuccess: async () => {
        await qc.invalidateQueries({
          queryKey: trpc.finance.getPayroll.queryKey({ termId: undefined }),
        });
        await qc.invalidateQueries({
          queryKey: trpc.finance.getStreams.queryKey({ filter: "term" }),
        });
      },
    })
  );
  const isPending = isCreating || isPaying;

  const handleSubmit = async () => {
    if (!staffId || !title || !amount) return;

    const numericAmount = parseFloat(amount);
    if (Number.isNaN(numericAmount)) return;

    const createdBill = await createBill({
      staffProfileId: staffId,
      title,
      streamId: streamId || undefined,
      streamName: (streamName || title).trim() || undefined,
      description: description || undefined,
      amount: numericAmount,
    });

    if (markAsPaid) {
      await payBill({
        billId: createdBill.id,
        amount: numericAmount,
      });
    }

    await qc.invalidateQueries({
      queryKey: trpc.finance.getPayroll.queryKey({ termId: undefined }),
    });
    await qc.invalidateQueries({
      queryKey: trpc.finance.getStreams.queryKey({ filter: "term" }),
    });
    onSuccess();
  };

  return (
    <Card className="border-dashed">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Add Salary Bill</CardTitle>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onSuccess}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="grid gap-1.5">
            <Label>Staff Member</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger>
                <SelectValue placeholder="Select staff" />
              </SelectTrigger>
              <SelectContent>
                {(staffList ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Bill Title</Label>
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
            <Label>Amount (NGN)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Description (optional)</Label>
            <Input
              placeholder="Notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex items-start gap-3 rounded-xl border bg-muted/10 px-4 py-3">
            <Checkbox
              id="payroll-mark-as-paid"
              checked={markAsPaid}
              onCheckedChange={(checked) => setMarkAsPaid(checked === true)}
            />
            <div className="space-y-1">
              <Label htmlFor="payroll-mark-as-paid" className="text-sm font-semibold">
                Mark as paid
              </Label>
              <p className="text-xs text-muted-foreground">
                Create the salary bill and immediately record payment from the selected stream.
              </p>
            </div>
          </div>

          <div className="rounded-xl border bg-muted/10 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Stream fund status
            </p>
            {selectedStream ? (
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{selectedStream.name}</p>
                  {selectedStream.balance === null ? (
                    <Badge variant="outline">New stream</Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className={
                        (selectedStream.projectedBalance ?? 0) >= 0
                          ? "text-emerald-700 border-emerald-200 bg-emerald-50"
                          : "text-rose-700 border-rose-200 bg-rose-50"
                      }
                    >
                      {(selectedStream.projectedBalance ?? 0) >= 0
                        ? "Available"
                        : "Overdrawn"}
                    </Badge>
                  )}
                </div>
                {selectedStream.balance === null ? (
                  <p className="text-xs text-muted-foreground">
                    This bill will create a new outgoing stream with no current funding history yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Balance</p>
                      <p className="mt-1 font-semibold text-foreground">
                        <AnimatedNumber value={selectedStream.balance || 0} currency="NGN" />
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Projected</p>
                      <p className="mt-1 font-semibold text-foreground">
                        <AnimatedNumber
                          value={selectedStream.projectedBalance ?? selectedStream.balance ?? 0}
                          currency="NGN"
                        />
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pending bills</p>
                      <p className="mt-1 font-semibold text-foreground">
                        <AnimatedNumber value={selectedStream.pendingBills || 0} currency="NGN" />
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Select a stream to see its current funding position.
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <SubmitButton
            isSubmitting={isPending}
            disabled={!staffId || !title || !amount}
            onClick={handleSubmit}
            type="button"
          >
            {markAsPaid ? "Create and Pay" : "Create Bill"}
          </SubmitButton>
          <Button variant="ghost" type="button" onClick={onSuccess}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
