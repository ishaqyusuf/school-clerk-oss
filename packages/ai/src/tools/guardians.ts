import { prisma } from "@school-clerk/db";
import { tool } from "ai";
import { z } from "zod";
import {
	type SchoolAiToolContext,
	type SchoolAiToolHelpers,
	studentDisplayName,
} from "./context";

export function createGuardianTools(
	ctx: SchoolAiToolContext,
	helpers: SchoolAiToolHelpers,
) {
	const {
		finishAssistantToolExecution,
		getTeacherWorkspaceSummary,
		guardCapability,
		isConfirmedMutation,
		recordAssistantActivity,
		requiresConfirmationResult,
	} = helpers;

	return {
		searchGuardians: tool({
			description: "Search guardians/parents by name or phone number.",
			inputSchema: z.object({
				query: z.string(),
			}),
			execute: async ({ query }) => {
				const guarded = await guardCapability(
					"parents.read",
					"searchGuardians",
					{ query },
					false,
				);
				if (guarded.blocked) return guarded.blocked;

				try {
					const guardians = await prisma.guardians.findMany({
						where: {
							schoolProfileId: ctx.schoolId,
							OR: [
								{ name: { contains: query, mode: "insensitive" } },
								{ phone: { contains: query, mode: "insensitive" } },
								{ phone2: { contains: query, mode: "insensitive" } },
							],
						},
						take: 10,
						orderBy: { name: "asc" },
						select: {
							id: true,
							name: true,
							phone: true,
							phone2: true,
							wards: {
								select: {
									relation: true,
									student: {
										select: {
											id: true,
											name: true,
											surname: true,
											otherName: true,
										},
									},
								},
							},
						},
					});

					const output = guardians.map((guardian) => ({
						id: guardian.id,
						name: guardian.name,
						phone: guardian.phone,
						phone2: guardian.phone2,
						wards: guardian.wards.map((ward) => ({
							relation: ward.relation,
							studentId: ward.student?.id ?? null,
							studentName: ward.student
								? studentDisplayName(ward.student, ctx.studentNameFormat)
								: null,
						})),
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
							error instanceof Error ? error.message : "Guardian search failed",
					});
					throw error;
				}
			},
		}),
	};
}
