"use server";

import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { whereStaff } from "@/utils/where.staff";
import { prisma } from "@school-clerk/db";
import { STAFF_ROLES, type StaffRole } from "@school-clerk/utils/constants";

type StaffDirectoryCategory = "all" | "teachers" | "non-teaching";

const nonTeachingRoles = new Set<StaffRole>([
	"Accountant",
	"Registrar",
	"HR",
	"Staff",
	"Support",
]);

function normalizeRole(role?: string | null): StaffRole {
	return STAFF_ROLES.includes(role as StaffRole) ? (role as StaffRole) : "Teacher";
}

function matchesCategory(role: StaffRole, category: StaffDirectoryCategory) {
	if (category === "teachers") return role === "Teacher";
	if (category === "non-teaching") return nonTeachingRoles.has(role);
	return true;
}

async function getStaffContext() {
	const profile = await getAuthCookie();

	if (!profile.schoolId || !profile.sessionId || !profile.termId) {
		return null;
	}

	const school = await prisma.schoolProfile.findUnique({
		where: {
			id: profile.schoolId,
		},
		select: {
			accountId: true,
		},
	});

	if (!school?.accountId) {
		return null;
	}

	return {
		accountId: school.accountId,
		schoolId: profile.schoolId,
		sessionId: profile.sessionId,
		termId: profile.termId,
	};
}

export type StaffDirectoryItem = Awaited<
	ReturnType<typeof getStaffDirectoryAction>
>["items"][number];

export async function getStaffDirectoryAction({
	category = "all",
	search,
}: {
	category?: StaffDirectoryCategory;
	search?: string | null;
} = {}) {
	const ctx = await getStaffContext();

	if (!ctx) {
		return {
			items: [] as Array<{
				id: string;
				name: string;
				title: string | null;
				email: string | null;
				phone: string | null;
				role: StaffRole;
				classroomCount: number;
				subjectCount: number;
				attendanceSessions: number;
				lastAttendanceAt: Date | null;
			}>,
			stats: {
				totalStaff: 0,
				teacherCount: 0,
				nonTeachingCount: 0,
				attendanceReadyCount: 0,
				recentAttendanceCount: 0,
			},
		};
	}

	const staffProfiles = await prisma.staffProfile.findMany({
		where: {
			AND: [
				whereStaff({
					schoolProfileId: ctx.schoolId,
					search: search ?? undefined,
				}),
				{
					termProfiles: {
						some: {
							deletedAt: null,
							schoolSessionId: ctx.sessionId,
							sessionTermId: ctx.termId,
						},
					},
				},
			],
		},
		select: {
			id: true,
			name: true,
			title: true,
			email: true,
			phone: true,
			termProfiles: {
				where: {
					deletedAt: null,
					schoolSessionId: ctx.sessionId,
					sessionTermId: ctx.termId,
				},
				select: {
					classroomsProfiles: {
						where: {
							deletedAt: null,
						},
						select: {
							id: true,
						},
					},
				},
			},
			subjects: {
				where: {
					deletedAt: null,
					departmentSubject: {
						sessionTermId: ctx.termId,
					},
				},
				select: {
					id: true,
				},
			},
			classRoomAttendanceList: {
				where: {
					deletedAt: null,
					department: {
						classRoom: {
							schoolSessionId: ctx.sessionId,
							deletedAt: null,
						},
					},
				},
				orderBy: {
					createdAt: "desc",
				},
				select: {
					id: true,
					createdAt: true,
				},
			},
		},
		orderBy: {
			name: "asc",
		},
	});

	const emails = staffProfiles
		.map((item) => item.email?.trim().toLowerCase())
		.filter(Boolean) as string[];

	const users = emails.length
		? await prisma.user.findMany({
				where: {
					deletedAt: null,
					saasAccountId: ctx.accountId,
					email: {
						in: emails,
					},
				},
				select: {
					email: true,
					role: true,
				},
			})
		: [];

	const roleByEmail = new Map(
		users.map((user) => [user.email.trim().toLowerCase(), normalizeRole(user.role)]),
	);

	const allItems = staffProfiles.map((staff) => {
		const role = normalizeRole(
			staff.email ? roleByEmail.get(staff.email.trim().toLowerCase()) : null,
		);
		const attendanceDates = staff.classRoomAttendanceList
			.map((attendance) => attendance.createdAt ?? null)
			.filter(Boolean) as Date[];

		return {
			id: staff.id,
			name: staff.name,
			title: staff.title,
			email: staff.email,
			phone: staff.phone,
			role,
			classroomCount:
				staff.termProfiles[0]?.classroomsProfiles.filter(Boolean).length ?? 0,
			subjectCount: staff.subjects.length,
			attendanceSessions: staff.classRoomAttendanceList.length,
			lastAttendanceAt: attendanceDates[0] ?? null,
		};
	});

	return {
		items: allItems.filter((item) => matchesCategory(item.role, category)),
		stats: {
			totalStaff: allItems.length,
			teacherCount: allItems.filter((item) => item.role === "Teacher").length,
			nonTeachingCount: allItems.filter((item) => nonTeachingRoles.has(item.role))
				.length,
			attendanceReadyCount: allItems.filter((item) => item.classroomCount > 0)
				.length,
			recentAttendanceCount: allItems.reduce(
				(total, item) => total + item.attendanceSessions,
				0,
			),
		},
	};
}

