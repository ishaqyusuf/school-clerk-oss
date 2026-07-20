import { describe, expect, test } from "bun:test";

process.env.DATABASE_URL ??=
	"postgresql://postgres:postgres@127.0.0.1:55432/school_clerk";

const { schoolSettingsRouter } = await import("./school-settings.routes");
type CallerContext = Parameters<typeof schoolSettingsRouter.createCaller>[0];
type FindSchoolQuery = {
	where: { id: string };
	select?: {
		academicDataDirectionMode?: boolean;
		studentNameFormat?: boolean;
	};
};

function createContext({
	role = "Admin",
	mode = "AUTO",
	nameFormat = "FIRST_SURNAME_OTHER",
}: {
	role?: string;
	mode?: "AUTO" | "LTR" | "RTL";
	nameFormat?:
		| "FIRST_SURNAME_OTHER"
		| "SURNAME_FIRST_OTHER"
		| "FIRST_OTHER_SURNAME";
} = {}) {
	const updateCalls: unknown[] = [];
	const ctx = {
		profile: {
			authSessionId: "session-token",
			schoolId: "school-1",
		},
		db: {
			session: {
				findFirst: async () => ({
					id: "session-1",
					token: "session-token",
					user: {
						id: "user-1",
						email: "admin@school.test",
						name: "School Admin",
						role,
						saasAccountId: "account-1",
					},
				}),
			},
			schoolProfile: {
				findFirst: async (query: FindSchoolQuery) => {
					expect(query.where.id).toBe("school-1");
					if (query.select?.academicDataDirectionMode) {
						return { academicDataDirectionMode: mode };
					}

					if (query.select?.studentNameFormat) {
						return {
							id: "school-1",
							name: "مدرسة النور",
							subDomain: "al-noor",
							slug: "al-noor",
							createdAt: new Date("2026-01-01"),
							studentNameFormat: nameFormat,
							_count: {
								students: 2,
								sessions: 1,
							},
						};
					}

					return {
						name: "مدرسة النور",
						languageOfInstruction: "Arabic",
					};
				},
				updateMany: async (query: unknown) => {
					updateCalls.push(query);
					return { count: 1 };
				},
			},
			students: {
				findMany: async () => [
					{ name: "أحمد", surname: "محمد", otherName: null },
					{ name: "فاطمة", surname: "علي", otherName: null },
				],
			},
			classRoom: {
				findMany: async () => [{ name: "الصف الأول" }],
			},
			classRoomDepartment: {
				findMany: async () => [{ departmentName: "أ" }],
			},
			subject: {
				findMany: async () => [{ title: "الرياضيات" }],
			},
		},
	};

	return { ctx, updateCalls };
}

describe("schoolSettingsRouter", () => {
	test("reads the current tenant general settings", async () => {
		const { ctx } = createContext({
			nameFormat: "SURNAME_FIRST_OTHER",
		});
		const caller = schoolSettingsRouter.createCaller(
			ctx as unknown as CallerContext,
		);

		const result = await caller.getGeneral();

		expect(result.studentNameFormat).toBe("SURNAME_FIRST_OTHER");
		expect(result.name).toBe("مدرسة النور");
	});

	test("reads the current tenant direction and detection summary", async () => {
		const { ctx } = createContext();
		const caller = schoolSettingsRouter.createCaller(
			ctx as unknown as CallerContext,
		);

		const result = await caller.getAcademicDataDirection();

		expect(result.mode).toBe("AUTO");
		expect(result.direction).toBe("rtl");
		expect(result.analyzedRecords).toBeGreaterThan(0);
	});

	test("updates only the school from the authenticated tenant context", async () => {
		const { ctx, updateCalls } = createContext();
		const caller = schoolSettingsRouter.createCaller(
			ctx as unknown as CallerContext,
		);

		await caller.updateAcademicDataDirection({ mode: "LTR" });

		expect(updateCalls).toEqual([
			{
				where: {
					id: "school-1",
					deletedAt: null,
				},
				data: {
					academicDataDirectionMode: "LTR",
				},
			},
		]);
	});

	test("updates the student name format for the authenticated tenant", async () => {
		const { ctx, updateCalls } = createContext();
		const caller = schoolSettingsRouter.createCaller(
			ctx as unknown as CallerContext,
		);

		await caller.updateStudentNameFormat({
			format: "FIRST_OTHER_SURNAME",
		});

		expect(updateCalls).toEqual([
			{
				where: {
					id: "school-1",
					deletedAt: null,
				},
				data: {
					studentNameFormat: "FIRST_OTHER_SURNAME",
				},
			},
		]);
	});

	test("rejects non-admin updates", async () => {
		const { ctx, updateCalls } = createContext({ role: "Teacher" });
		const caller = schoolSettingsRouter.createCaller(
			ctx as unknown as CallerContext,
		);

		await expect(
			caller.updateAcademicDataDirection({ mode: "RTL" }),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			caller.updateStudentNameFormat({ format: "SURNAME_FIRST_OTHER" }),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		expect(updateCalls).toHaveLength(0);
	});
});
