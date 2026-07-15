import { describe, expect, test } from "bun:test";

process.env.DATABASE_URL ??=
	"postgresql://postgres:postgres@127.0.0.1:55432/school_clerk";

const { staffRouter } = await import("./staff.routes");

function createStaffListCtx() {
	return {
		profile: {
			schoolId: "school-1",
			sessionId: "session-1",
			termId: "term-1",
		},
		db: {
			schoolProfile: {
				findUnique: async () => ({ accountId: "account-1" }),
			},
			user: {
				findMany: async () => [
					{
						email: "teacher@school.test",
						role: "Teacher",
						emailVerified: true,
						password: null,
						accounts: [],
						sessions: [{ id: "session-1" }],
					},
				],
			},
			staffProfile: {
				findMany: async () => [
					{
						id: "staff-1",
						name: "Teacher One",
						title: null,
						email: "teacher@school.test",
						inviteStatus: "PENDING",
						inviteSentAt: null,
						inviteResentAt: null,
						lastInviteError: null,
						onboardedAt: null,
						termProfiles: [
							{
								id: "staff-term-1",
								classroomsProfiles: [],
							},
						],
						subjects: [],
					},
				],
			},
			staffTermProfile: {
				findFirst: async () => ({
					id: "staff-term-1",
					academicAccessGrants: [
						{
							scope: "CLASS",
							classRoomId: "class-1",
							classRoomDepartmentId: null,
							subjectId: null,
							departmentSubjectId: null,
						},
					],
					classroomsProfiles: [],
				}),
			},
			staffSubject: {
				findMany: async () => [],
			},
			classRoomDepartment: {
				findMany: async (query: any) => {
					if (query.where.classRoomsId?.in) {
						return [{ id: "science" }];
					}

					return [
						{
							departmentName: "Science",
							classRoom: {
								name: "SS 1",
							},
						},
					];
				},
			},
			departmentSubject: {
				findMany: async (query: any) => {
					if (query.where.classRoomDepartmentId?.in) {
						return [
							{
								id: "science-math",
								classRoomDepartmentId: "science",
							},
						];
					}

					return [
						{
							subject: {
								title: "Mathematics",
							},
						},
					];
				},
			},
		},
	};
}

describe("staffRouter.getStaffList", () => {
	test("summarizes broad grant effective classroom and subject coverage", async () => {
		const caller = staffRouter.createCaller(createStaffListCtx() as any);

		const result = await caller.getStaffList();
		const teacher = result.items[0];

		expect(teacher).toBeDefined();
		if (!teacher) throw new Error("Expected one staff list item.");
		expect(teacher.classroomCount).toBe(1);
		expect(teacher.subjectCount).toBe(1);
		expect(teacher.classroomLabels).toEqual(["SS 1 Science"]);
		expect(teacher.subjectLabels).toEqual(["Mathematics"]);
		expect(result.stats.teachersNeedingAssignments).toBe(0);
	});
});
