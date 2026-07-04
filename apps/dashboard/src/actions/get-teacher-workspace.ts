"use server";

import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { getSession } from "@/auth/server";
import { prisma } from "@school-clerk/db";
import { classroomDisplayName } from "@school-clerk/utils";

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
		return emptyTeacherWorkspace(userEmail ?? null);
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
							subjectAccessMode: true,
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
									subjects: {
										where: {
											deletedAt: null,
											sessionTermId: termId,
										},
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
											_count: {
												select: {
													assessments: {
														where: { deletedAt: null },
													},
												},
											},
											assessments: {
												where: { deletedAt: null },
												select: {
													_count: {
														select: {
															assessmentResults: {
																where: { deletedAt: null },
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
							_count: {
								select: {
									assessments: {
										where: { deletedAt: null },
									},
								},
							},
							assessments: {
								where: { deletedAt: null },
								select: {
									_count: {
										select: {
											assessmentResults: {
												where: { deletedAt: null },
											},
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
		return emptyTeacherWorkspace(userEmail);
	}

	const assignedClassrooms = staffProfile.termProfiles[0]?.classroomsProfiles
		.map((profile) => profile.classRoomDepartment)
		.filter(Boolean)
		.map((department) => ({
			id: department.id,
			className: department.classRoom?.name ?? "—",
			departmentName: department.departmentName ?? "—",
      displayName: classroomDisplayName({
        className: department.classRoom?.name,
        departmentName: department.departmentName,
      }),
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

	const assignedSubjectMap = new Map<
		string,
		{
			id: string;
			title: string;
			classRoomDepartmentId: string;
			className: string;
			departmentName: string;
			displayName: string;
			numberOfAssessments: number;
			numberOfRecordings: number;
		}
	>();

	const mapAssignedSubject = (subject: {
		id: string;
		subject: { title: string };
		classRoomDepartment: {
			id: string;
			departmentName: string | null;
			classRoom: { name: string | null } | null;
		} | null;
		_count: { assessments: number };
		assessments: Array<{
			_count: {
				assessmentResults: number;
			};
		}>;
	}) => {
		let numberOfRecordings = 0;
		subject.assessments.forEach((assessment) => {
			numberOfRecordings += assessment._count.assessmentResults;
		});

		return {
			id: subject.id,
			title: subject.subject.title,
			classRoomDepartmentId: subject.classRoomDepartment?.id ?? "",
			className: subject.classRoomDepartment?.classRoom?.name ?? "—",
			departmentName: subject.classRoomDepartment?.departmentName ?? "—",
			displayName: classroomDisplayName({
				className: subject.classRoomDepartment?.classRoom?.name,
				departmentName: subject.classRoomDepartment?.departmentName,
			}),
			numberOfAssessments: subject._count.assessments,
			numberOfRecordings,
		};
	};

	for (const item of staffProfile.subjects) {
		const subject = item.departmentSubject;
		if (!subject) continue;

		assignedSubjectMap.set(subject.id, mapAssignedSubject(subject));
	}

	for (const assignment of staffProfile.termProfiles[0]?.classroomsProfiles ??
		[]) {
		if (assignment.subjectAccessMode !== "ALL") continue;

		for (const subject of assignment.classRoomDepartment?.subjects ?? []) {
			assignedSubjectMap.set(subject.id, mapAssignedSubject(subject));
		}
	}

	const assignedSubjects = Array.from(assignedSubjectMap.values()).sort((a, b) =>
		`${a.displayName} ${a.title}`.localeCompare(`${b.displayName} ${b.title}`),
	);

	return {
		teacher: {
			id: staffProfile.id,
			name: staffProfile.name,
			title: staffProfile.title,
			email: staffProfile.email,
		},
		signedInEmail: userEmail,
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
			studentId: studentForm.student?.id ?? "",
			classroomDepartmentId: studentForm.classroomDepartmentId ?? "",
			name: [
				studentForm.student?.name,
				studentForm.student?.surname,
				studentForm.student?.otherName,
			]
				.filter(Boolean)
				.join(" "),
			gender: studentForm.student?.gender ?? "—",
			classroom: [
				classroomDisplayName({
					className: studentForm.classroomDepartment?.classRoom?.name,
					departmentName: studentForm.classroomDepartment?.departmentName,
				}),
			]
				.filter(Boolean)
				.join(" "),
		})),
		recentAttendance: staffProfile.classRoomAttendanceList.map((attendance) => ({
			id: attendance.id,
			title: attendance.attendanceTitle,
			classroom: [
				classroomDisplayName({
					className: attendance.department?.classRoom?.name,
					departmentName: attendance.department?.departmentName,
				}),
			]
				.filter(Boolean)
				.join(" "),
			createdAt: attendance.createdAt,
		})),
	};
}

function emptyTeacherWorkspace(signedInEmail: string | null) {
	return {
		teacher: null,
		signedInEmail,
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
      displayName: string;
			studentCount: number;
			subjectCount: number;
		}>,
		subjects: [] as Array<{
			id: string;
			title: string;
			classRoomDepartmentId: string;
			className: string;
			departmentName: string;
      displayName: string;
			numberOfAssessments: number;
			numberOfRecordings: number;
		}>,
		students: [] as Array<{
			id: string;
			studentId: string;
			classroomDepartmentId: string;
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
