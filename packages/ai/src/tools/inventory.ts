import { prisma } from "@school-clerk/db";
import { tool } from "ai";
import { z } from "zod";
import type { SchoolAiToolContext, SchoolAiToolHelpers } from "./context";

type AssistantInventoryItem = {
	id: string;
	title: string;
	description?: string | null;
	type?: string | null;
	quantity: number;
	unitPrice: number;
	lowStockAlert: number;
	issuances: { quantity: number }[];
};

type AssistantInventoryModel = {
	findMany(args: unknown): Promise<AssistantInventoryItem[]>;
	create(args: unknown): Promise<{
		id: string;
		title: string;
		quantity: number;
		unitPrice: number;
		type: string;
	}>;
	findFirstOrThrow(args: unknown): Promise<{ id: string; quantity: number }>;
	update(args: unknown): Promise<unknown>;
};

type AssistantInventoryIssuanceModel = {
	create(args: unknown): Promise<unknown>;
};

const inventoryModel = prisma.inventory as unknown as AssistantInventoryModel;

export function createInventoryTools(ctx: SchoolAiToolContext, helpers: SchoolAiToolHelpers) {
	const {
		finishAssistantToolExecution,
		getTeacherWorkspaceSummary,
		guardCapability,
		isConfirmedMutation,
		recordAssistantActivity,
		requiresConfirmationResult,
	} = helpers;

	return {
		searchInventoryItems: tool({
			description:
				"Search inventory items such as books, supplies, equipment, and uniforms.",
			inputSchema: z.object({
				query: z.string(),
				type: z
					.enum(["SUPPLY", "TEXTBOOK", "EQUIPMENT", "UNIFORM", "OTHER"])
					.optional(),
				lowStockOnly: z.boolean().optional().default(false),
			}),
			execute: async ({ query, type, lowStockOnly }) => {
				const guarded = await guardCapability(
					"inventory.read",
					"searchInventoryItems",
					{ query, type, lowStockOnly },
					false,
				);
				if (guarded.blocked) return guarded.blocked;

				try {
					const items = await inventoryModel.findMany({
						where: {
							schoolProfileId: ctx.schoolId,
							...(type ? { type } : {}),
							...(query
								? { title: { contains: query, mode: "insensitive" } }
								: {}),
						},
						select: {
							id: true,
							title: true,
							description: true,
							type: true,
							quantity: true,
							unitPrice: true,
							lowStockAlert: true,
							issuances: {
								where: { deletedAt: null },
								select: { quantity: true },
							},
						},
						orderBy: { title: "asc" },
						take: 10,
					});

					const output = items
						.map((item) => ({
							id: item.id,
							title: item.title,
							description: item.description,
							type: item.type,
							quantity: item.quantity,
							unitPrice: item.unitPrice,
							isLowStock: item.quantity <= item.lowStockAlert,
							totalIssued: item.issuances.reduce(
								(sum, issuance) => sum + issuance.quantity,
								0,
							),
						}))
						.filter((item) => (lowStockOnly ? item.isLowStock : true));

					await finishAssistantToolExecution({
						toolExecutionId: guarded.executionId,
						status: "completed",
						output,
					});
					return output;
				} catch (error) {
					await finishAssistantToolExecution({
						toolExecutionId: guarded.executionId,
						status: "failed",
						error:
							error instanceof Error
								? error.message
								: "Inventory search failed",
					});
					throw error;
				}
			},
		}),

		createInventoryItem: tool({
			description:
				"Create a new inventory item. Requires explicit confirmation.",
			inputSchema: z.object({
				title: z.string(),
				type: z
					.enum(["SUPPLY", "TEXTBOOK", "EQUIPMENT", "UNIFORM", "OTHER"])
					.default("OTHER"),
				quantity: z.number().int().min(0).default(1),
				unitPrice: z.number().min(0).default(0),
				description: z.string().optional(),
				confirmationToken: z.string().optional(),
			}),
			execute: async ({
				confirmationToken,
				...actionInput
			}: {
				title: string;
				type: "SUPPLY" | "TEXTBOOK" | "EQUIPMENT" | "UNIFORM" | "OTHER";
				quantity: number;
				unitPrice: number;
				description?: string;
				confirmationToken?: string;
			}) => {
				const guarded = await guardCapability(
					"inventory.write",
					"createInventoryItem",
					actionInput,
					true,
				);
				if (guarded.blocked) return guarded.blocked;

				try {
					if (
						!isConfirmedMutation({
							ctx,
							toolName: "createInventoryItem",
							confirmationToken,
							actionInput,
						})
					) {
						const output = requiresConfirmationResult({
							ctx,
							toolName: "createInventoryItem",
							summary: `Create inventory item ${actionInput.title} with quantity ${actionInput.quantity}?`,
							actionInput,
						});
						await recordAssistantActivity({
							schoolId: ctx.schoolId,
							userId: ctx.userId,
							userName: ctx.userName,
							type: "assistant_action_requested",
							title: "AI inventory creation confirmation requested",
							description: output.summary,
							meta: { toolName: "createInventoryItem", actionInput },
						});
						await finishAssistantToolExecution({
							toolExecutionId: guarded.executionId,
							status: "blocked",
							output,
						});
						return output;
					}

					const item = await inventoryModel.create({
						data: {
							title: actionInput.title,
							type: actionInput.type,
							quantity: actionInput.quantity,
							unitPrice: actionInput.unitPrice,
							description: actionInput.description ?? null,
							schoolProfileId: ctx.schoolId,
							lowStockAlert: 5,
						},
						select: {
							id: true,
							title: true,
							quantity: true,
							unitPrice: true,
							type: true,
						},
					});

					const output = { ...item, created: true };
					await recordAssistantActivity({
						schoolId: ctx.schoolId,
						userId: ctx.userId,
						userName: ctx.userName,
						type: "assistant_action_completed",
						title: "AI created inventory item",
						description: `${actionInput.title} was created in inventory.`,
						meta: { toolName: "createInventoryItem", actionInput, output },
					});
					await finishAssistantToolExecution({
						toolExecutionId: guarded.executionId,
						status: "completed",
						output,
					});
					return output;
				} catch (error) {
					await finishAssistantToolExecution({
						toolExecutionId: guarded.executionId,
						status: "failed",
						error:
							error instanceof Error
								? error.message
								: "Inventory creation failed",
					});
					throw error;
				}
			},
		}),

		recordInventoryIssuance: tool({
			description:
				"Record that an inventory item was issued. Requires explicit confirmation.",
			inputSchema: z.object({
				inventoryId: z.string(),
				itemTitle: z.string(),
				quantity: z.number().int().positive().default(1),
				issuedTo: z.string().optional(),
				note: z.string().optional(),
				confirmationToken: z.string().optional(),
			}),
			execute: async ({
				confirmationToken,
				...actionInput
			}: {
				inventoryId: string;
				itemTitle: string;
				quantity: number;
				issuedTo?: string;
				note?: string;
				confirmationToken?: string;
			}) => {
				const guarded = await guardCapability(
					"inventory.write",
					"recordInventoryIssuance",
					actionInput,
					true,
				);
				if (guarded.blocked) return guarded.blocked;

				try {
					if (
						!isConfirmedMutation({
							ctx,
							toolName: "recordInventoryIssuance",
							confirmationToken,
							actionInput,
						})
					) {
						const output = requiresConfirmationResult({
							ctx,
							toolName: "recordInventoryIssuance",
							summary: `Issue ${actionInput.quantity} x ${actionInput.itemTitle}?`,
							actionInput,
						});
						await recordAssistantActivity({
							schoolId: ctx.schoolId,
							userId: ctx.userId,
							userName: ctx.userName,
							type: "assistant_action_requested",
							title: "AI inventory issuance confirmation requested",
							description: output.summary,
							meta: { toolName: "recordInventoryIssuance", actionInput },
						});
						await finishAssistantToolExecution({
							toolExecutionId: guarded.executionId,
							status: "blocked",
							output,
						});
						return output;
					}

					const item = await inventoryModel.findFirstOrThrow({
						where: {
							id: actionInput.inventoryId,
							schoolProfileId: ctx.schoolId,
							deletedAt: null,
						},
						select: { id: true, quantity: true },
					});

					if (item.quantity < actionInput.quantity) {
						const output = {
							blocked: true,
							toolName: "recordInventoryIssuance",
							message: `Not enough stock. Available: ${item.quantity}, requested: ${actionInput.quantity}.`,
						};
						await recordAssistantActivity({
							schoolId: ctx.schoolId,
							userId: ctx.userId,
							userName: ctx.userName,
							type: "assistant_action_blocked",
							title: "AI inventory issuance blocked",
							description: output.message,
							meta: { toolName: "recordInventoryIssuance", actionInput },
						});
						await finishAssistantToolExecution({
							toolExecutionId: guarded.executionId,
							status: "blocked",
							output,
						});
						return output;
					}

					await prisma.$transaction(async (tx) => {
						const txInventory =
							tx.inventory as unknown as AssistantInventoryModel;
						const txInventoryIssuance =
							tx.inventoryIssuance as unknown as AssistantInventoryIssuanceModel;

						await txInventoryIssuance.create({
							data: {
								inventoryId: actionInput.inventoryId,
								quantity: actionInput.quantity,
								issuedTo: actionInput.issuedTo ?? null,
								note: actionInput.note ?? null,
								issuedDate: new Date(),
								schoolProfileId: ctx.schoolId,
							},
						});

						await txInventory.update({
							where: { id: actionInput.inventoryId },
							data: { quantity: { decrement: actionInput.quantity } },
						});
					});

					const output = { success: true, ...actionInput };
					await recordAssistantActivity({
						schoolId: ctx.schoolId,
						userId: ctx.userId,
						userName: ctx.userName,
						type: "assistant_action_completed",
						title: "AI recorded inventory issuance",
						description: `${actionInput.quantity} x ${actionInput.itemTitle} issued.`,
						meta: { toolName: "recordInventoryIssuance", actionInput, output },
					});
					await finishAssistantToolExecution({
						toolExecutionId: guarded.executionId,
						status: "completed",
						output,
					});
					return output;
				} catch (error) {
					await finishAssistantToolExecution({
						toolExecutionId: guarded.executionId,
						status: "failed",
						error:
							error instanceof Error
								? error.message
								: "Inventory issuance failed",
					});
					throw error;
				}
			},
		}),
	};
}