export type StaffDepartmentItem = Awaited<
	ReturnType<typeof getStaffDepartmentOverviewAction>
>["items"][number];

export async function getStaffDepartmentOverviewAction({
	search,
}: {
	search?: string | null;
} = {}) {
	const ctx = await getStaffContext();

	if (!ctx) {
		return {
			items: [] as Array<{
				id: string;
				className: string;
				departmentName: string;
				studentCount: number;
				subjectCount: number;
				teacherCount: number;
			}>,
			stats: {
				totalDepartments: 0,
				staffedDepartments: 0,
				totalStudents: 0,
				totalSubjects: 0,
			},
		};
	}

	const departments = await prisma.classRoomDepartment.findMany({
		where: {
			deletedAt: null,
			schoolProfileId: ctx.schoolId,
			OR: search
				? [
						{
							departmentName: {
								contains: search,
								mode: "insensitive",
							},
						},
						{
							classRoom: {
								name: {
									contains: search,
									mode: "insensitive",
								},
							},
						},
					]
				: undefined,
			classRoom: {
				deletedAt: null,
				schoolSessionId: ctx.sessionId,
			},
		},
		select: {
			id: true,
			departmentName: true,
			classRoom: {
				select: {
					name: true,
				},
			},
			_count: {
				select: {
					studentSessionForms: {
						where: {
							deletedAt: null,
							schoolSessionId: ctx.sessionId,
						},
					},
					subjects: {
						where: {
							deletedAt: null,
							sessionTermId: ctx.termId,
						},
					},
					staffTermProfiles: {
						where: {
							deletedAt: null,
							staffTermProfile: {
								deletedAt: null,
								schoolSessionId: ctx.sessionId,
								sessionTermId: ctx.termId,
							},
						},
					},
				},
			},
		},
		orderBy: [
			{
				classRoom: {
					name: "asc",
				},
			},
			{
				departmentName: "asc",
			},
		],
	});

	const items = departments.map((department) => ({
		id: department.id,
		className: department.classRoom?.name ?? "—",
		departmentName: department.departmentName ?? "—",
		studentCount: department._count.studentSessionForms,
		subjectCount: department._count.subjects,
		teacherCount: department._count.staffTermProfiles,
	}));

	return {
		items,
		stats: {
			totalDepartments: items.length,
			staffedDepartments: items.filter((item) => item.teacherCount > 0).length,
			totalStudents: items.reduce((total, item) => total + item.studentCount, 0),
			totalSubjects: items.reduce((total, item) => total + item.subjectCount, 0),
		},
	};
}
