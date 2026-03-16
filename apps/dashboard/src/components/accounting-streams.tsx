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

export function AccountingStreams() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <Content />
    </Suspense>
  );
}

function Content() {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"term" | "session">("term");
  const [showCreate, setShowCreate] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  const { data: streams } = useSuspenseQuery(
    trpc.finance.getStreams.queryOptions({ filter })
  );

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: trpc.finance.getStreams.queryKey({ filter }) });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={filter === "term" ? "default" : "outline"}
            size="xs"
            onClick={() => setFilter("term")}
          >
            This Term
          </Button>
          <Button
            variant={filter === "session" ? "default" : "outline"}
            size="xs"
            onClick={() => setFilter("session")}
          >
            This Session
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            size="xs"
            variant="outline"
            onClick={() => { setShowTransfer(!showTransfer); setShowCreate(false); }}
          >
            Transfer Funds
          </Button>
          <Button
            size="xs"
            onClick={() => { setShowCreate(!showCreate); setShowTransfer(false); }}
          >
            Add Stream
          </Button>
        </div>
      </div>

      {/* Create stream form */}
      {showCreate && (
        <CreateStreamForm onSuccess={() => { setShowCreate(false); invalidate(); }} />
      )}

      {/* Transfer form */}
      {showTransfer && (
        <TransferFundsForm
          streams={streams}
          onSuccess={() => { setShowTransfer(false); invalidate(); }}
        />
      )}

      {/* Streams list */}
      {streams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm gap-2">
          <span>No accounting streams yet for this period.</span>
          <span>Streams are created automatically when fees or bills are recorded.</span>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {streams.map((s) => (
            <Card key={s.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{s.name}</CardTitle>
                  <Badge variant="outline" className="text-xs capitalize">
                    {s.type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <div className="text-2xl font-bold">
                  <AnimatedNumber value={s.balance} currency="NGN" />
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="text-green-600">
                    In: <AnimatedNumber value={s.totalIn} currency="NGN" />
                  </span>
                  <span className="text-red-500">
                    Out: <AnimatedNumber value={s.totalOut} currency="NGN" />
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateStreamForm({ onSuccess }: { onSuccess: () => void }) {
  const trpc = useTRPC();
  const [name, setName] = useState("");
  const [type, setType] = useState("fee");

  const { mutate, isPending } = useMutation(
    trpc.finance.createStream.mutationOptions({
      meta: {
        toastTitle: {
          loading: "Creating stream...",
          success: "Stream created",
          error: "Failed to create stream",
        },
      },
      onSuccess,
    })
  );

  return (
    <Card className="border-dashed">
      <CardContent className="pt-4">
        <div className="grid sm:grid-cols-3 gap-4 items-end">
          <div className="grid gap-1.5">
            <Label>Stream Name</Label>
            <Input
              placeholder="e.g. Uniform Sales"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fee">Income (Fee)</SelectItem>
                <SelectItem value="bill">Expense (Bill)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <SubmitButton
              isSubmitting={isPending}
              disabled={!name}
              onClick={() => mutate({ name, type })}
              type="button"
            >
              Create
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

function TransferFundsForm({
  streams,
  onSuccess,
}: {
  streams: { id: string; name: string }[];
  onSuccess: () => void;
}) {
  const trpc = useTRPC();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const { mutate, isPending } = useMutation(
    trpc.finance.transferFunds.mutationOptions({
      meta: {
        toastTitle: {
          loading: "Transferring...",
          success: "Transfer complete",
          error: "Transfer failed",
        },
      },
      onSuccess,
    })
  );

  const handleSubmit = () => {
    if (!from || !to || !amount) return;
    mutate({
      fromWalletId: from,
      toWalletId: to,
      amount: parseFloat(amount),
      description,
    });
  };

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-sm">Transfer Funds Between Streams</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-4 gap-4 items-end">
          <div className="grid gap-1.5">
            <Label>From</Label>
            <Select value={from} onValueChange={setFrom}>
              <SelectTrigger>
                <SelectValue placeholder="Source stream" />
              </SelectTrigger>
              <SelectContent>
                {streams.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>To</Label>
            <Select value={to} onValueChange={setTo}>
              <SelectTrigger>
                <SelectValue placeholder="Destination stream" />
              </SelectTrigger>
              <SelectContent>
                {streams
                  .filter((s) => s.id !== from)
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
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
            <Label>Description</Label>
            <Input
              placeholder="Optional note"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <SubmitButton
            isSubmitting={isPending}
            disabled={!from || !to || !amount}
            onClick={handleSubmit}
            type="button"
          >
            Transfer
          </SubmitButton>
          <Button variant="ghost" type="button" onClick={onSuccess}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
