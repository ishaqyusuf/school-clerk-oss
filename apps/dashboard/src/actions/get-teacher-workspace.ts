"use server";

import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { getSession } from "@/auth/server";
import { prisma } from "@school-clerk/db";

export async function getTeacherWorkspaceAction({
	search,
}: {
	search?: string | null;
} = {}) {
	const [cookie, session] = await Promise.all([getAuthCookie(), getSession()]);
	const schoolId = cookie.schoolId;
	const sessionId = cookie.sessionId;
	const termId = cookie.termId;
	const userEmail = session?.user?.email?.trim().toLowerCase();

	if (!schoolId || !sessionId || !termId || !userEmail) {
		return emptyTeacherWorkspace();
	}

	const staffProfile = await prisma.staffProfile.findFirst({
		where: {
			schoolProfileId: schoolId,
			deletedAt: null,
			email: {
				equals: userEmail,
				mode: "insensitive",
			},
		},
		select: {
			id: true,
			name: true,
			title: true,
			email: true,
			termProfiles: {
				where: {
					deletedAt: null,
					schoolSessionId: sessionId,
					sessionTermId: termId,
				},
				take: 1,
				select: {
					id: true,
					classroomsProfiles: {
						where: {
							deletedAt: null,
						},
						select: {
							classRoomDepartment: {
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
													schoolSessionId: sessionId,
												},
											},
											subjects: {
												where: {
													deletedAt: null,
													sessionTermId: termId,
												},
											},
										},
									},
								},
							},
						},
					},
				},
			},
			subjects: {
				where: {
					deletedAt: null,
					departmentSubject: {
						sessionTermId: termId,
					},
				},
				select: {
					departmentSubject: {
						select: {
							id: true,
							subject: {
								select: {
									title: true,
								},
							},
							classRoomDepartment: {
								select: {
									id: true,
									departmentName: true,
									classRoom: {
										select: {
											name: true,
										},
									},
								},
							},
						},
					},
				},
			},
			classRoomAttendanceList: {
				where: {
					deletedAt: null,
					department: {
						classRoom: {
							schoolSessionId: sessionId,
							deletedAt: null,
						},
					},
				},
				orderBy: {
					createdAt: "desc",
				},
				select: {
					id: true,
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
				},
				take: 8,
			},
		},
	});

	if (!staffProfile) {
		return emptyTeacherWorkspace();
	}

	const assignedClassrooms = staffProfile.termProfiles[0]?.classroomsProfiles
		.map((profile) => profile.classRoomDepartment)
		.filter(Boolean)
		.map((department) => ({
			id: department.id,
			className: department.classRoom?.name ?? "—",
			departmentName: department.departmentName ?? "—",
			studentCount: department._count.studentSessionForms,
			subjectCount: department._count.subjects,
		})) ?? [];

	const classroomIds = assignedClassrooms.map((classroom) => classroom.id);

	const studentDirectory = classroomIds.length
		? await prisma.studentTermForm.findMany({
				where: {
					deletedAt: null,
					schoolProfileId: schoolId,
					schoolSessionId: sessionId,
					sessionTermId: termId,
					classroomDepartmentId: {
						in: classroomIds,
					},
					student: search
						? {
								OR: [
									{
										name: {
											contains: search,
											mode: "insensitive",
										},
									},
									{
										surname: {
											contains: search,
											mode: "insensitive",
										},
									},
									{
										otherName: {
											contains: search,
											mode: "insensitive",
										},
									},
								],
							}
						: undefined,
				},
				select: {
					id: true,
					classroomDepartmentId: true,
					classroomDepartment: {
						select: {
							departmentName: true,
							classRoom: {
								select: {
									name: true,
								},
							},
						},
					},
					student: {
						select: {
							id: true,
							name: true,
							surname: true,
							otherName: true,
							gender: true,
						},
					},
				},
				orderBy: {
					student: {
						name: "asc",
					},
				},
			})
		: [];

	const assignedSubjects = staffProfile.subjects
		.map((item) => item.departmentSubject)
		.filter(Boolean)
		.map((subject) => ({
			id: subject.id,
			title: subject.subject.title,
			className: subject.classRoomDepartment?.classRoom?.name ?? "—",
			departmentName: subject.classRoomDepartment?.departmentName ?? "—",
		}));

	return {
		teacher: {
			id: staffProfile.id,
			name: staffProfile.name,
			title: staffProfile.title,
			email: staffProfile.email,
		},
		stats: {
			classroomCount: assignedClassrooms.length,
			subjectCount: assignedSubjects.length,
			studentCount: studentDirectory.length,
			attendanceSessions: staffProfile.classRoomAttendanceList.length,
		},
		classrooms: assignedClassrooms,
		subjects: assignedSubjects,
		students: studentDirectory.map((studentForm) => ({
			id: studentForm.id,
			name: [
				studentForm.student?.name,
				studentForm.student?.surname,
				studentForm.student?.otherName,
			]
				.filter(Boolean)
				.join(" "),
			gender: studentForm.student?.gender ?? "—",
			classroom: [
				studentForm.classroomDepartment?.classRoom?.name,
				studentForm.classroomDepartment?.departmentName,
			]
				.filter(Boolean)
				.join(" "),
		})),
		recentAttendance: staffProfile.classRoomAttendanceList.map((attendance) => ({
			id: attendance.id,
			title: attendance.attendanceTitle,
			classroom: [
				attendance.department?.classRoom?.name,
				attendance.department?.departmentName,
			]
				.filter(Boolean)
				.join(" "),
			createdAt: attendance.createdAt,
		})),
	};
}

function emptyTeacherWorkspace() {
	return {
		teacher: null,
		stats: {
			classroomCount: 0,
			subjectCount: 0,
			studentCount: 0,
			attendanceSessions: 0,
		},
		classrooms: [] as Array<{
			id: string;
			className: string;
			departmentName: string;
			studentCount: number;
			subjectCount: number;
		}>,
		subjects: [] as Array<{
			id: string;
			title: string;
			className: string;
			departmentName: string;
		}>,
		students: [] as Array<{
			id: string;
			name: string;
			gender: string;
			classroom: string;
		}>,
		recentAttendance: [] as Array<{
			id: string;
			title: string;
			classroom: string;
			createdAt: Date | null;
		}>,
	};
}
