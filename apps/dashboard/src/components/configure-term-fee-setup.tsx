"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { _trpc } from "@/components/static-trpc";
import { useTRPC } from "@/trpc/client";
import { Button } from "@school-clerk/ui/button";
import { Badge } from "@school-clerk/ui/badge";
import { Input } from "@school-clerk/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@school-clerk/ui/card";
import { SubmitButton } from "./submit-button";
import {
  CheckCircle2,
  Circle,
  Download,
  Banknote,
  School,
  Globe,
} from "lucide-react";
import { NumericFormat } from "react-number-format";
import { cn } from "@school-clerk/ui/cn";

export function ConfigureTermFeeSetup({ termId }: { termId: string }) {
  const trpc = useTRPC();
  const qc = useQueryClient();

  const { data: fees, isLoading } = useQuery(
    trpc.transactions.getTermFeeSetup.queryOptions({ termId })
  );

  // Local state for edited amounts
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const invalidate = () =>
    qc.invalidateQueries({
      queryKey: trpc.transactions.getTermFeeSetup.queryKey({ termId }),
    });

  const { mutate: save, isPending: isSaving } = useMutation(
    trpc.transactions.saveTermFeeSetup.mutationOptions({
      meta: {
        toastTitle: {
          loading: "Saving fee setup...",
          success: "Fee structure saved",
          error: "Failed to save",
        },
      },
      onSuccess: invalidate,
    })
  );

  if (isLoading || !fees) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  const configuredFees = fees.filter((f) => f.configured);
  const unconfiguredFees = fees.filter((f) => !f.configured);

  // Pre-fill amounts from last term when importing
  const handleImportFromLastTerm = () => {
    const next = { ...amounts };
    const nextSelected = new Set(selected);
    for (const fee of fees) {
      if (fee.lastTermAmount !== null) {
        next[fee.feeId] = String(fee.lastTermAmount);
        nextSelected.add(fee.feeId);
      }
    }
    setAmounts(next);
    setSelected(nextSelected);
  };

  const toggleSelect = (feeId: string) => {
    const next = new Set(selected);
    if (next.has(feeId)) {
      next.delete(feeId);
    } else {
      next.add(feeId);
    }
    setSelected(next);
  };

  const handleSave = () => {
    const feesToSave = Array.from(selected)
      .map((feeId) => ({
        feeId,
        amount: parseFloat(amounts[feeId] || "0"),
      }))
      .filter((f) => f.amount > 0);

    if (feesToSave.length === 0) return;
    save({ termId, fees: feesToSave });
  };

  const selectedCount = selected.size;
  const hasChanges = selectedCount > 0;

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Fee Structure Setup</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure which fees apply for this term and set their amounts.
            {configuredFees.length > 0 && (
              <span className="text-green-600 ml-1">
                {configuredFees.length} fee{configuredFees.length !== 1 ? "s" : ""} already configured.
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleImportFromLastTerm}
            disabled={fees.every((f) => f.lastTermAmount === null)}
          >
            <Download className="h-4 w-4" />
            Import from Last Term
          </Button>
          {hasChanges && (
            <SubmitButton
              isSubmitting={isSaving}
              onClick={handleSave}
              type="button"
            >
              Save {selectedCount} Fee{selectedCount !== 1 ? "s" : ""}
            </SubmitButton>
          )}
        </div>
      </div>

      {fees.length === 0 && (
        <Card className="p-12 flex flex-col items-center text-center">
          <Banknote className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="font-medium">No fee templates yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create fee templates in Fee Management first, then return here to configure them for this term.
          </p>
        </Card>
      )}

      {/* Already configured */}
      {configuredFees.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Configured for this term
          </h3>
          <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
            {configuredFees.map((fee) => (
              <FeeRow
                key={fee.feeId}
                fee={fee}
                amount={amounts[fee.feeId] ?? String(fee.currentAmount ?? fee.lastTermAmount ?? "")}
                selected={selected.has(fee.feeId)}
                onToggle={() => toggleSelect(fee.feeId)}
                onAmountChange={(v) => {
                  setAmounts((prev) => ({ ...prev, [fee.feeId]: v }));
                  setSelected((prev) => new Set([...prev, fee.feeId]));
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Not yet configured */}
      {unconfiguredFees.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Not configured for this term
          </h3>
          <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
            {unconfiguredFees.map((fee) => (
              <FeeRow
                key={fee.feeId}
                fee={fee}
                amount={amounts[fee.feeId] ?? ""}
                selected={selected.has(fee.feeId)}
                onToggle={() => toggleSelect(fee.feeId)}
                onAmountChange={(v) => {
                  setAmounts((prev) => ({ ...prev, [fee.feeId]: v }));
                  setSelected((prev) => new Set([...prev, fee.feeId]));
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FeeRow({
  fee,
  amount,
  selected,
  onToggle,
  onAmountChange,
}: {
  fee: {
    feeId: string;
    title: string;
    description: string | null;
    classRoomId: string | null;
    classRoomName: string | null;
    configured: boolean;
    currentAmount: number | null;
    lastTermAmount: number | null;
  };
  amount: string;
  selected: boolean;
  onToggle: () => void;
  onAmountChange: (v: string) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 px-4 py-3 transition-colors",
        selected ? "bg-primary/5" : "bg-card hover:bg-muted/30"
      )}
    >
      <button type="button" onClick={onToggle} className="shrink-0">
        {fee.configured && !selected ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : selected ? (
          <CheckCircle2 className="h-5 w-5 text-primary" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{fee.title}</span>
          {fee.classRoomId ? (
            <Badge variant="outline" className="text-[10px] gap-1">
              <School className="h-3 w-3" />
              {fee.classRoomName ?? "Classroom"}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
              <Globe className="h-3 w-3" />
              General
            </Badge>
          )}
          {fee.configured && (
            <Badge className="text-[10px] bg-green-50 text-green-700 border-green-200">
              Configured
            </Badge>
          )}
        </div>
        {fee.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{fee.description}</p>
        )}
        {fee.lastTermAmount !== null && !fee.configured && (
          <p className="text-xs text-blue-600 mt-0.5">
            Last term: NGN {fee.lastTermAmount.toLocaleString()}
          </p>
        )}
      </div>

      <div className="w-36 shrink-0">
        <Input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          onClick={() => !selected && onToggle()}
          className="h-8 text-sm text-right"
        />
      </div>
    </div>
  );
}
