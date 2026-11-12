"use client";
import { useTRPC, useTRPCClient } from "@/trpc/client";
import { useQueryClient } from "@tanstack/react-query";

export let _trpc: ReturnType<typeof useTRPC> | undefined;
export let _qc: ReturnType<typeof useQueryClient> | undefined;
/** Vanilla tRPC client, for work that must outlive components (e.g. the score outbox). */
export let _trpcClient: ReturnType<typeof useTRPCClient> | undefined;

export function StaticTrpc() {
	_trpc = useTRPC();
	_qc = useQueryClient();
	_trpcClient = useTRPCClient();

	return null; // nothing to render
}
