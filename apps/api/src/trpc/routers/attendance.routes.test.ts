import { describe, expect, test } from "bun:test";

process.env.DATABASE_URL ??=
	"postgresql://postgres:postgres@127.0.0.1:55432/school_clerk";

const { attendanceRouter } = await import("./attendance.routes");
type CallerContext = Parameters<typeof attendanceRouter.createCaller>[0];
type MockQuery = {
	data: Record<string, unknown>;
	where: Record<string, unknown>;
	[key: string]: unknown;
};
type StudentTermFormMock = {
	id: string;
	schoolProfileId: string;
	sessionTermId: string;
};

function createAttendanceContext({
	attendanceGuardCreate,
	attendanceFindFirst,
	attendanceRows = [],
	existingAttendance = null,
	role = "Accountant",
	studentTermForms = [
		{
			id: "term-form-1",
			schoolProfileId: "school-1",
			sessionTermId: "term-1",
		},
	],
	teacherDepartmentIds = ["department-1"],
	teacherSubjectIds = ["department-subject-1"],
}: {
	attendanceGuardCreate?: (query: MockQuery) => unknown;
	attendanceFindFirst?: (query: MockQuery) => unknown;
	attendanceRows?: unknown[];
	existingAttendance?: unknown;
	role?: string;
	studentTermForms?: StudentTermFormMock[];
	teacherDepartmentIds?: string[];
	teacherSubjectIds?: string[];
} = {}) {
	const attendanceQueries: unknown[] = [];
	const attendanceFindFirstQueries: MockQuery[] = [];
	const createdAttendance: unknown[] = [];
	const studentAttendanceQueries: unknown[] = [];
	const attendanceUpdates: unknown[] = [];
	const studentAttendanceWrites: Array<{
		operation: string;
		query: unknown;
	}> = [];
	const revisionWrites: unknown[] = [];
	const activityWrites: unknown[] = [];
	const guardWrites: unknown[] = [];
	const user = {
		email: "user@school.test",
		id: "user-1",
		name: "School User",
		role,
		saasAccountId: "account-1",
	};

	const ctx = {
		profile: {
			authSessionId: "session-token",
			schoolId: "school-1",
			sessionId: "session-1",
			termId: "term-1",
		},
		db: {
			session: {
				findFirst: async () => ({
					id: "session-1",
					token: "session-token",
					user,
				}),
			},
			schoolProfile: {
				findFirst: async () => ({
					accountId: "account-1",
					id: "school-1",
					name: "Test School",
					subDomain: "test-school",
				}),
			},
			sessionTerm: {
				findFirst: async () => ({
					id: "term-1",
					lifecycleStatus: "ACTIVE",
				}),
			},
			studentTermForm: {
				findMany: async () => studentTermForms,
			},
			staffProfile: {
				findFirst: async () => ({ id: "staff-1" }),
			},
			staffTermProfile: {
				findFirst: async () => ({
					academicAccessGrants: teacherDepartmentIds.map((id) => ({
						classRoomDepartmentId: id,
						classRoomId: null,
						departmentSubjectId: null,
						scope: "DEPARTMENT",
						subjectId: null,
					})),
					classroomsProfiles: [],
					id: "staff-term-1",
				}),
			},
			staffSubject: {
				findMany: async () => [],
			},
			classRoomDepartment: {
				findMany: async () =>
					teacherDepartmentIds.map((id) => ({
						id,
					})),
			},
			departmentSubject: {
				findFirst: async () => ({
					classRoomDepartmentId: "department-1",
					id: "department-subject-1",
					sessionTermId: "term-1",
				}),
				findMany: async () =>
					teacherSubjectIds.map((id) => ({
						classRoomDepartmentId: "department-1",
						id,
					})),
			},
			classRoomAttendance: {
				findMany: async (query: unknown) => {
					attendanceQueries.push(query);
					return attendanceRows;
				},
				findFirst: async (query: MockQuery) => {
					attendanceFindFirstQueries.push(query);
					return attendanceFindFirst
						? attendanceFindFirst(query)
						: existingAttendance;
				},
				create: async (query: MockQuery) => {
					createdAttendance.push(query);
					return { id: "attendance-1" };
				},
				update: async (query: unknown) => {
					attendanceUpdates.push(query);
					return { id: "attendance-existing", revision: 2 };
				},
			},
			studentAttendance: {
				findMany: async (query: unknown) => {
					studentAttendanceQueries.push(query);
					return [];
				},
				updateMany: async (query: unknown) => {
					studentAttendanceWrites.push({ operation: "updateMany", query });
					return { count: 1 };
				},
				createMany: async (query: unknown) => {
					studentAttendanceWrites.push({ operation: "createMany", query });
					return { count: 1 };
				},
			},
			attendanceSessionRevision: {
				create: async (query: unknown) => {
					revisionWrites.push(query);
					return { id: "revision-1" };
				},
			},
			attendanceSessionGuard: {
				create: async (query: MockQuery) => {
					guardWrites.push(query);
					return attendanceGuardCreate
						? attendanceGuardCreate(query)
						: { id: "guard-1" };
				},
				deleteMany: async () => ({ count: 1 }),
				findFirst: async () => null,
			},
			activity: {
				create: async (query: unknown) => {
					activityWrites.push(query);
					return { id: "activity-1" };
				},
			},
		},
	};
	Object.assign(ctx.db, {
		$transaction: async (operation: unknown) =>
			typeof operation === "function"
				? (operation as (tx: typeof ctx.db) => unknown)(ctx.db)
				: Promise.all(operation as PromiseLike<unknown>[]),
	});

	return {
		attendanceQueries,
		attendanceFindFirstQueries,
		attendanceUpdates,
		activityWrites,
		createdAttendance,
		ctx,
		guardWrites,
		revisionWrites,
		studentAttendanceQueries,
		studentAttendanceWrites,
	};
}

