import { prisma } from "@school-clerk/db";
import { classroomDisplayName } from "@school-clerk/utils";
import { tool } from "ai";
import { z } from "zod";
import {
	type SchoolAiToolContext,
	type SchoolAiToolHelpers,
	studentDisplayName,
} from "./context";

export function createStudentTools(
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
		searchStudents: tool({
			description:
				"Search for students by name. Returns matching students and current-term enrollment/payment context.",
			inputSchema: z.object({
				query: z.string().describe("Student name or partial name"),
			}),
			execute: async ({ query }) => {
				const guarded = await guardCapability(
					"students.read",
					"searchStudents",
					{ query },
					false,
				);
				if (guarded.blocked) return guarded.blocked;

				try {
					const students = await prisma.students.findMany({
						where: {
							schoolProfileId: ctx.schoolId,
							OR: [
								{ name: { contains: query, mode: "insensitive" } },
								{ surname: { contains: query, mode: "insensitive" } },
								{ otherName: { contains: query, mode: "insensitive" } },
							],
						},
						take: 8,
						orderBy: [{ name: "asc" }, { surname: "asc" }],
						select: {
							id: true,
							name: true,
							surname: true,
							otherName: true,
							termForms: {
								where: { sessionTermId: ctx.termId, deletedAt: null },
								take: 1,
								select: {
									id: true,
									classroomDepartment: {
										select: {
											departmentName: true,
											classRoom: { select: { name: true } },
										},
									},
								},
							},
						},
					});

					const output = students.map((s) => {
						const termForm = s.termForms[0] ?? null;
						const classroom = termForm?.classroomDepartment
							? classroomDisplayName({
									className: termForm.classroomDepartment.classRoom?.name,
									departmentName: termForm.classroomDepartment.departmentName,
								})
							: null;

						return {
							id: s.id,
							fullName: studentDisplayName(s, ctx.studentNameFormat),
							classroom,
							termFormId: termForm?.id ?? null,
							totalPending: 0,
							isEnrolledThisTerm: !!termForm,
						};
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
							error instanceof Error ? error.message : "Student search failed",
					});
					throw error;
				}
			},
		}),

		listClassrooms: tool({
			description: "List available classrooms for the active academic session.",
			inputSchema: z.object({}),
			execute: async () => {
				const guarded = await guardCapability(
					"students.enrollment",
					"listClassrooms",
					{},
					false,
				);
				if (guarded.blocked) return guarded.blocked;

				try {
					const departments = await prisma.classRoomDepartment.findMany({
						where: {
							deletedAt: null,
							classRoom: {
								schoolProfileId: ctx.schoolId,
								schoolSessionId: ctx.sessionId ?? undefined,
							},
						},
						select: {
							id: true,
							departmentName: true,
							departmentLevel: true,
							classRoom: {
								select: {
									id: true,
									name: true,
									classLevel: true,
									session: { select: { id: true } },
								},
							},
						},
						orderBy: [
							{ classRoom: { classLevel: "asc" } },
							{ departmentLevel: "asc" },
							{ departmentName: "asc" },
						],
					});

					const output = departments.map((department) => ({
						id: department.id,
						displayName: classroomDisplayName({
							className: department.classRoom?.name,
							departmentName: department.departmentName,
						}),
						className: department.classRoom?.name ?? null,
						streamName: department.departmentName,
						sessionId: department.classRoom?.session?.id ?? null,
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
							error instanceof Error
								? error.message
								: "Classroom lookup failed",
					});
					throw error;
				}
			},
		}),

		enrollStudent: tool({
			description:
				"Enroll a student into a classroom for the active term. Requires explicit confirmation.",
			inputSchema: z.object({
				studentId: z.string(),
				studentName: z.string(),
				classroomDepartmentId: z.string(),
				classroomName: z.string(),
				confirmationToken: z.string().optional(),
			}),
			execute: async ({
				confirmationToken,
				...actionInput
			}: {
				studentId: string;
				studentName: string;
				classroomDepartmentId: string;
				classroomName: string;
				confirmationToken?: string;
			}) => {
				const guarded = await guardCapability(
					"students.enrollment",
					"enrollStudent",
					actionInput,
					true,
				);
				if (guarded.blocked) return guarded.blocked;

				try {
					if (
						!isConfirmedMutation({
							ctx,
							toolName: "enrollStudent",
							confirmationToken,
							actionInput,
						})
					) {
						const output = requiresConfirmationResult({
							ctx,
							toolName: "enrollStudent",
							summary: `Enroll ${actionInput.studentName} into ${actionInput.classroomName}?`,
							actionInput,
						});
						await recordAssistantActivity({
							schoolId: ctx.schoolId,
							userId: ctx.userId,
							userName: ctx.userName,
							type: "assistant_action_requested",
							title: "AI enrollment confirmation requested",
							description: output.summary,
							meta: { toolName: "enrollStudent", actionInput },
						});
						await finishAssistantToolExecution({
							toolExecutionId: guarded.executionId,
							status: "blocked",
							output,
						});
						return output;
					}

					const existing = await prisma.studentTermForm.findFirst({
						where: {
							studentId: actionInput.studentId,
							sessionTermId: ctx.termId,
							deletedAt: null,
						},
						select: { id: true },
					});

					if (existing) {
						await prisma.studentTermForm.update({
							where: { id: existing.id },
							data: {
								classroomDepartmentId: actionInput.classroomDepartmentId,
							},
						});

						const output = {
							success: true,
							action: "updated",
							studentName: actionInput.studentName,
							classroomName: actionInput.classroomName,
						};
						await recordAssistantActivity({
							schoolId: ctx.schoolId,
							userId: ctx.userId,
							userName: ctx.userName,
							type: "assistant_action_completed",
							title: "AI updated student enrollment",
							description: `${actionInput.studentName} moved to ${actionInput.classroomName}.`,
							meta: { toolName: "enrollStudent", actionInput, output },
						});
						await finishAssistantToolExecution({
							toolExecutionId: guarded.executionId,
							status: "completed",
							output,
						});
						return output;
					}

					let sessionForm = await prisma.studentSessionForm.findFirst({
						where: {
							studentId: actionInput.studentId,
							schoolSessionId: ctx.sessionId ?? undefined,
							deletedAt: null,
						},
						select: { id: true },
					});

					if (!sessionForm) {
						sessionForm = await prisma.studentSessionForm.create({
							data: {
								schoolProfileId: ctx.schoolId,
								schoolSessionId: ctx.sessionId ?? undefined,
								studentId: actionInput.studentId,
								classroomDepartmentId: actionInput.classroomDepartmentId,
							},
							select: { id: true },
						});
					}

					await prisma.studentTermForm.create({
						data: {
							classroomDepartmentId: actionInput.classroomDepartmentId,
							schoolSessionId: ctx.sessionId ?? undefined,
							studentId: actionInput.studentId,
							sessionTermId: ctx.termId ?? undefined,
							schoolProfileId: ctx.schoolId,
							studentSessionFormId: sessionForm.id,
						},
					});

					const output = {
						success: true,
						action: "enrolled",
						studentName: actionInput.studentName,
						classroomName: actionInput.classroomName,
					};
					await recordAssistantActivity({
						schoolId: ctx.schoolId,
						userId: ctx.userId,
						userName: ctx.userName,
						type: "assistant_action_completed",
						title: "AI enrolled student",
						description: `${actionInput.studentName} enrolled into ${actionInput.classroomName}.`,
						meta: { toolName: "enrollStudent", actionInput, output },
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
						error: error instanceof Error ? error.message : "Enrollment failed",
					});
					throw error;
				}
			},
		}),
	};
}
