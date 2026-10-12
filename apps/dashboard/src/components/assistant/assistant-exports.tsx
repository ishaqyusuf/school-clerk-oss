"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Button } from "@school-clerk/ui/button";
export function AssistantExports({
	conversationId,
}: { conversationId: string }) {
	const trpc = useTRPC();
	const list = useQuery(
		trpc.assistant.artifacts.queryOptions(
			{ conversationId },
			{
				refetchInterval: (query) =>
					query.state.data?.some(
						(item) => item.status === "queued" || item.status === "running",
					)
						? 3000
						: false,
			},
		),
	);
	const create = useMutation(
		trpc.assistant.export.mutationOptions({ onSuccess: () => list.refetch() }),
	);
	return (
		<div className="mt-6 space-y-3 border-t pt-4">
			<Button
				variant="outline"
				disabled={create.isPending}
				onClick={() => create.mutate({ conversationId })}
			>
				Export conversation PDF
			</Button>
			{create.error && (
				<p role="alert" className="text-sm">
					{create.error.message}
				</p>
			)}
			{list.data?.map((item) => (
				<div key={item.id} className="text-sm">
					<p>
						{item.title} · {item.status}
					</p>
					{item.error && <p className="text-muted-foreground">{item.error}</p>}
					{item.status === "ready" && (
						<a
							className="underline"
							href={`/api/assistant/artifacts/${item.id}`}
						>
							Download PDF
						</a>
					)}
				</div>
			))}
		</div>
	);
}
