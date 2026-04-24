import { TRPCError } from "@trpc/server";
import { z } from "@hono/zod-openapi";
import { ensureNotificationContact } from "@school-clerk/db";
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
			const contact = await ensureNotificationContact(ctx.db, {
				displayName: current.user.name,
				role: "user",
				schoolProfileId: current.school.id,
				userId: current.user.id,
			});

			const notifications = await ctx.db.notification.findMany({
				where: {
					schoolProfileId: current.school.id,
					deletedAt: null,
					OR: [
						{
							userId: current.user.id,
							recipients: {
								none: {
									deletedAt: null,
									recipientContactId: contact.id,
								},
							},
							...(input.onlyUnread ? { isRead: false } : {}),
						},
						{
							recipients: {
								some: {
									deletedAt: null,
									recipientContactId: contact.id,
									...(input.onlyUnread
										? {
												status: "unread",
											}
										: {}),
								},
							},
						},
					],
				},
				include: {
					recipients: {
						where: {
							deletedAt: null,
							recipientContactId: contact.id,
						},
						select: {
							id: true,
							readAt: true,
							status: true,
						},
					},
				},
				orderBy: { createdAt: "desc" },
				take: input.take,
			});

			return notifications.map(({ recipients, ...notification }) => ({
				...notification,
				isRead:
					recipients[0]?.status != null
						? recipients[0].status !== "unread"
						: notification.isRead,
			}));
		}),

	unreadCount: publicProcedure.query(async ({ ctx }) => {
		const current = await getCurrentUserContext(ctx);
		const contact = await ensureNotificationContact(ctx.db, {
			displayName: current.user.name,
			role: "user",
			schoolProfileId: current.school.id,
			userId: current.user.id,
		});
		return ctx.db.notification.count({
			where: {
				schoolProfileId: current.school.id,
				deletedAt: null,
				OR: [
					{
						userId: current.user.id,
						recipients: {
							none: {
								deletedAt: null,
								recipientContactId: contact.id,
							},
						},
						isRead: false,
					},
					{
						recipients: {
							some: {
								deletedAt: null,
								recipientContactId: contact.id,
								status: "unread",
							},
						},
					},
				],
			},
		});
	}),

	markRead: publicProcedure
		.input(z.object({ notificationId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const current = await getCurrentUserContext(ctx);
			const contact = await ensureNotificationContact(ctx.db, {
				displayName: current.user.name,
				role: "user",
				schoolProfileId: current.school.id,
				userId: current.user.id,
			});
			const notification = await ctx.db.notification.findFirst({
				where: {
					id: input.notificationId,
					schoolProfileId: current.school.id,
					deletedAt: null,
					OR: [
						{
							userId: current.user.id,
						},
						{
							recipients: {
								some: {
									deletedAt: null,
									recipientContactId: contact.id,
								},
							},
						},
					],
				},
				select: {
					id: true,
					recipients: {
						where: {
							deletedAt: null,
							recipientContactId: contact.id,
						},
						select: {
							id: true,
						},
					},
				},
			});

			if (!notification) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Notification not found.",
				});
			}

			if (notification.recipients[0]) {
				await ctx.db.notificationRecipient.update({
					where: { id: notification.recipients[0].id },
					data: {
						readAt: new Date(),
						status: "read",
					},
				});

				return ctx.db.notification.findFirst({
					where: {
						id: notification.id,
					},
				});
			}

			return ctx.db.notification.update({
				where: { id: notification.id },
				data: { isRead: true },
			});
		}),

	markAllRead: publicProcedure.mutation(async ({ ctx }) => {
		const current = await getCurrentUserContext(ctx);
		const contact = await ensureNotificationContact(ctx.db, {
			displayName: current.user.name,
			role: "user",
			schoolProfileId: current.school.id,
			userId: current.user.id,
		});

		const [notifications, recipients] = await Promise.all([
			ctx.db.notification.updateMany({
				where: {
					schoolProfileId: current.school.id,
					userId: current.user.id,
					recipients: {
						none: {
							deletedAt: null,
							recipientContactId: contact.id,
						},
					},
					isRead: false,
					deletedAt: null,
				},
				data: { isRead: true },
			}),
			ctx.db.notificationRecipient.updateMany({
				where: {
					deletedAt: null,
					recipientContactId: contact.id,
					status: "unread",
				},
				data: {
					readAt: new Date(),
					status: "read",
				},
			}),
		]);

		return {
			notifications,
			recipients,
		};
	}),
});
