import { createHash, randomUUID } from "node:crypto";
import { assertAcademicTermWritable } from "@api/db/queries/academic-term-setup";
import {
	assertTeacherCanAccessClassroomDepartment,
	assertTeacherCanAccessDepartmentSubject,
	getTeacherAcademicAccess,
} from "@api/lib/teacher-authorization";
import { z } from "@hono/zod-openapi";
import { classroomDisplayName, formatStudentName } from "@school-clerk/utils";
import { TRPCError } from "@trpc/server";
import {
	type TRPCContext,
	authenticatedProcedure,
	createTRPCRouter,
} from "../init";

const ATTENDANCE_READ_ROLES = new Set([
	"ADMIN",
	"Admin",
	"Registrar",
	"Teacher",
]);
const ATTENDANCE_WRITE_ROLES = new Set(["ADMIN", "Admin", "Teacher"]);
const attendanceScopeSchema = z.enum(["GENERAL", "SUBJECT"]);
const attendanceStatusSchema = z.enum([
	"PRESENT",
	"ABSENT",
	"LATE",
	"EXCUSED",
	"SICK",
	"LEAVE",
]);

function assertAttendanceRole(ctx: TRPCContext, access: "read" | "write") {
	const role = ctx.currentUser?.role;
	const allowedRoles =
		access === "write" ? ATTENDANCE_WRITE_ROLES : ATTENDANCE_READ_ROLES;

	if (!role || !allowedRoles.has(role)) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message:
				access === "write"
					? "Only administrators and assigned teachers can change attendance."
					: "You do not have permission to view attendance.",
		});
	}
}

const takeAttendanceSchema = z
	.object({
		departmentId: z.string(),
		departmentSubjectId: z.string().optional().nullable(),
		attendanceTitle: z.string().trim().min(1),
		attendanceDate: z.string().date().optional(),
		scope: attendanceScopeSchema.default("GENERAL"),
		periodLabel: z.string().trim().max(100).optional().nullable(),
		idempotencyKey: z.string().trim().min(1).max(200).optional(),
		students: z
			.array(
				z
					.object({
						studentTermFormId: z.string(),
						status: attendanceStatusSchema.optional(),
						isPresent: z.boolean().optional(),
						comment: z.string().optional().nullable(),
					})
					.refine(
						(student) =>
							student.status !== undefined || student.isPresent !== undefined,
						{
							message: "Select an attendance status for every student.",
						},
					),
			)
			.min(1),
	})
	.superRefine((input, ctx) => {
		if (input.scope === "SUBJECT" && !input.departmentSubjectId) {
			ctx.addIssue({
				code: "custom",
				message: "Select a subject for subject attendance.",
				path: ["departmentSubjectId"],
			});
		}
		if (input.scope === "GENERAL" && input.departmentSubjectId) {
			ctx.addIssue({
				code: "custom",
				message: "General attendance cannot be linked to a subject.",
				path: ["departmentSubjectId"],
			});
		}
	});
const updateAttendanceSessionSchema = z.intersection(
	takeAttendanceSchema,
	z.object({
		attendanceId: z.string(),
	}),
);

function resolveAttendanceStatus(input: {
	status?: z.infer<typeof attendanceStatusSchema>;
	isPresent?: boolean;
}) {
	return input.status ?? (input.isPresent ? "PRESENT" : "ABSENT");
}

function isPresentStatus(status: z.infer<typeof attendanceStatusSchema>) {
	return status === "PRESENT" || status === "LATE";
}

function attendanceStatusFromRecord(record: {
	isPresent?: boolean | null;
	status?: z.infer<typeof attendanceStatusSchema> | null;
}) {
	return record.status ?? (record.isPresent ? "PRESENT" : "ABSENT");
}

function attendanceDateFromInput(value?: string) {
	const date = new Date(
		`${value ?? new Date().toISOString().slice(0, 10)}T00:00:00.000Z`,
	);
	if (Number.isNaN(date.getTime())) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Enter a valid attendance date.",
		});
	}
	return date;
}

function activeTermAttendanceFilter(sessionTermId?: string | null) {
	if (!sessionTermId) {
		return {
			sessionTermId: "__missing-active-term__",
		};
	}

	return {
		OR: [
			{ sessionTermId },
			{
				sessionTermId: null,
				studentAttendanceList: {
					some: {
						deletedAt: null,
						StudentTermForm: {
							is: {
								deletedAt: null,
								sessionTermId,
							},
						},
					},
				},
			},
		],
	};
}

