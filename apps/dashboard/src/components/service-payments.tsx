"use client";

import { useState, Suspense } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { TableSkeleton } from "./tables/skeleton";
import { Button } from "@school-clerk/ui/button";
import { Badge } from "@school-clerk/ui/badge";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import { Card, CardContent } from "@school-clerk/ui/card";
import { SubmitButton } from "./submit-button";
import { AnimatedNumber } from "./animated-number";
import { format } from "date-fns";

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

  const { data: bills } = useSuspenseQuery(
    trpc.finance.getServicePayments.queryOptions({})
  );

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: trpc.finance.getServicePayments.queryKey({}) });

  const pending = bills.filter((b) => !b.billPaymentId);
  const paid = bills.filter((b) => b.billPaymentId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button size="xs" onClick={() => setShowCreate(!showCreate)}>
          Record Expense
        </Button>
      </div>

      {showCreate && (
        <CreateServicePaymentForm onSuccess={() => { setShowCreate(false); invalidate(); }} />
      )}

      {bills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm gap-1">
          <span>No service payments recorded.</span>
          <span>Use &quot;Record Expense&quot; to add utilities, repairs, and other costs.</span>
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
                  <BillRow
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
                  <BillRow key={bill.id} bill={bill} isPaying={false} onPay={() => {}} onPaid={() => {}} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BillRow({
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
    <div className="py-3 px-4">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium">{bill.title}</p>
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
            <Badge variant="outline" className="text-green-600 border-green-300 text-xs mt-1">
              Paid
            </Badge>
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
            <Label className="text-xs">Amount to pay (NGN)</Label>
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
      <CardContent className="pt-4">
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setTitle(p)}
                className="text-xs px-2 py-1 rounded border hover:bg-accent"
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
        </div>
      </CardContent>
    </Card>
  );
}
