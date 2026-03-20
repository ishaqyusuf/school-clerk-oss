"use client";

import { useState, Suspense } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { TableSkeleton } from "./tables/skeleton";
import { Button } from "@school-clerk/ui/button";
import { Badge } from "@school-clerk/ui/badge";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
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
  const [search, setSearch] = useState("");

  const { data: bills } = useSuspenseQuery(
    trpc.finance.getServicePayments.queryOptions({})
  );

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: trpc.finance.getServicePayments.queryKey({}) });

  const pending = bills.filter((b) => !b.billPaymentId);
  const paid = bills.filter((b) => b.billPaymentId);

  const filtered = bills.filter((b) => {
    if (!search) return true;
    return b.title?.toLowerCase().includes(search.toLowerCase());
  });

  const totalPaid = paid.reduce((s, b) => s + (b.amount || 0), 0);
  const totalPending = pending.reduce((s, b) => s + (b.amount || 0), 0);

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
          <Button variant="outline" className="gap-2" size="sm">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
          <Button className="gap-2 shadow-sm" size="sm" onClick={() => setShowCreate(!showCreate)}>
            <PlusCircle className="h-4 w-4" />
            Record Expense
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <p className="text-muted-foreground text-xs font-semibold">All time records</p>
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
                {filtered.map((bill) => (
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
                      <AnimatedNumber value={bill.amount} currency="NGN" />
                    </td>
                    <td className="px-6 py-4 text-center">
                      {bill.billPaymentId ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">Paid</Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">Pending</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!bill.billPaymentId && (
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
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
                      No expenses found matching your search.
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

function CreateServicePaymentForm({ onSuccess }: { onSuccess: () => void }) {
  const trpc = useTRPC();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

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
        <div className="grid sm:grid-cols-3 gap-4 items-end">
          <div className="grid gap-1.5">
            <Label>Title</Label>
            <Input
              placeholder="e.g. Generator Repair"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
