"use client";

import { Button } from "@school-clerk/ui/button";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

const receiptsSchema = z.object({
  runId: z.string(), conversationId: z.string(), status: z.string(),
  receipts: z.array(z.object({
    id: z.string(), toolName: z.string(), completedAt: z.string().nullable(),
    output: z.record(z.string(), z.unknown()),
  })),
});

export function ChatRunReceipts({ runId, conversationId, availableTools }: {
  runId: string; conversationId: string; availableTools: string[];
}) {
  const [result, setResult] = useState<z.infer<typeof receiptsSchema> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  const checkReceipts = async () => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(`/api/chat/runs/${encodeURIComponent(runId)}/receipts`, {
        signal: request.signal, cache: "no-store",
      });
      if (!response.ok) throw new Error("Saved actions could not be checked. Check your access or try again later.");
      const data = receiptsSchema.parse(await response.json());
      if (data.runId !== runId || data.conversationId !== conversationId) throw new Error("The conversation changed. Reopen it before checking saved actions.");
      if (!request.signal.aborted) setResult(data);
    } catch (cause) {
      if (!request.signal.aborted) setError(cause instanceof Error ? cause.message : "Saved actions could not be checked.");
    } finally {
      if (!request.signal.aborted) setLoading(false);
    }
  };
  const receipts = result?.receipts.filter((receipt) => availableTools.includes(receipt.toolName)) ?? [];

  return (
    <section className="min-w-0 rounded-lg border p-3" aria-label="Saved AI actions">
      <p className="break-words text-xs text-muted-foreground">
        If a response was interrupted, check saved actions before repeating a payment or other change.
      </p>
      <Button type="button" variant="outline" disabled={loading}
        className="mt-2 min-h-11 w-full whitespace-normal sm:w-auto"
        onClick={() => void checkReceipts()}>
        {loading ? "Checking saved actions…" : "Check saved actions"}
      </Button>
      {error ? <p role="alert" className="mt-2 break-words text-sm text-destructive">{error}</p> : null}
      {result ? <div className="mt-2 min-w-0 space-y-2">
        <p role="status" className="break-words text-xs text-muted-foreground">
          {receipts.length ? `${receipts.length} saved action(s) visible with your current access.`
            : "No committed receipts are visible yet. The action may still be running or inaccessible; this does not prove it failed. Check domain records before repeating it."}
        </p>
        {receipts.map((receipt) => <details key={receipt.id} className="min-w-0 rounded-md border px-2">
          <summary className="min-h-11 cursor-pointer break-words py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Saved: {receipt.toolName}
          </summary>
          <p className="break-all text-xs text-muted-foreground">Reference: {receipt.id}</p>
          <pre className="my-2 max-h-64 max-w-full overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(receipt.output, null, 2)}</pre>
        </details>)}
      </div> : null}
    </section>
  );
}