function attendanceDateRangeFilter(from?: Date, to?: Date) {
	if (!from && !to) return {};
	const range = {
		...(from ? { gte: from } : {}),
		...(to ? { lte: to } : {}),
	};
	const legacyRange = {
		...(from ? { gte: from } : {}),
		...(to
			? {
					lt: new Date(to.getTime() + 24 * 60 * 60 * 1000),
				}
			: {}),
	};

	return {
		OR: [
			{ attendanceDate: range },
			{
				attendanceDate: null,
				createdAt: legacyRange,
			},
		],
	};
}

function buildAttendanceDedupeKey(input: {
	attendanceDate: Date;
	departmentId: string;
	departmentSubjectId?: string | null;
	periodLabel?: string | null;
	scope: z.infer<typeof attendanceScopeSchema>;
	sessionTermId: string;
}) {
	const date = input.attendanceDate.toISOString().slice(0, 10);
	const period = input.periodLabel?.trim().toLocaleLowerCase() || "default";
	const subject =
		input.scope === "SUBJECT"
			? (input.departmentSubjectId ?? "missing-subject")
			: "general";

	return [
		input.sessionTermId,
		input.departmentId,
		date,
		input.scope,
		subject,
		period,
	].join(":");
}

type AttendanceWriteInput = z.infer<typeof takeAttendanceSchema>;

function buildAttendancePayloadHash(
	input: AttendanceWriteInput,
	resolved: {
		attendanceDate: Date;
		activeTermId: string;
	},
) {
	const students = input.students
		.map((student) => ({
			comment: student.comment?.trim() || null,
			status: resolveAttendanceStatus(student),
			studentTermFormId: student.studentTermFormId,
		}))
		.sort((left, right) =>
			left.studentTermFormId.localeCompare(right.studentTermFormId),
		);

	return createHash("sha256")
		.update(
			JSON.stringify({
				attendanceDate: resolved.attendanceDate.toISOString(),
				attendanceTitle: input.attendanceTitle,
				departmentId: input.departmentId,
				departmentSubjectId: input.departmentSubjectId ?? null,
				periodLabel: input.periodLabel?.trim() || null,
				scope: input.scope,
				sessionTermId: resolved.activeTermId,
				students,
			}),
		)
		.digest("hex");
}

function attendanceStudentRows(
	input: AttendanceWriteInput,
	schoolProfileId: string,
) {
	return input.students.map((student) => {
		const status = resolveAttendanceStatus(student);
		return {
			comment: student.comment,
			departmentId: input.departmentId,
			isPresent: isPresentStatus(status),
			schoolProfileId,
			status,
			studentTermFormId: student.studentTermFormId,
		};
	});
}

