import { TRPCError } from "@trpc/server";
import { z } from "@hono/zod-openapi";
import { getCurrentUserContext } from "../../lib/notifications";
import { createTRPCRouter, publicProcedure } from "../init";

export const notificationsRouter = createTRPCRouter({
	list: publicProcedure
		.input(
			z.object({
				onlyUnread: z.boolean().default(false),
				take: z.number().int().min(1).max(100).default(50),
			}),
		)
		.query(async ({ ctx, input }) => {
			const current = await getCurrentUserContext(ctx);
			return ctx.db.notification.findMany({
				where: {
					schoolProfileId: current.school.id,
					userId: current.user.id,
					deletedAt: null,
					...(input.onlyUnread ? { isRead: false } : {}),
				},
				orderBy: { createdAt: "desc" },
				take: input.take,
			});
		}),

	unreadCount: publicProcedure.query(async ({ ctx }) => {
		const current = await getCurrentUserContext(ctx);
		return ctx.db.notification.count({
			where: {
				schoolProfileId: current.school.id,
				userId: current.user.id,
				isRead: false,
				deletedAt: null,
			},
		});
	}),

	markRead: publicProcedure
		.input(z.object({ notificationId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const current = await getCurrentUserContext(ctx);
			const notification = await ctx.db.notification.findFirst({
				where: {
					id: input.notificationId,
					schoolProfileId: current.school.id,
					userId: current.user.id,
					deletedAt: null,
				},
				select: { id: true },
			});

			if (!notification) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Notification not found.",
				});
			}

			return ctx.db.notification.update({
				where: { id: notification.id },
				data: { isRead: true },
			});
		}),

	markAllRead: publicProcedure.mutation(async ({ ctx }) => {
		const current = await getCurrentUserContext(ctx);
		return ctx.db.notification.updateMany({
			where: {
				schoolProfileId: current.school.id,
				userId: current.user.id,
				isRead: false,
				deletedAt: null,
			},
			data: { isRead: true },
		});
	}),
});
