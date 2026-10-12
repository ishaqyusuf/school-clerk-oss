"use client";
import { useRef, useState } from "react";
import { Button } from "@school-clerk/ui/button";
import { Paperclip, X } from "lucide-react";
import type { useAssistantController } from "./use-assistant-controller";
export function AssistantAttachments({
	controller: c,
}: { controller: ReturnType<typeof useAssistantController> }) {
	const fileInput = useRef<HTMLInputElement>(null);
	const [uploading, setUploading] = useState(false);
	const [names, setNames] = useState<Record<string, string>>({});
	async function upload(file: File) {
		setUploading(true);
		try {
			const conversationId =
				c.state.conversationId ?? (await c.api.assistant.create.mutate()).id;
			c.state.set({ conversationId });
			const form = new FormData();
			form.set("conversationId", conversationId);
			form.set("file", file);
			const response = await fetch("/api/assistant/attachments", {
				method: "POST",
				body: form,
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.error ?? "Upload failed");
			setNames((prev) => ({ ...prev, [data.id]: file.name }));
			c.state.set({ attachmentIds: [...c.state.attachmentIds, data.id] });
		} catch (error) {
			c.setError(error instanceof Error ? error.message : "Upload failed");
		} finally {
			setUploading(false);
			if (fileInput.current) fileInput.current.value = "";
		}
	}
	return (
		<div className="flex flex-wrap items-center gap-1">
			<input
				ref={fileInput}
				type="file"
				accept=".txt,.csv,.pdf,.png,.jpg,.jpeg"
				className="sr-only"
				aria-label="Attach a file"
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (file) void upload(file);
				}}
			/>
			<Button
				type="button"
				size="sm"
				variant="ghost"
				disabled={uploading || c.busy || c.state.attachmentIds.length >= 5}
				onClick={() => fileInput.current?.click()}
			>
				<Paperclip className="mr-1 size-4" />
				{uploading ? "Uploading…" : "Attach file"}
			</Button>
			{c.state.attachmentIds.map((id) => (
				<span
					key={id}
					className="flex max-w-full items-center gap-1 rounded border px-2 text-xs"
				>
					<span className="truncate">{names[id] ?? "Attached file"}</span>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						aria-label="Remove attachment"
						onClick={async () => {
							const response = await fetch(`/api/assistant/attachments/${id}`, {
								method: "DELETE",
							});
							if (response.ok)
								c.state.set({
									attachmentIds: c.state.attachmentIds.filter(
										(item) => item !== id,
									),
								});
							else c.setError("Attachment could not be removed.");
						}}
					>
						<X className="size-3" />
					</Button>
				</span>
			))}
		</div>
	);
}
