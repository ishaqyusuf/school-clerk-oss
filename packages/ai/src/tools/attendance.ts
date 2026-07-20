import { prisma } from "@school-clerk/db";
import { classroomDisplayName } from "@school-clerk/utils";
import { tool } from "ai";
import { z } from "zod";
import {
	type SchoolAiToolContext,
	type SchoolAiToolHelpers,
	studentDisplayName,
} from "./context";

export function createAttendanceTools(
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
		getStudentAttendanceHistory: tool({
			description:
				"Get recent attendance history for a student in the active term.",
			inputSchema: z.object({
				studentId: z.string(),
			}),
			execute: async ({ studentId }) => {
				const guarded = await guardCapability(
					"attendance.read",
					"getStudentAttendanceHistory",
					{ studentId },
					false,
				);
				if (guarded.blocked) return guarded.blocked;

				try {
					const student = await prisma.students.findFirst({
						where: { id: studentId, schoolProfileId: ctx.schoolId },
						select: {
							id: true,
							name: true,
							surname: true,
							otherName: true,
							termForms: {
								where: { sessionTermId: ctx.termId ?? undefined },
								take: 1,
								select: {
									id: true,
									attendanceList: {
										take: 12,
										orderBy: { createdAt: "desc" },
										select: {
											id: true,
											isPresent: true,
											comment: true,
											createdAt: true,
											classroomAttendance: {
												select: { attendanceTitle: true },
											},
											department: {
												select: {
													departmentName: true,
													classRoom: { select: { name: true } },
												},
											},
										},
									},
								},
							},
						},
					});

					const termForm = student?.termForms[0];
					const output = {
						studentId,
						studentName: student
							? studentDisplayName(student, ctx.studentNameFormat)
							: "Student",
						records:
							termForm?.attendanceList.map((record) => ({
								id: record.id,
								isPresent: record.isPresent,
								comment: record.comment,
								createdAt: record.createdAt,
								attendanceTitle:
									record.classroomAttendance?.attendanceTitle ?? null,
								classroom: classroomDisplayName({
									className: record.department?.classRoom?.name,
									departmentName: record.department?.departmentName,
								}),
							})) ?? [],
					};

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
								: "Attendance history lookup failed",
					});
					throw error;
				}
			},
		}),
	};
}
