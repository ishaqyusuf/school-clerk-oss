import { describe, expect, test } from "bun:test";
import { tool } from "ai";
import { z } from "zod";
import { createAssistantExecutionClient } from "./mcp";

describe("request-owned MCP execution", () => {
	test("validates arguments, crosses transport, preserves structured output and closes", async () => {
		let executions = 0;
		const execution = await createAssistantExecutionClient({
			lookup: tool({
				description: "Lookup",
				inputSchema: z.object({ id: z.string().min(1) }),
				execute: async ({ id }) => {
					executions++;
					return { status: "success", data: { id } };
				},
			}),
		});
		try {
			const result = await required(required(execution.tools.lookup).execute)(
				{ id: "record-1" },
				{ toolCallId: "test", messages: [] },
			);
			expect(result).toEqual({ status: "success", data: { id: "record-1" } });
			await expect(
				required(required(execution.tools.lookup).execute)(
					{ id: 4 },
					{ toolCallId: "bad", messages: [] },
				),
			).rejects.toThrow();
			expect(executions).toBe(1);
		} finally {
			await execution.close();
		}
	});
	test("refined mutation schemas remain enforced by MCP", async () => {
		const execution = await createAssistantExecutionClient({
			bounded: tool({
				inputSchema: z
					.object({ amount: z.number() })
					.refine((v) => v.amount > 0),
				execute: async ({ amount }) => ({ amount }),
			}),
		});
		try {
			expect(
				await required(required(execution.tools.bounded).execute)(
					{ amount: 2 },
					{ toolCallId: "valid", messages: [] },
				),
			).toEqual({ amount: 2 });
			await expect(
				required(required(execution.tools.bounded).execute)(
					{ amount: -1 },
					{ toolCallId: "invalid", messages: [] },
				),
			).rejects.toThrow();
		} finally {
			await execution.close();
		}
	});
	test("domain failure cannot be interpreted as successful tool data", async () => {
		const execution = await createAssistantExecutionClient({
			write: tool({
				inputSchema: z.object({}),
				execute: async (): Promise<string> => {
					throw new Error("Permission changed");
				},
			}),
		});
		try {
			await expect(
				required(required(execution.tools.write).execute)(
					{},
					{ toolCallId: "test", messages: [] },
				),
			).rejects.toThrow();
		} finally {
			await execution.close();
		}
	});
});

function required<T>(value: T | null | undefined): T {
	if (value == null) throw new Error("Required test fixture is missing");
	return value;
}
