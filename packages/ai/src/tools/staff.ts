import { prisma } from "@school-clerk/db";
import { tool } from "ai";
import { z } from "zod";
import type { SchoolAiToolContext, SchoolAiToolHelpers } from "./context";

export function createStaffTools(ctx: SchoolAiToolContext, helpers: SchoolAiToolHelpers) {
	const {
		finishAssistantToolExecution,
		getTeacherWorkspaceSummary,
		guardCapability,
		isConfirmedMutation,
		recordAssistantActivity,
		requiresConfirmationResult,
	} = helpers;

	return {
		searchStaffMembers: tool({
			description: "Search staff members by name, title, email, or phone.",
			inputSchema: z.object({
				query: z.string(),
			}),
			execute: async ({ query }) => {
				const guarded = await guardCapability(
					"staff.read",
					"searchStaffMembers",
					{ query },
					false,
				);
				if (guarded.blocked) return guarded.blocked;

				try {
					const staff = await prisma.staffProfile.findMany({
						where: {
							schoolProfileId: ctx.schoolId,
							OR: [
								{ name: { contains: query, mode: "insensitive" } },
								{ title: { contains: query, mode: "insensitive" } },
								{ email: { contains: query, mode: "insensitive" } },
								{ phone: { contains: query, mode: "insensitive" } },
							],
						},
						take: 8,
						orderBy: { name: "asc" },
						select: {
							id: true,
							name: true,
							title: true,
							email: true,
							phone: true,
							classRoomAttendanceList: {
								select: { id: true },
							},
							termProfiles: {
								where: {
									sessionTermId: ctx.termId ?? undefined,
									deletedAt: null,
								},
								select: {
									classroomsProfiles: { select: { id: true } },
								},
							},
						},
					});

					const output = staff.map((item) => ({
						id: item.id,
						name: item.name,
						title: item.title,
						email: item.email,
						phone: item.phone,
						attendanceSessions: item.classRoomAttendanceList.length,
						assignedClassrooms:
							item.termProfiles[0]?.classroomsProfiles.length ?? 0,
					}));

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
							error instanceof Error ? error.message : "Staff search failed",
					});
					throw error;
				}
			},
		}),

		getTeacherWorkspaceSummary: tool({
			description:
				"Get the current teacher workspace summary for the signed-in teacher.",
			inputSchema: z.object({}),
			execute: async () => {
				const guarded = await guardCapability(
					"staff.read",
					"getTeacherWorkspaceSummary",
					{},
					false,
				);
				if (guarded.blocked) return guarded.blocked;

				try {
					const workspace = await getTeacherWorkspaceSummary();
					await finishAssistantToolExecution({
						toolExecutionId: guarded.executionId,
						status: "completed",
						output: workspace,
					});
					return workspace;
				} catch (error) {
					await finishAssistantToolExecution({
						toolExecutionId: guarded.executionId,
						status: "failed",
						error:
							error instanceof Error
								? error.message
								: "Teacher workspace lookup failed",
					});
					throw error;
				}
			},
		}),
	};
}