function subjectAttendanceInput() {
	return {
		attendanceDate: "2026-07-20",
		attendanceTitle: "Mathematics",
		departmentId: "department-1",
		departmentSubjectId: "department-subject-1",
		idempotencyKey: "attendance-request-1",
		periodLabel: "Period 1",
		scope: "SUBJECT",
		students: [
			{
				comment: "Arrived after assembly",
				status: "LATE",
				studentTermFormId: "term-form-1",
			},
		],
	} as const;
}

describe("attendanceRouter permissions", () => {
	test("rejects attendance reads for authenticated roles outside attendance operations", async () => {
		const caller = attendanceRouter.createCaller(
			createAttendanceContext().ctx as unknown as CallerContext,
		);

		await expect(
			caller.getClassroomAttendance({ departmentId: "department-1" }),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	test("lists only attendance sessions from the active academic term", async () => {
		const { attendanceQueries, ctx } = createAttendanceContext({
			role: "Admin",
		});
		const caller = attendanceRouter.createCaller(
			ctx as unknown as CallerContext,
		);

		await caller.getClassroomAttendance({ departmentId: "department-1" });

		expect(attendanceQueries).toEqual([
			expect.objectContaining({
				where: expect.objectContaining({
					AND: [
						expect.objectContaining({
							OR: expect.arrayContaining([
								expect.objectContaining({
									sessionTermId: "term-1",
								}),
							]),
						}),
					],
					departmentId: "department-1",
					schoolProfileId: "school-1",
				}),
			}),
		]);
	});

	test("creates subject attendance with an explicit date, period, and student status", async () => {
		const { createdAttendance, ctx, guardWrites } = createAttendanceContext({
			role: "Admin",
		});
		const caller = attendanceRouter.createCaller(
			ctx as unknown as CallerContext,
		);

		await caller.takeAttendance(subjectAttendanceInput() as never);

		expect(createdAttendance).toEqual([
			expect.objectContaining({
				data: expect.objectContaining({
					attendanceDate: new Date("2026-07-20T00:00:00.000Z"),
					departmentSubjectId: "department-subject-1",
					idempotencyKey: "attendance-request-1",
					periodLabel: "Period 1",
					scope: "SUBJECT",
					sessionTermId: "term-1",
					studentAttendanceList: {
						create: [
							expect.objectContaining({
								isPresent: true,
								status: "LATE",
							}),
						],
					},
				}),
			}),
		]);
		expect(guardWrites).toEqual([
			expect.objectContaining({
				data: expect.objectContaining({
					key: "attendance-request-1",
					kind: "IDEMPOTENCY",
				}),
			}),
			expect.objectContaining({
				data: expect.objectContaining({
					kind: "DEDUPE",
				}),
			}),
		]);
	});

	test("lets an assigned teacher record subject attendance", async () => {
		const { createdAttendance, ctx } = createAttendanceContext({
			role: "Teacher",
		});
		const caller = attendanceRouter.createCaller(
			ctx as unknown as CallerContext,
		);

		await caller.takeAttendance(subjectAttendanceInput() as never);

		expect(createdAttendance).toHaveLength(1);
	});

	test("rejects a concurrent duplicate through the atomic attendance guard", async () => {
		const { ctx } = createAttendanceContext({
			attendanceGuardCreate: (query) => {
				if (query.data.kind === "DEDUPE") throw { code: "P2002" };
				return { id: "guard-1" };
			},
			role: "Admin",
		});
		const caller = attendanceRouter.createCaller(
			ctx as unknown as CallerContext,
		);

		await expect(
			caller.takeAttendance({
				...subjectAttendanceInput(),
				idempotencyKey: undefined,
			} as never),
		).rejects.toMatchObject({ code: "CONFLICT" });
	});

	test("requires a status for the complete active classroom roster", async () => {
		const { ctx } = createAttendanceContext({
			role: "Admin",
			studentTermForms: [
				{
					id: "term-form-1",
					schoolProfileId: "school-1",
					sessionTermId: "term-1",
				},
				{
					id: "term-form-2",
					schoolProfileId: "school-1",
					sessionTermId: "term-1",
				},
			],
		});
		const caller = attendanceRouter.createCaller(
			ctx as unknown as CallerContext,
		);

		await expect(
			caller.takeAttendance(subjectAttendanceInput() as never),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});

	test("returns the existing session when an idempotency key is replayed", async () => {
		const { createdAttendance, ctx } = createAttendanceContext({
			existingAttendance: { id: "attendance-existing" },
			role: "Admin",
		});
		const caller = attendanceRouter.createCaller(
			ctx as unknown as CallerContext,
		);

		const result = await caller.takeAttendance(
			subjectAttendanceInput() as never,
		);

		expect(result).toEqual({ id: "attendance-existing" });
		expect(createdAttendance).toHaveLength(0);
	});

	test("rejects an idempotency key reused for a different payload", async () => {
		const { ctx } = createAttendanceContext({
			existingAttendance: {
				id: "attendance-existing",
				idempotencyPayloadHash: "different-payload",
			},
			role: "Admin",
		});
		const caller = attendanceRouter.createCaller(
			ctx as unknown as CallerContext,
		);

		await expect(
			caller.takeAttendance(subjectAttendanceInput() as never),
		).rejects.toMatchObject({ code: "CONFLICT" });
	});

	test("summarizes all supported statuses for the active-term session list", async () => {
		const { ctx } = createAttendanceContext({
			attendanceRows: [
				{
					attendanceDate: new Date("2026-07-20T00:00:00.000Z"),
					attendanceTitle: "Mathematics",
					createdAt: new Date("2026-07-20T08:00:00.000Z"),
					departmentId: "department-1",
					departmentSubject: {
						id: "department-subject-1",
						subject: { title: "Mathematics" },
					},
					id: "attendance-1",
					periodLabel: "Period 1",
					scope: "SUBJECT",
					staffProfile: { id: "staff-1", name: "Teacher One" },
					studentAttendanceList: [
						{ isPresent: true, status: "PRESENT" },
						{ isPresent: true, status: "LATE" },
						{ isPresent: false, status: "EXCUSED" },
						{ isPresent: false, status: "SICK" },
						{ isPresent: false, status: "LEAVE" },
						{ isPresent: false, status: "ABSENT" },
					],
				},
			],
			role: "Admin",
		});
		const caller = attendanceRouter.createCaller(
			ctx as unknown as CallerContext,
		);

		const result = await caller.getClassroomAttendance({
			departmentId: "department-1",
		});

		expect(result).toEqual([
			expect.objectContaining({
				absent: 1,
				excused: 1,
				late: 1,
				leave: 1,
				present: 1,
				scope: "SUBJECT",
				sick: 1,
				subjectTitle: "Mathematics",
				total: 6,
			}),
		]);
	});

	test("scopes student attendance history to the active academic term", async () => {
		const { ctx, studentAttendanceQueries } = createAttendanceContext({
			role: "Registrar",
		});
		const caller = attendanceRouter.createCaller(
			ctx as unknown as CallerContext,
		);

		await caller.getStudentAttendanceHistory({ studentId: "student-1" });

		expect(studentAttendanceQueries).toEqual([
			expect.objectContaining({
				where: expect.objectContaining({
					StudentTermForm: expect.objectContaining({
						sessionTermId: "term-1",
					}),
					classroomAttendance: {
						is: expect.objectContaining({
							AND: [
								expect.objectContaining({
									OR: expect.arrayContaining([
										expect.objectContaining({
											sessionTermId: "term-1",
										}),
									]),
								}),
							],
						}),
					},
				}),
			}),
		]);
	});

	test("updates an attendance session and replaces its student statuses with an audit revision", async () => {
		const existing = {
			attendanceDate: new Date("2026-07-20T00:00:00.000Z"),
			attendanceTitle: "Mathematics",
			departmentId: "department-1",
			departmentSubjectId: "department-subject-1",
			id: "attendance-existing",
			periodLabel: "Period 1",
			revision: 1,
			scope: "SUBJECT",
			sessionTermId: "term-1",
			studentAttendanceList: [
				{
					comment: null,
					isPresent: false,
					status: "ABSENT",
					studentTermFormId: "term-form-1",
				},
			],
		};
		const { attendanceUpdates, ctx, revisionWrites, studentAttendanceWrites } =
			createAttendanceContext({
				attendanceFindFirst: (query) =>
					query.where.id === "attendance-existing" ? existing : null,
				role: "Admin",
			});
		const caller = attendanceRouter.createCaller(
			ctx as unknown as CallerContext,
		);
		const { idempotencyKey: _, ...payload } = subjectAttendanceInput();

		const result = await caller.updateAttendanceSession({
			...payload,
			attendanceId: "attendance-existing",
			students: [
				{
					comment: "Corrected after teacher review",
					status: "PRESENT",
					studentTermFormId: "term-form-1",
				},
			],
		});

		expect(result).toEqual({ id: "attendance-existing", revision: 2 });
		expect(attendanceUpdates).toHaveLength(1);
		expect(studentAttendanceWrites.map((write) => write.operation)).toEqual([
			"updateMany",
			"createMany",
		]);
		expect(revisionWrites).toEqual([
			expect.objectContaining({
				data: expect.objectContaining({
					action: "UPDATED",
					attendanceId: "attendance-existing",
				}),
			}),
		]);
	});

	test("does not let a teacher move an unassigned existing session into an assigned classroom", async () => {
		const existing = {
			attendanceDate: new Date("2026-07-20T00:00:00.000Z"),
			attendanceTitle: "Other classroom",
			departmentId: "department-2",
			departmentSubjectId: null,
			id: "attendance-existing",
			periodLabel: null,
			revision: 1,
			scope: "GENERAL",
			sessionTermId: "term-1",
			studentAttendanceList: [],
		};
		const { ctx } = createAttendanceContext({
			attendanceFindFirst: (query) =>
				query.where.id === "attendance-existing" ? existing : null,
			role: "Teacher",
			teacherDepartmentIds: ["department-1"],
		});
		const caller = attendanceRouter.createCaller(
			ctx as unknown as CallerContext,
		);
		const { idempotencyKey: _, ...payload } = subjectAttendanceInput();

		await expect(
			caller.updateAttendanceSession({
				...payload,
				attendanceId: "attendance-existing",
				students: [...payload.students],
			}),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	test("returns editable session metadata and explicit student statuses", async () => {
		const record = {
			attendanceDate: new Date("2026-07-20T00:00:00.000Z"),
			attendanceTitle: "Mathematics",
			createdAt: new Date("2026-07-20T08:00:00.000Z"),
			departmentId: "department-1",
			departmentSubject: {
				id: "department-subject-1",
				subject: { title: "Mathematics" },
			},
			id: "attendance-1",
			periodLabel: "Period 1",
			revision: 2,
			revisions: [
				{
					action: "UPDATED",
					actorName: "Teacher One",
					actorUserId: "user-1",
					createdAt: new Date("2026-07-20T09:00:00.000Z"),
					id: "revision-2",
					snapshot: {},
				},
			],
			scope: "SUBJECT",
			sessionTermId: "term-1",
			staffProfile: { id: "staff-1", name: "Teacher One" },
			studentAttendanceList: [
				{
					StudentTermForm: {
						id: "term-form-1",
						student: {
							id: "student-1",
							name: "Amina",
							otherName: null,
							surname: "Bello",
						},
					},
					comment: "Arrived after assembly",
					id: "student-attendance-1",
					isPresent: true,
					status: "LATE",
				},
			],
		};
		const { ctx } = createAttendanceContext({
			attendanceFindFirst: () => record,
			role: "Admin",
		});
		const caller = attendanceRouter.createCaller(
			ctx as unknown as CallerContext,
		);

		const result = await caller.getAttendanceSession({
			attendanceId: "attendance-1",
		});

		expect(result).toEqual(
			expect.objectContaining({
				attendanceDate: new Date("2026-07-20T00:00:00.000Z"),
				departmentSubjectId: "department-subject-1",
				late: 1,
				periodLabel: "Period 1",
				revision: 2,
				revisionHistory: [
					expect.objectContaining({
						action: "UPDATED",
						actorName: "Teacher One",
					}),
				],
				scope: "SUBJECT",
				subjectTitle: "Mathematics",
				students: [
					expect.objectContaining({
						status: "LATE",
					}),
				],
			}),
		);
	});

	test("builds a term-scoped attendance report with export-ready student rows", async () => {
		const { attendanceQueries, ctx } = createAttendanceContext({
			attendanceRows: [
				{
					attendanceDate: new Date("2026-07-20T00:00:00.000Z"),
					attendanceTitle: "Mathematics",
					createdAt: new Date("2026-07-20T08:00:00.000Z"),
					department: {
						classRoom: { name: "JSS 1" },
						departmentName: "A",
					},
					departmentSubject: {
						id: "department-subject-1",
						subject: { title: "Mathematics" },
					},
					id: "attendance-1",
					periodLabel: "Period 1",
					scope: "SUBJECT",
					staffProfile: { name: "Teacher One" },
					studentAttendanceList: [
						{
							StudentTermForm: {
								student: {
									id: "student-1",
									name: "Amina",
									otherName: null,
									surname: "Bello",
								},
							},
							comment: null,
							isPresent: true,
							status: "LATE",
						},
					],
				},
			],
			role: "Registrar",
		});
		const caller = attendanceRouter.createCaller(
			ctx as unknown as CallerContext,
		);

		const report = await caller.getAttendanceReport({
			departmentId: "department-1",
			from: "2026-07-01",
			to: "2026-07-31",
		});

		expect(report.summary).toEqual(
			expect.objectContaining({
				attendanceRate: 100,
				late: 1,
				total: 1,
			}),
		);
		expect(report.rows).toEqual([
			expect.objectContaining({
				classroom: "JSS 1 A",
				status: "LATE",
				studentName: "Amina Bello",
				subject: "Mathematics",
			}),
		]);
		expect(attendanceQueries[0]).toEqual(
			expect.objectContaining({
				where: expect.objectContaining({
					AND: expect.arrayContaining([
						expect.objectContaining({
							OR: expect.arrayContaining([
								expect.objectContaining({
									attendanceDate: null,
									createdAt: expect.objectContaining({
										gte: new Date("2026-07-01T00:00:00.000Z"),
										lt: new Date("2026-08-01T00:00:00.000Z"),
									}),
								}),
							]),
						}),
					]),
				}),
			}),
		);
	});

	test("soft-deletes a session, releases duplicate keys, and records a delete revision", async () => {
		const existing = {
			attendanceDate: new Date("2026-07-20T00:00:00.000Z"),
			attendanceTitle: "Morning register",
			dedupeKey: "term-1:department-1:2026-07-20:GENERAL:general:default",
			departmentId: "department-1",
			departmentSubjectId: null,
			id: "attendance-existing",
			idempotencyKey: "request-1",
			periodLabel: null,
			revision: 1,
			scope: "GENERAL",
			sessionTermId: "term-1",
			studentAttendanceList: [
				{
					StudentTermForm: { sessionTermId: "term-1" },
					status: "PRESENT",
					studentTermFormId: "term-form-1",
				},
			],
		};
		const {
			attendanceFindFirstQueries,
			attendanceUpdates,
			ctx,
			revisionWrites,
		} = createAttendanceContext({
			attendanceFindFirst: () => existing,
			role: "Admin",
		});
		const caller = attendanceRouter.createCaller(
			ctx as unknown as CallerContext,
		);

		await caller.deleteAttendanceSession({
			attendanceId: "attendance-existing",
		});

		expect(attendanceUpdates).toEqual([
			expect.objectContaining({
				data: expect.objectContaining({
					dedupeKey: null,
					idempotencyKey: null,
				}),
			}),
		]);
		expect(revisionWrites).toEqual([
			expect.objectContaining({
				data: expect.objectContaining({
					action: "DELETED",
					attendanceId: "attendance-existing",
				}),
			}),
		]);
		expect(attendanceFindFirstQueries[0]?.where).toEqual(
			expect.objectContaining({
				AND: [
					expect.objectContaining({
						OR: expect.arrayContaining([
							expect.objectContaining({
								sessionTermId: "term-1",
							}),
						]),
					}),
				],
			}),
		);
	});
});
