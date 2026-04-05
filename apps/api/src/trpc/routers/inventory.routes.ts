import { z } from "@hono/zod-openapi";
import { createTRPCRouter, publicProcedure } from "../init";

export const inventoryRouter = createTRPCRouter({
	// ── Items ───────────────────────────────────────────────────────────────────

	getItems: publicProcedure
		.input(
			z.object({
				type: z
					.enum(["SUPPLY", "TEXTBOOK", "EQUIPMENT", "UNIFORM", "OTHER"])
					.optional()
					.nullable(),
				lowStockOnly: z.boolean().optional().default(false),
			}),
		)
		.query(async ({ input, ctx }) => {
			const items = await ctx.db.inventory.findMany({
				where: {
					schoolProfileId: ctx.profile.schoolId,
					deletedAt: null,
					...(input.type ? { type: input.type } : {}),
				},
				select: {
					id: true,
					title: true,
					description: true,
					type: true,
					quantity: true,
					unitPrice: true,
					lowStockAlert: true,
					createdAt: true,
					issuances: {
						where: { deletedAt: null },
						select: { quantity: true },
					},
				},
				orderBy: { title: "asc" },
			});

			const result = items.map((item) => ({
				id: item.id,
				title: item.title,
				description: item.description,
				type: item.type,
				quantity: item.quantity,
				unitPrice: item.unitPrice,
				lowStockAlert: item.lowStockAlert,
				isLowStock: item.quantity <= item.lowStockAlert,
				totalIssued: item.issuances.reduce((s, i) => s + i.quantity, 0),
				createdAt: item.createdAt,
			}));

			if (input.lowStockOnly) {
				return result.filter((i) => i.isLowStock);
			}
			return result;
		}),

	createItem: publicProcedure
		.input(
			z.object({
				id: z.string().optional().nullable(),
				title: z.string().min(1),
				description: z.string().optional().nullable(),
				type: z
					.enum(["SUPPLY", "TEXTBOOK", "EQUIPMENT", "UNIFORM", "OTHER"])
					.default("OTHER"),
				quantity: z.number().int().min(0).default(0),
				unitPrice: z.number().min(0).default(0),
				lowStockAlert: z.number().int().min(0).default(5),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			if (input.id) {
				return ctx.db.inventory.update({
					where: {
						id: input.id,
						schoolProfileId: ctx.profile.schoolId,
					},
					data: {
						title: input.title,
						description: input.description,
						type: input.type,
						quantity: input.quantity,
						unitPrice: input.unitPrice,
						lowStockAlert: input.lowStockAlert,
					},
					select: { id: true },
				});
			}

			return ctx.db.inventory.create({
				data: {
					title: input.title,
					description: input.description,
					type: input.type,
					quantity: input.quantity,
					unitPrice: input.unitPrice,
					lowStockAlert: input.lowStockAlert,
					schoolProfileId: ctx.profile.schoolId!,
				},
				select: { id: true },
			});
		}),

	deleteItem: publicProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ input, ctx }) => {
			await ctx.db.inventory.update({
				where: {
					id: input.id,
					schoolProfileId: ctx.profile.schoolId,
				},
				data: { deletedAt: new Date() },
			});
			return { success: true };
		}),

	// ── Issuances ───────────────────────────────────────────────────────────────

	issueItem: publicProcedure
		.input(
			z.object({
				inventoryId: z.string(),
				quantity: z.number().int().positive(),
				issuedTo: z.string().optional().nullable(),
				note: z.string().optional().nullable(),
				issuedDate: z.date().optional().nullable(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const item = await ctx.db.inventory.findFirstOrThrow({
				where: {
					id: input.inventoryId,
					schoolProfileId: ctx.profile.schoolId,
					deletedAt: null,
				},
				select: { id: true, quantity: true, title: true },
			});

			if (item.quantity < input.quantity) {
				throw new Error(
					`Insufficient stock: ${item.quantity} available, ${input.quantity} requested`,
				);
			}

			await ctx.db.$transaction(async (tx) => {
				await tx.inventory.update({
					where: { id: item.id },
					data: { quantity: { decrement: input.quantity } },
				});
				await tx.inventoryIssuance.create({
					data: {
						inventoryId: item.id,
						quantity: input.quantity,
						issuedTo: input.issuedTo,
						note: input.note,
						issuedDate: input.issuedDate ?? new Date(),
						schoolProfileId: ctx.profile.schoolId!,
					},
				});
			}, { maxWait: 10000, timeout: 20000 });

			return { success: true };
		}),

	getIssuanceHistory: publicProcedure
		.input(
			z.object({
				inventoryId: z.string().optional().nullable(),
			}),
		)
		.query(async ({ input, ctx }) => {
			return ctx.db.inventoryIssuance.findMany({
				where: {
					schoolProfileId: ctx.profile.schoolId,
					deletedAt: null,
					...(input.inventoryId ? { inventoryId: input.inventoryId } : {}),
				},
				select: {
					id: true,
					quantity: true,
					issuedTo: true,
					note: true,
					issuedDate: true,
					createdAt: true,
					inventory: {
						select: { id: true, title: true, type: true },
					},
				},
				orderBy: [{ issuedDate: "desc" }, { createdAt: "desc" }],
			});
		}),
});
