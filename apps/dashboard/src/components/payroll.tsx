"use client";

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
  TrendingUp,
  Users,
  Activity,
  Search,
  CheckCircle,
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
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: bills } = useSuspenseQuery(
    trpc.finance.getPayroll.queryOptions({ termId: undefined })
  );

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: trpc.finance.getPayroll.queryKey({ termId: undefined }) });

  const paid = bills.filter(
    (b) => b.billPaymentId && b.billPayment?.transaction?.status === "success"
  );
  const pending = bills.filter(
    (b) => !b.billPaymentId || b.billPayment?.transaction?.status === "cancelled"
  );
  const totalPending = pending.reduce((s, b) => s + (b.amount || 0), 0);
  const totalPaid = paid.reduce((s, b) => s + (b.billPayment?.amount || b.amount || 0), 0);

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                          <AnimatedNumber value={bill.billPayment?.amount || bill.amount || 0} currency="NGN" />
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isPaid ? (
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

function CreateStaffBillForm({ onSuccess }: { onSuccess: () => void }) {
  const trpc = useTRPC();
  const [staffId, setStaffId] = useState("");
  const [title, setTitle] = useState("");
  const [streamId, setStreamId] = useState("");
  const [streamName, setStreamName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

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
      description:
        stream.type === "bill"
          ? "Bill stream"
          : `${stream.defaultType === "outgoing" ? "Outgoing" : "Incoming"} stream`,
      amount: stream.balance,
    }));
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
    trpc.finance.createStaffBill.mutationOptions({
      meta: {
        toastTitle: {
          loading: "Creating bill...",
          success: "Salary bill created",
          error: "Failed to create bill",
        },
      },
      onSuccess,
    })
  );

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
        <div className="flex gap-2 mt-4">
          <SubmitButton
            isSubmitting={isPending}
            disabled={!staffId || !title || !amount}
            onClick={() =>
              mutate({
                staffProfileId: staffId,
                title,
                streamId: streamId || undefined,
                streamName: (streamName || title).trim() || undefined,
                description: description || undefined,
                amount: parseFloat(amount),
              })
            }
            type="button"
          >
            Create Bill
          </SubmitButton>
          <Button variant="ghost" type="button" onClick={onSuccess}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
