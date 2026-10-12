"use client";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Button } from "@school-clerk/ui/button";
export function AssistantFiles({ conversationId }: { conversationId: string }) {
	const trpc = useTRPC();
	const files = useQuery(
		trpc.assistant.attachments.queryOptions({ conversationId }),
	);
	return (
		<div className="mt-5 space-y-2 border-t pt-3">
			<h3 className="text-sm font-medium">Conversation files</h3>
			{files.data?.map((file) => (
				<div
					key={file.id}
					className="flex items-center justify-between gap-2 text-sm"
				>
					<a
						className="truncate underline"
						href={`/api/assistant/attachments/${file.id}`}
					>
						{file.name}
					</a>
					<Button
						size="sm"
						variant="ghost"
						onClick={async () => {
							const response = await fetch(
								`/api/assistant/attachments/${file.id}`,
								{ method: "DELETE" },
							);
							if (response.ok) await files.refetch();
						}}
					>
						Remove
					</Button>
				</div>
			))}
			{!files.data?.length && (
				<p className="text-sm text-muted-foreground">
					No files stored in this conversation.
				</p>
			)}
		</div>
	);
}
