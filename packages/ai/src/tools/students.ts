import { classroomDepartmentListOrderBy, prisma } from "@school-clerk/db";
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
		completeMutation,
		consumeMutationConfirmation,
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
				"Search for students by name. Returns matching students and current-term enrollment context. Balances require the separate finance tool.",
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
							totalPending: null,
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
						orderBy: classroomDepartmentListOrderBy,
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
						!(await isConfirmedMutation({
							ctx,
							toolName: "enrollStudent",
							confirmationToken,
							actionInput,
						}))
					) {
						const output = await requiresConfirmationResult({
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

					const { termId, sessionId } = ctx;
					if (!termId || !sessionId) throw new Error("Select a school session and term before enrolling a student.");
					const output = await prisma.$transaction(async (tx) => {
						await consumeMutationConfirmation(tx, { toolName: "enrollStudent", confirmationToken, actionInput });
						const [student, classroom, term] = await Promise.all([
							tx.students.findFirst({
								where: { id: actionInput.studentId, schoolProfileId: ctx.schoolId, deletedAt: null },
								select: { id: true },
							}),
							tx.classRoomDepartment.findFirst({
								where: { id: actionInput.classroomDepartmentId, schoolProfileId: ctx.schoolId, deletedAt: null,
									classRoom: { schoolProfileId: ctx.schoolId, schoolSessionId: sessionId, deletedAt: null } },
								select: { id: true },
							}),
							tx.sessionTerm.findFirst({
								where: { id: termId, sessionId, schoolId: ctx.schoolId, deletedAt: null },
								select: { id: true },
							}),
						]);
						if (!student || !classroom || !term) throw new Error("The student, classroom or term is unavailable in this workspace.");
						const existing = await tx.studentTermForm.findFirst({
							where: {
								studentId: student.id, schoolProfileId: ctx.schoolId,
								schoolSessionId: sessionId, sessionTermId: termId, deletedAt: null,
							},
							select: { id: true },
						});
						if (existing) {
							await tx.studentTermForm.update({
								where: { id: existing.id, schoolProfileId: ctx.schoolId, deletedAt: null },
								data: { classroomDepartmentId: classroom.id },
							});
						} else {
							let sessionForm = await tx.studentSessionForm.findFirst({
								where: { studentId: student.id, schoolProfileId: ctx.schoolId, schoolSessionId: sessionId, deletedAt: null },
								select: { id: true },
							});
							if (!sessionForm) {
								sessionForm = await tx.studentSessionForm.create({
									data: {
										schoolProfileId: ctx.schoolId, schoolSessionId: sessionId,
										studentId: student.id, classroomDepartmentId: classroom.id,
									},
									select: { id: true },
								});
							}
							await tx.studentTermForm.create({
								data: {
									classroomDepartmentId: classroom.id, schoolSessionId: sessionId,
									studentId: student.id, sessionTermId: termId, schoolProfileId: ctx.schoolId,
									studentSessionFormId: sessionForm.id, admissionType: "RETURNING",
								},
							});
						}
						return completeMutation(tx, {
							executionId: guarded.executionId, toolName: "enrollStudent",
							title: existing ? "AI updated student enrollment" : "AI enrolled student",
							description: `${actionInput.studentName} enrolled into ${actionInput.classroomName}.`,
							output: { success: true, action: existing ? "updated" : "enrolled",
								studentId: student.id, studentName: actionInput.studentName,
								classroomDepartmentId: classroom.id, classroomName: actionInput.classroomName },
						});
					}, { isolationLevel: "Serializable" });
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
