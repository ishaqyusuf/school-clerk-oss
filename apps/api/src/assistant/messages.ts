import type { UIMessage } from "ai";
export function toUiMessages(
	messages: {
		id: string;
		role: string;
		parts: unknown;
		content: string | null;
	}[],
): UIMessage[] {
	return messages
		.filter((m) => m.role === "user" || m.role === "assistant")
		.map((message) => ({
			id: message.id,
			role: message.role as "user" | "assistant",
			parts: (Array.isArray(message.parts)
				? message.parts
				: [{ type: "text", text: message.content ?? "" }]
			).map((part) => {
				if (part.type === "tool-invocation")
					return {
						type: `tool-${part.toolName}`,
						toolCallId: part.toolCallId,
						state: part.state,
						input: part.input,
						output: part.output,
					};
				return part;
			}),
		}));
}