async function resolveAttendanceWrite(
	ctx: TRPCContext,
	input: AttendanceWriteInput,
	options: {
		ignoreAttendanceId?: string;
	} = {},
) {
	await assertTeacherCanAccessClassroomDepartment(ctx, input.departmentId);
	const schoolProfileId = ctx.profile.schoolId;
	const activeTermId = ctx.profile.termId;
	if (!schoolProfileId || !activeTermId) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Select a school and academic term before taking attendance.",
		});
	}

	if (input.departmentSubjectId) {
		const departmentSubject = await ctx.db.departmentSubject.findFirst({
			where: {
				id: input.departmentSubjectId,
				classRoomDepartmentId: input.departmentId,
				sessionTermId: activeTermId,
				deletedAt: null,
				classRoomDepartment: {
					schoolProfileId,
					deletedAt: null,
				},
			},
			select: {
				id: true,
			},
		});
		if (!departmentSubject) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message:
					"The selected subject is not available in this classroom term.",
			});
		}
		await assertTeacherCanAccessDepartmentSubject(
			ctx,
			input.departmentSubjectId,
			activeTermId,
		);
	}

	const studentTermFormIds = input.students.map(
		(student) => student.studentTermFormId,
	);
	if (new Set(studentTermFormIds).size !== studentTermFormIds.length) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Each student can appear only once in an attendance session.",
		});
	}
	const rosterStudentForms = await ctx.db.studentTermForm.findMany({
		where: {
			classroomDepartmentId: input.departmentId,
			deletedAt: null,
			schoolProfileId,
			sessionTermId: activeTermId,
			student: {
				deletedAt: null,
			},
		},
		select: {
			id: true,
			sessionTermId: true,
			schoolProfileId: true,
		},
	});

	const selectedStudentTermFormIds = new Set(studentTermFormIds);
	if (
		rosterStudentForms.length !== studentTermFormIds.length ||
		rosterStudentForms.some(
			(studentTermForm) => !selectedStudentTermFormIds.has(studentTermForm.id),
		)
	) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message:
				"Select an attendance status for every student in the active classroom roster.",
		});
	}

	await assertAcademicTermWritable(ctx, activeTermId);
	const attendanceDate = attendanceDateFromInput(input.attendanceDate);
	const dedupeKey = buildAttendanceDedupeKey({
		attendanceDate,
		departmentId: input.departmentId,
		departmentSubjectId: input.departmentSubjectId,
		periodLabel: input.periodLabel,
		scope: input.scope,
		sessionTermId: activeTermId,
	});
	const duplicate = await ctx.db.classRoomAttendance.findFirst({
		where: {
			schoolProfileId,
			dedupeKey,
			deletedAt: null,
			...(options.ignoreAttendanceId
				? {
						id: {
							not: options.ignoreAttendanceId,
						},
					}
				: {}),
		},
		select: { id: true },
	});
	if (duplicate) {
		throw new TRPCError({
			code: "CONFLICT",
			message:
				"Attendance has already been recorded for this classroom, date, scope, and period.",
		});
	}

	const staffProfile = ctx.currentUser?.email
		? await ctx.db.staffProfile.findFirst({
				where: {
					schoolProfileId,
					email: {
						equals: ctx.currentUser.email,
						mode: "insensitive",
					},
					deletedAt: null,
				},
				select: {
					id: true,
				},
			})
		: null;

	return {
		activeTermId,
		attendanceDate,
		dedupeKey,
		schoolProfileId,
		staffProfileId: staffProfile?.id ?? null,
		studentRows: attendanceStudentRows(input, schoolProfileId),
	};
}

function attendanceAuditSnapshot(value: unknown) {
	return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function isPrismaUniqueConflict(error: unknown) {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		error.code === "P2002"
	);
}

function summarizeAttendanceStatuses(
	statuses: Array<z.infer<typeof attendanceStatusSchema>>,
) {
	const count = (status: z.infer<typeof attendanceStatusSchema>) =>
		statuses.filter((value) => value === status).length;
	const present = count("PRESENT");
	const late = count("LATE");
	const excused = count("EXCUSED");
	const sick = count("SICK");
	const leave = count("LEAVE");
	const eligible = Math.max(statuses.length - excused - sick - leave, 0);

	return {
		total: statuses.length,
		present,
		absent: count("ABSENT"),
		late,
		excused,
		sick,
		leave,
		attendanceRate:
			eligible > 0 ? Math.round(((present + late) / eligible) * 1000) / 10 : 0,
	};
}

async function recordAttendanceActivity(
	ctx: TRPCContext,
	input: {
		attendanceId: string;
		departmentId?: string | null;
		type: "attendance_created" | "attendance_updated" | "attendance_deleted";
	},
) {
	try {
		await ctx.db.activity.create({
			data: {
				author: ctx.currentUser?.name ?? "School Clerk user",
				description: `Attendance session ${input.type.replace("attendance_", "")}.`,
				meta: {
					attendanceId: input.attendanceId,
					departmentId: input.departmentId ?? null,
					sessionTermId: ctx.profile.termId ?? null,
				},
				schoolProfileId: ctx.profile.schoolId,
				source: "user",
				title: "Attendance",
				type: input.type,
				userId: ctx.currentUser?.id ?? "attendance-system",
			},
		});
	} catch (error) {
		console.error("[attendance] activity log failed", error);
	}
}

