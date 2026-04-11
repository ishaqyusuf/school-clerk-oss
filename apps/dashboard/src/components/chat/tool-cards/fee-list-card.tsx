"use client";

import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import { CreditCard } from "lucide-react";
import { useState } from "react";

type FeeItem = {
  id: string;
  title: string;
  description: string | null;
  billAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: "PAID" | "PARTIAL" | "PENDING";
  streamName: string | null;
};

type Props = {
  studentName: string;
  studentId: string;
  studentTermFormId: string;
  fees: FeeItem[];
  totalPending: number;
  prefilledAmount?: number;
  onConfirm: (payload: {
    studentId: string;
    studentTermFormId: string;
    studentName: string;
    amount: number;
    allocations: { studentFeeId: string; feeTitle: string; amountToPay: number }[];
    paymentMethod: string;
  }) => void;
};

export function FeeListCard({
  studentName,
  studentId,
  studentTermFormId,
  fees,
  totalPending,
  prefilledAmount,
  onConfirm,
}: Props) {
  const pendingFees = fees.filter((f) => f.status !== "PAID");

  const [selected, setSelected] = useState<Record<string, boolean>>(
    () => Object.fromEntries(pendingFees.map((f) => [f.id, true])),
  );
  const [amount, setAmount] = useState(
    prefilledAmount ? String(prefilledAmount) : String(totalPending),
  );
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  const toggleFee = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectedFees = pendingFees.filter((f) => selected[f.id]);
  const selectedTotal = selectedFees.reduce((s, f) => s + f.pendingAmount, 0);
  const parsedAmount = parseFloat(amount) || 0;

  const handleConfirm = () => {
    if (!selectedFees.length || parsedAmount <= 0) return;

    // Distribute amount proportionally across selected fees
    let remaining = parsedAmount;
    const allocations: { studentFeeId: string; feeTitle: string; amountToPay: number }[] = [];

    for (let i = 0; i < selectedFees.length; i++) {
      const fee = selectedFees[i];
      const isLast = i === selectedFees.length - 1;
      const amountToPay = isLast
        ? Math.min(remaining, fee.pendingAmount)
        : Math.min(Math.round((fee.pendingAmount / selectedTotal) * parsedAmount * 100) / 100, fee.pendingAmount);
      if (amountToPay > 0) {
        allocations.push({ studentFeeId: fee.id, feeTitle: fee.title, amountToPay });
        remaining -= amountToPay;
      }
    }

    if (!allocations.length) return;

    const totalAllocated = allocations.reduce((s, a) => s + a.amountToPay, 0);
    onConfirm({
      studentId,
      studentTermFormId,
      studentName,
      amount: totalAllocated,
      allocations,
      paymentMethod,
    });
  };

  const statusColor = {
    PAID: "text-green-600 border-green-300 bg-green-50",
    PARTIAL: "text-amber-600 border-amber-300 bg-amber-50",
    PENDING: "text-red-600 border-red-300 bg-red-50",
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{studentName}</span>
        <Badge variant="outline" className="ml-auto text-xs">
          ₦{totalPending.toLocaleString()} pending
        </Badge>
      </div>

      <div className="flex flex-col gap-1.5">
        {fees.map((fee) => {
          const isPending = fee.status !== "PAID";
          return (
            <button
              key={fee.id}
              disabled={!isPending}
              onClick={() => isPending && toggleFee(fee.id)}
              className={[
                "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                isPending && selected[fee.id]
                  ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                  : isPending
                    ? "border-border bg-muted/30 hover:bg-muted/60"
                    : "cursor-default border-border/50 bg-muted/20 opacity-50",
              ].join(" ")}
            >
              {isPending && (
                <div
                  className={[
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors",
                    selected[fee.id] ? "border-primary bg-primary" : "border-muted-foreground/40",
                  ].join(" ")}
                >
                  {selected[fee.id] && (
                    <svg className="h-2.5 w-2.5 text-primary-foreground" fill="currentColor" viewBox="0 0 12 12">
                      <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{fee.title}</p>
                {fee.description && (
                  <p className="truncate text-xs text-muted-foreground">{fee.description}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-xs font-medium">₦{fee.pendingAmount.toLocaleString()}</span>
                <Badge variant="outline" className={`text-[10px] ${statusColor[fee.status]}`}>
                  {fee.status}
                </Badge>
              </div>
            </button>
          );
        })}
      </div>

      {selectedFees.length > 0 && (
        <div className="flex flex-col gap-2 border-t pt-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Amount (₦)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 h-8 text-sm"
                min={1}
                max={selectedTotal}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Payment method</Label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {["Cash", "Bank Transfer", "POS", "Cheque", "Online"].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={parsedAmount <= 0 || parsedAmount > selectedTotal + 0.01}
            className="w-full"
          >
            Receive ₦{parsedAmount > 0 ? parsedAmount.toLocaleString() : "—"}
          </Button>
        </div>
      )}
    </div>
  );
}
