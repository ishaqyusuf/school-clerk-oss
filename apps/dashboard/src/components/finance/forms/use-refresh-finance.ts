"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export function useRefreshFinance() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	return async () => {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.finance.overview.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.finance.getStreams.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.finance.getItems.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.finance.getInternalTransfers.queryKey({}),
			}),
		]);
	};
}