export const attendanceRouter = createTRPCRouter({
	getAttendanceOptions: authenticatedProcedure
		.input(z.object({ departmentId: z.string() }))
		.query(async ({ input, ctx }) => {
			assertAttendanceRole(ctx, "write");
			await assertTeacherCanAccessClassroomDepartment(ctx, input.departmentId);
			const teacherAccess = await getTeacherAcademicAccess(ctx);
			const department = await ctx.db.classRoomDepartment.findFirst({
				where: {
					id: input.departmentId,
					deletedAt: null,
					schoolProfileId: ctx.profile.schoolId,
					classRoom: {
						deletedAt: null,
						schoolSessionId: ctx.profile.sessionId,
					},
				},
				select: {
					id: true,
					subjects: {
						where: {
							deletedAt: null,
							sessionTermId: ctx.profile.termId,
							...(teacherAccess
								? {
										id: {
											in: teacherAccess.departmentSubjectIds,
										},
									}
								: {}),
						},
						orderBy: {
							subject: {
								title: "asc",
							},
						},
						select: {
							id: true,
							subject: {
								select: {
									title: true,
								},
							},
						},
					},
				},
			});
			if (!department) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Classroom was not found in the active school session.",
				});
			}

			return {
				departmentId: department.id,
				subjects: department.subjects.map((item) => ({
					id: item.id,
					title: item.subject.title,
				})),
			};
		}),

	getClassroomAttendance: authenticatedProcedure
		.input(z.object({ departmentId: z.string() }))
		.query(async ({ input, ctx }) => {
			assertAttendanceRole(ctx, "read");
			await assertTeacherCanAccessClassroomDepartment(ctx, input.departmentId);

			const records = await ctx.db.classRoomAttendance.findMany({
				where: {
					AND: [activeTermAttendanceFilter(ctx.profile.termId)],
					departmentId: input.departmentId,
					schoolProfileId: ctx.profile.schoolId,
					deletedAt: null,
				},
				select: {
					id: true,
					departmentId: true,
					attendanceTitle: true,
					attendanceDate: true,
					scope: true,
					periodLabel: true,
					createdAt: true,
					departmentSubject: {
						select: {
							id: true,
							subject: {
								select: {
									title: true,
								},
							},
						},
					},
					staffProfile: {
						select: {
							id: true,
							name: true,
						},
					},
					studentAttendanceList: {
						where: {
							deletedAt: null,
						},
						select: {
							isPresent: true,
							status: true,
						},
					},
				},
				orderBy: { createdAt: "desc" },
			});
			return records.map((record) => {
				const statuses = record.studentAttendanceList.map(
					attendanceStatusFromRecord,
				);
				const count = (status: z.infer<typeof attendanceStatusSchema>) =>
					statuses.filter((value) => value === status).length;

				return {
					id: record.id,
					attendanceTitle: record.attendanceTitle,
					attendanceDate: record.attendanceDate ?? record.createdAt,
					createdAt: record.createdAt,
					scope: record.scope ?? "GENERAL",
					periodLabel: record.periodLabel ?? null,
					departmentSubjectId: record.departmentSubject?.id ?? null,
					subjectTitle: record.departmentSubject?.subject.title ?? null,
					staffName: record.staffProfile?.name ?? null,
					total: statuses.length,
					present: count("PRESENT"),
					absent: count("ABSENT"),
					late: count("LATE"),
					excused: count("EXCUSED"),
					sick: count("SICK"),
					leave: count("LEAVE"),
				};
			});
		}),

	getAttendanceReport: authenticatedProcedure
		.input(
			z.object({
				departmentId: z.string(),
				departmentSubjectId: z.string().optional().nullable(),
				from: z.string().date().optional(),
				to: z.string().date().optional(),
			}),
		)
		.query(async ({ input, ctx }) => {
			assertAttendanceRole(ctx, "read");
			await assertTeacherCanAccessClassroomDepartment(ctx, input.departmentId);
			if (input.departmentSubjectId) {
				await assertTeacherCanAccessDepartmentSubject(
					ctx,
					input.departmentSubjectId,
					ctx.profile.termId,
				);
			}

			const from = input.from ? attendanceDateFromInput(input.from) : undefined;
			const to = input.to ? attendanceDateFromInput(input.to) : undefined;
			if (from && to && from > to) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "The report start date must be on or before the end date.",
				});
			}

			const sessions = await ctx.db.classRoomAttendance.findMany({
				where: {
					AND: [
						activeTermAttendanceFilter(ctx.profile.termId),
						attendanceDateRangeFilter(from, to),
					],
					deletedAt: null,
					departmentId: input.departmentId,
					departmentSubjectId: input.departmentSubjectId ?? undefined,
					schoolProfileId: ctx.profile.schoolId,
				},
				orderBy: [{ attendanceDate: "asc" }, { createdAt: "asc" }],
				select: {
					attendanceDate: true,
					attendanceTitle: true,
					createdAt: true,
					department: {
						select: {
							departmentName: true,
							classRoom: {
								select: {
									name: true,
								},
							},
						},
					},
					departmentSubject: {
						select: {
							id: true,
							subject: {
								select: {
									title: true,
								},
							},
						},
					},
					id: true,
					periodLabel: true,
					scope: true,
					staffProfile: {
						select: {
							name: true,
						},
					},
					studentAttendanceList: {
						where: {
							deletedAt: null,
						},
						select: {
							comment: true,
							isPresent: true,
							status: true,
							StudentTermForm: {
								select: {
									student: {
										select: {
											id: true,
											name: true,
											otherName: true,
											surname: true,
										},
									},
								},
							},
						},
					},
				},
			});

			const rows = sessions.flatMap((session) =>
				session.studentAttendanceList.map((attendance) => {
					const student = attendance.StudentTermForm?.student;
					return {
						attendanceDate: session.attendanceDate ?? session.createdAt ?? null,
						attendanceTitle: session.attendanceTitle,
						classroom: classroomDisplayName({
							className: session.department?.classRoom?.name,
							departmentName: session.department?.departmentName,
						}),
						comment: attendance.comment ?? null,
						periodLabel: session.periodLabel ?? null,
						recordedBy: session.staffProfile?.name ?? null,
						scope: session.scope ?? "GENERAL",
						sessionId: session.id,
						status: attendanceStatusFromRecord(attendance),
						studentId: student?.id ?? null,
						studentName:
							formatStudentName(student, ctx.profile.studentNameFormat) ||
							"Unknown student",
						subject: session.departmentSubject?.subject.title ?? null,
					};
				}),
			);

			return {
				rows,
				sessions: sessions.length,
				summary: summarizeAttendanceStatuses(rows.map((row) => row.status)),
			};
		}),

	getAttendanceSession: authenticatedProcedure
		.input(z.object({ attendanceId: z.string() }))
		.query(async ({ input, ctx }) => {
			assertAttendanceRole(ctx, "read");
			const record = await ctx.db.classRoomAttendance.findFirst({
				where: {
					AND: [activeTermAttendanceFilter(ctx.profile.termId)],
					id: input.attendanceId,
					schoolProfileId: ctx.profile.schoolId,
					deletedAt: null,
				},
				select: {
					id: true,
					departmentId: true,
					attendanceTitle: true,
					attendanceDate: true,
					scope: true,
					periodLabel: true,
					revision: true,
					revisions: {
						orderBy: {
							createdAt: "desc",
						},
						select: {
							action: true,
							actorName: true,
							actorUserId: true,
							createdAt: true,
							id: true,
							snapshot: true,
						},
					},
					createdAt: true,
					sessionTermId: true,
					departmentSubject: {
						select: {
							id: true,
							subject: {
								select: {
									title: true,
								},
							},
						},
					},
					staffProfile: {
						select: {
							id: true,
							name: true,
						},
					},
					studentAttendanceList: {
						where: {
							deletedAt: null,
						},
						select: {
							id: true,
							isPresent: true,
							status: true,
							comment: true,
							StudentTermForm: {
								select: {
									id: true,
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
					},
				},
			});

			if (!record) return null;
			await assertTeacherCanAccessClassroomDepartment(ctx, record.departmentId);

			const students = record.studentAttendanceList
				.map((item) => {
					const student = item.StudentTermForm?.student;
					const studentName = formatStudentName(
						student,
						ctx.profile.studentNameFormat,
					);

					return {
						id: item.id,
						studentId: student?.id ?? null,
						studentTermFormId: item.StudentTermForm?.id ?? null,
						studentName: studentName || "Unknown student",
						isPresent: isPresentStatus(attendanceStatusFromRecord(item)),
						status: attendanceStatusFromRecord(item),
						comment: item.comment ?? null,
					};
				})
				.sort((a, b) => a.studentName.localeCompare(b.studentName));

			const count = (status: z.infer<typeof attendanceStatusSchema>) =>
				students.filter((student) => student.status === status).length;

			return {
				id: record.id,
				attendanceTitle: record.attendanceTitle,
				attendanceDate: record.attendanceDate ?? record.createdAt,
				scope: record.scope ?? "GENERAL",
				periodLabel: record.periodLabel ?? null,
				departmentSubjectId: record.departmentSubject?.id ?? null,
				subjectTitle: record.departmentSubject?.subject.title ?? null,
				revision: record.revision,
				revisionHistory: record.revisions,
				createdAt: record.createdAt,
				staffName: record.staffProfile?.name ?? null,
				total: students.length,
				present: count("PRESENT"),
				absent: count("ABSENT"),
				late: count("LATE"),
				excused: count("EXCUSED"),
				sick: count("SICK"),
				leave: count("LEAVE"),
				students,
			};
		}),

	takeAttendance: authenticatedProcedure
		.input(takeAttendanceSchema)
		.mutation(async ({ input, ctx }) => {
			assertAttendanceRole(ctx, "write");
			const schoolProfileId = ctx.profile.schoolId;
			const activeTermId = ctx.profile.termId;
			if (!schoolProfileId || !activeTermId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Select a school and academic term before taking attendance.",
				});
			}
			const idempotencyPayloadHash = buildAttendancePayloadHash(input, {
				activeTermId,
				attendanceDate: attendanceDateFromInput(input.attendanceDate),
			});
			if (input.idempotencyKey) {
				const replay = await ctx.db.classRoomAttendance.findFirst({
					where: {
						schoolProfileId,
						idempotencyKey: input.idempotencyKey,
						deletedAt: null,
					},
					select: {
						id: true,
						idempotencyPayloadHash: true,
					},
				});
				if (replay) {
					if (
						replay.idempotencyPayloadHash &&
						replay.idempotencyPayloadHash !== idempotencyPayloadHash
					) {
						throw new TRPCError({
							code: "CONFLICT",
							message:
								"This idempotency key was already used for a different attendance request.",
						});
					}
					return { id: replay.id };
				}
			}
			const resolved = await resolveAttendanceWrite(ctx, input);
			const attendanceId = randomUUID();
			let created: { id: string };
			try {
				created = await ctx.db.$transaction(async (tx) => {
					if (input.idempotencyKey) {
						await tx.attendanceSessionGuard.create({
							data: {
								attendanceId,
								key: input.idempotencyKey,
								kind: "IDEMPOTENCY",
								schoolProfileId: resolved.schoolProfileId,
							},
						});
					}
					await tx.attendanceSessionGuard.create({
						data: {
							attendanceId,
							key: resolved.dedupeKey,
							kind: "DEDUPE",
							schoolProfileId: resolved.schoolProfileId,
						},
					});
					return tx.classRoomAttendance.create({
						data: {
							id: attendanceId,
							attendanceTitle: input.attendanceTitle,
							attendanceDate: resolved.attendanceDate,
							schoolProfileId: resolved.schoolProfileId,
							sessionTermId: resolved.activeTermId,
							departmentId: input.departmentId,
							departmentSubjectId: input.departmentSubjectId,
							scope: input.scope,
							periodLabel: input.periodLabel,
							idempotencyKey: input.idempotencyKey,
							idempotencyPayloadHash,
							dedupeKey: resolved.dedupeKey,
							staffProfileId: resolved.staffProfileId,
							studentAttendanceList: {
								create: resolved.studentRows,
							},
							revisions: {
								create: {
									action: "CREATED",
									actorName: ctx.currentUser?.name ?? null,
									actorUserId: ctx.currentUser?.id ?? null,
									snapshot: attendanceAuditSnapshot({
										attendanceDate: resolved.attendanceDate,
										attendanceTitle: input.attendanceTitle,
										departmentId: input.departmentId,
										departmentSubjectId: input.departmentSubjectId,
										periodLabel: input.periodLabel,
										scope: input.scope,
										students: resolved.studentRows,
									}),
								},
							},
						},
						select: { id: true },
					});
				});
			} catch (error) {
				if (!isPrismaUniqueConflict(error)) throw error;

				if (input.idempotencyKey) {
					const replayGuard = await ctx.db.attendanceSessionGuard.findFirst({
						where: {
							key: input.idempotencyKey,
							kind: "IDEMPOTENCY",
							schoolProfileId: resolved.schoolProfileId,
						},
						select: {
							attendanceId: true,
						},
					});
					if (replayGuard) {
						const replay = await ctx.db.classRoomAttendance.findFirst({
							where: {
								deletedAt: null,
								id: replayGuard.attendanceId,
								schoolProfileId: resolved.schoolProfileId,
							},
							select: {
								id: true,
								idempotencyPayloadHash: true,
							},
						});
						if (replay) {
							if (
								replay.idempotencyPayloadHash &&
								replay.idempotencyPayloadHash !== idempotencyPayloadHash
							) {
								throw new TRPCError({
									code: "CONFLICT",
									message:
										"This idempotency key was already used for a different attendance request.",
								});
							}
							return { id: replay.id };
						}
					}
				}

				throw new TRPCError({
					code: "CONFLICT",
					message:
						"Attendance has already been recorded for this classroom, date, scope, and period.",
				});
			}
			await recordAttendanceActivity(ctx, {
				attendanceId: created.id,
				departmentId: input.departmentId,
				type: "attendance_created",
			});
			return created;
		}),

	updateAttendanceSession: authenticatedProcedure
		.input(updateAttendanceSessionSchema)
		.mutation(async ({ input, ctx }) => {
			assertAttendanceRole(ctx, "write");
			const existing = await ctx.db.classRoomAttendance.findFirst({
				where: {
					AND: [activeTermAttendanceFilter(ctx.profile.termId)],
					id: input.attendanceId,
					schoolProfileId: ctx.profile.schoolId,
					deletedAt: null,
				},
				select: {
					id: true,
					attendanceDate: true,
					attendanceTitle: true,
					departmentId: true,
					departmentSubjectId: true,
					periodLabel: true,
					revision: true,
					scope: true,
					sessionTermId: true,
					studentAttendanceList: {
						where: {
							deletedAt: null,
						},
						select: {
							comment: true,
							isPresent: true,
							status: true,
							studentTermFormId: true,
						},
					},
				},
			});
			if (!existing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Attendance session was not found.",
				});
			}
			await assertTeacherCanAccessClassroomDepartment(
				ctx,
				existing.departmentId,
				ctx.profile.termId,
			);
			if (
				existing.sessionTermId &&
				existing.sessionTermId !== ctx.profile.termId
			) {
				throw new TRPCError({
					code: "CONFLICT",
					message:
						"Only attendance from the active academic term can be edited.",
				});
			}

			const resolved = await resolveAttendanceWrite(ctx, input, {
				ignoreAttendanceId: existing.id,
			});
			const deletedAt = new Date();

			let result: { id: string; revision: number };
			try {
				result = await ctx.db.$transaction(async (tx) => {
					await tx.attendanceSessionGuard.deleteMany({
						where: {
							attendanceId: existing.id,
							kind: "DEDUPE",
						},
					});
					await tx.attendanceSessionGuard.create({
						data: {
							attendanceId: existing.id,
							key: resolved.dedupeKey,
							kind: "DEDUPE",
							schoolProfileId: resolved.schoolProfileId,
						},
					});
					await tx.attendanceSessionRevision.create({
						data: {
							action: "UPDATED",
							actorName: ctx.currentUser?.name ?? null,
							actorUserId: ctx.currentUser?.id ?? null,
							attendanceId: existing.id,
							snapshot: attendanceAuditSnapshot({
								after: {
									attendanceDate: resolved.attendanceDate,
									attendanceTitle: input.attendanceTitle,
									departmentId: input.departmentId,
									departmentSubjectId: input.departmentSubjectId,
									periodLabel: input.periodLabel,
									scope: input.scope,
									students: resolved.studentRows,
								},
								before: existing,
							}),
						},
					});
					await tx.studentAttendance.updateMany({
						where: {
							classroomAttendanceId: existing.id,
							deletedAt: null,
						},
						data: {
							deletedAt,
						},
					});
					await tx.studentAttendance.createMany({
						data: resolved.studentRows.map((student) => ({
							...student,
							classroomAttendanceId: existing.id,
						})),
					});
					return tx.classRoomAttendance.update({
						where: {
							id: existing.id,
						},
						data: {
							attendanceDate: resolved.attendanceDate,
							attendanceTitle: input.attendanceTitle,
							dedupeKey: resolved.dedupeKey,
							departmentId: input.departmentId,
							departmentSubjectId: input.departmentSubjectId,
							periodLabel: input.periodLabel,
							revision: {
								increment: 1,
							},
							scope: input.scope,
						},
						select: {
							id: true,
							revision: true,
						},
					});
				});
			} catch (error) {
				if (!isPrismaUniqueConflict(error)) throw error;
				throw new TRPCError({
					code: "CONFLICT",
					message:
						"Attendance has already been recorded for this classroom, date, scope, and period.",
				});
			}

			await recordAttendanceActivity(ctx, {
				attendanceId: result.id,
				departmentId: input.departmentId,
				type: "attendance_updated",
			});
			return result;
		}),

	deleteAttendanceSession: authenticatedProcedure
		.input(z.object({ attendanceId: z.string() }))
		.mutation(async ({ input, ctx }) => {
			assertAttendanceRole(ctx, "write");
			const existing = await ctx.db.classRoomAttendance.findFirst({
				where: {
					AND: [activeTermAttendanceFilter(ctx.profile.termId)],
					id: input.attendanceId,
					schoolProfileId: ctx.profile.schoolId,
					deletedAt: null,
				},
				select: {
					id: true,
					attendanceDate: true,
					attendanceTitle: true,
					dedupeKey: true,
					departmentId: true,
					departmentSubjectId: true,
					idempotencyKey: true,
					periodLabel: true,
					revision: true,
					scope: true,
					sessionTermId: true,
					studentAttendanceList: {
						where: { deletedAt: null },
						select: {
							comment: true,
							isPresent: true,
							status: true,
							studentTermFormId: true,
							StudentTermForm: {
								select: { sessionTermId: true },
							},
						},
					},
				},
			});

			if (!existing) return { success: true };
			await assertTeacherCanAccessClassroomDepartment(
				ctx,
				existing.departmentId,
			);
			await assertAcademicTermWritable(
				ctx,
				existing.sessionTermId ??
					existing.studentAttendanceList[0]?.StudentTermForm?.sessionTermId ??
					ctx.profile.termId,
			);

			const deletedAt = new Date();

			await ctx.db.$transaction([
				ctx.db.attendanceSessionGuard.deleteMany({
					where: {
						attendanceId: input.attendanceId,
					},
				}),
				ctx.db.attendanceSessionRevision.create({
					data: {
						action: "DELETED",
						actorName: ctx.currentUser?.name ?? null,
						actorUserId: ctx.currentUser?.id ?? null,
						attendanceId: input.attendanceId,
						snapshot: attendanceAuditSnapshot(existing),
					},
				}),
				ctx.db.studentAttendance.updateMany({
					where: {
						classroomAttendanceId: input.attendanceId,
						deletedAt: null,
					},
					data: {
						deletedAt,
					},
				}),
				ctx.db.classRoomAttendance.update({
					where: {
						id: input.attendanceId,
					},
					data: {
						dedupeKey: null,
						deletedAt,
						idempotencyKey: null,
						idempotencyPayloadHash: null,
					},
				}),
			]);

			await recordAttendanceActivity(ctx, {
				attendanceId: input.attendanceId,
				departmentId: existing.departmentId,
				type: "attendance_deleted",
			});
			return { success: true };
		}),

	getStudentAttendanceHistory: authenticatedProcedure
		.input(z.object({ studentId: z.string().optional().nullable() }))
		.query(async ({ input, ctx }) => {
			assertAttendanceRole(ctx, "read");
			if (!input.studentId) return [];
			if (ctx.currentUser?.role === "Teacher") {
				const studentTermForm = await ctx.db.studentTermForm.findFirst({
					where: {
						deletedAt: null,
						schoolProfileId: ctx.profile.schoolId,
						sessionTermId: ctx.profile.termId,
						studentId: input.studentId,
					},
					select: {
						classroomDepartmentId: true,
					},
				});
				if (!studentTermForm?.classroomDepartmentId) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Student attendance was not found in the active term.",
					});
				}
				await assertTeacherCanAccessClassroomDepartment(
					ctx,
					studentTermForm.classroomDepartmentId,
					ctx.profile.termId,
				);
			}
			const records = await ctx.db.studentAttendance.findMany({
				where: {
					schoolProfileId: ctx.profile.schoolId,
					StudentTermForm: {
						schoolProfileId: ctx.profile.schoolId,
						sessionTermId: ctx.profile.termId,
						student: {
							id: input.studentId,
						},
					},
					classroomAttendance: {
						is: {
							AND: [activeTermAttendanceFilter(ctx.profile.termId)],
							deletedAt: null,
						},
					},
					deletedAt: null,
				},
				select: {
					id: true,
					isPresent: true,
					status: true,
					comment: true,
					createdAt: true,
					classroomAttendance: {
						select: {
							attendanceTitle: true,
							attendanceDate: true,
							scope: true,
							periodLabel: true,
							createdAt: true,
							departmentSubject: {
								select: {
									id: true,
									subject: {
										select: {
											title: true,
										},
									},
								},
							},
						},
					},
					department: {
						select: {
							departmentName: true,
							classRoom: {
								select: { name: true },
							},
						},
					},
				},
				orderBy: { createdAt: "desc" },
			});
			return records;
		}),
});
