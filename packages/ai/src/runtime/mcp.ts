import { createMCPClient } from "@ai-sdk/mcp";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolSet } from "ai";

export async function createAssistantExecutionClient(tools: ToolSet) {
	const server = new McpServer({
		name: "school-clerk-assistant",
		version: "2.0.0",
	});
	const register = server.registerTool.bind(server) as unknown as (
		name: string,
		config: { description?: string; inputSchema: unknown },
		handler: (
			input: Record<string, unknown>,
			extra: { signal: AbortSignal; requestId?: string | number },
		) => Promise<{ content: { type: "text"; text: string }[] }>,
	) => unknown;
	for (const [name, definition] of Object.entries(tools)) {
		const execute = definition.execute;
		if (!execute) continue;
		register(
			name,
			{
				description: definition.description,
				inputSchema: definition.inputSchema,
			},
			async (input, extra) => {
				const result = await execute(input, {
					toolCallId: extra.requestId?.toString() ?? crypto.randomUUID(),
					messages: [],
					abortSignal: extra.signal,
				});
				return {
					content: [{ type: "text" as const, text: JSON.stringify(result) }],
				};
			},
		);
	}
	const [clientTransport, serverTransport] =
		InMemoryTransport.createLinkedPair();
	await server.connect(serverTransport);
	try {
		const client = await createMCPClient({ transport: clientTransport });
		const remote = await client.tools();
		// Keep typed UI results while every execution crosses the request-owned MCP client.
		const executable: ToolSet = {};
		for (const [name, definition] of Object.entries(tools))
			executable[name] = {
				...definition,
				execute: async (input, options) => {
					const result = (await remote[name]?.execute?.(
						input as never,
						options,
					)) as {
						isError?: boolean;
						content?: { type: string; text?: string }[];
					};
					if (result?.isError)
						throw new Error(
							"Tool could not complete. Review current access and records.",
						);
					const text = result?.content?.find(
						(part) => part.type === "text",
					)?.text;
					if (!text) throw new Error("Tool returned no result");
					return JSON.parse(text);
				},
			};
		return {
			tools: executable,
			close: async () => {
				await client.close();
				await server.close();
			},
		};
	} catch (error) {
		await server.close();
		throw error;
	}
}
