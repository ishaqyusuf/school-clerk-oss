"use client";

import { useState, Suspense } from "react";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { TableSkeleton } from "./tables/skeleton";
import { Button } from "@school-clerk/ui/button";
import { Badge } from "@school-clerk/ui/badge";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
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

  const { data: bills } = useSuspenseQuery(
    trpc.finance.getPayroll.queryOptions({})
  );

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: trpc.finance.getPayroll.queryKey({}) });

  const pending = bills.filter((b) => !b.billPaymentId);
  const paid = bills.filter((b) => b.billPaymentId);

  const totalPending = pending.reduce((s, b) => s + (b.amount || 0), 0);
  const totalPaid = paid.reduce((s, b) => s + (b.billPayment?.amount || b.amount || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Bills</p>
            <p className="text-2xl font-bold">{bills.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">
              <AnimatedNumber value={totalPending} currency="NGN" />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Disbursed</p>
            <p className="text-2xl font-bold text-green-600">
              <AnimatedNumber value={totalPaid} currency="NGN" />
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button size="xs" onClick={() => setShowCreate(!showCreate)}>
          Add Salary Bill
        </Button>
      </div>

      {showCreate && (
        <CreateStaffBillForm onSuccess={() => { setShowCreate(false); invalidate(); }} />
      )}

      {bills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm gap-1">
          <span>No payroll bills yet for this term.</span>
          <span>Click &quot;Add Salary Bill&quot; to record staff remuneration.</span>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                Unpaid ({pending.length})
              </p>
              <div className="divide-y border rounded-md">
                {pending.map((bill) => (
                  <PayrollRow
                    key={bill.id}
                    bill={bill}
                    isPaying={payingId === bill.id}
                    onPay={() => setPayingId(payingId === bill.id ? null : bill.id)}
                    onPaid={() => { setPayingId(null); invalidate(); }}
                  />
                ))}
              </div>
            </div>
          )}

          {paid.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                Paid ({paid.length})
              </p>
              <div className="divide-y border rounded-md">
                {paid.map((bill) => (
                  <PayrollRow key={bill.id} bill={bill} isPaying={false} onPay={() => {}} onPaid={() => {}} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PayrollRow({
  bill,
  isPaying,
  onPay,
  onPaid,
}: {
  bill: any;
  isPaying: boolean;
  onPay: () => void;
  onPaid: () => void;
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

  const staffName = bill.staffTermProfile?.staffProfile?.name || "Unknown Staff";
  const staffTitle = bill.staffTermProfile?.staffProfile?.title;

  return (
    <div className="py-3 px-4">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium">{staffName}</p>
          {staffTitle && <p className="text-xs text-muted-foreground">{staffTitle}</p>}
          <p className="text-xs text-muted-foreground">{bill.title}</p>
          {bill.description && (
            <p className="text-xs text-muted-foreground">{bill.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            {bill.createdAt ? format(new Date(bill.createdAt), "dd MMM yyyy") : ""}
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono text-sm">
            <AnimatedNumber value={bill.amount} currency="NGN" />
          </div>
          {bill.billPaymentId ? (
            <div>
              <Badge variant="outline" className="text-green-600 border-green-300 text-xs mt-1">
                Paid
              </Badge>
              {bill.billPayment?.transaction?.transactionDate && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(bill.billPayment.transaction.transactionDate), "dd MMM yyyy")}
                </p>
              )}
            </div>
          ) : (
            <Button size="xs" variant="outline" className="mt-1" onClick={onPay}>
              Pay
            </Button>
          )}
        </div>
      </div>

      {isPaying && !bill.billPaymentId && (
        <div className="mt-3 flex items-end gap-3 pt-3 border-t">
          <div className="flex-1 grid gap-1">
            <Label className="text-xs">Amount (NGN)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <SubmitButton
            isSubmitting={isPending}
            disabled={!amount}
            type="button"
            size="xs"
            onClick={() =>
              mutate({ billId: bill.id, amount: parseFloat(amount) })
            }
          >
            Confirm
          </SubmitButton>
          <Button variant="ghost" size="xs" type="button" onClick={onPay}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

function CreateStaffBillForm({ onSuccess }: { onSuccess: () => void }) {
  const trpc = useTRPC();
  const [staffId, setStaffId] = useState("");
  const [title, setTitle] = useState("Monthly Salary");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const { data: staffList } = useQuery(trpc.finance.getStaff.queryOptions());

  const { mutate, isPending } = useMutation(
    trpc.finance.createStaffBill.mutationOptions({
      meta: {
        toastTitle: {
          loading: "Creating bill...",
          success: "Bill created",
          error: "Failed to create",
        },
      },
      onSuccess,
    })
  );

  const TITLE_PRESETS = [
    "Monthly Salary",
    "Transport Allowance",
    "Housing Allowance",
    "Medical Allowance",
    "Bonus",
    "Overtime Pay",
  ];

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-sm">Add Salary / Remuneration Bill</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            {TITLE_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setTitle(p)}
                className={`text-xs px-2 py-1 rounded border hover:bg-accent ${
                  title === p ? "bg-accent" : ""
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="grid gap-1.5">
              <Label>Staff Member</Label>
              <Select value={staffId} onValueChange={setStaffId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff..." />
                </SelectTrigger>
                <SelectContent>
                  {(staffList || []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}{s.title ? ` (${s.title})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Bill Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Monthly Salary"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Description (optional)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Notes"
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
              disabled={!staffId || !title || !amount}
              onClick={() =>
                mutate({
                  staffProfileId: staffId,
                  title,
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
        </div>
      </CardContent>
    </Card>
  );
}
