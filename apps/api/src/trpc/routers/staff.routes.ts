import { z } from "@hono/zod-openapi";
import {
	mapStaffAcademicAccessGrantsToAssignments,
	resolveStaffAcademicAccess,
} from "@school-clerk/db";
import {
	STAFF_CLASSROOM_SUBJECT_ACCESS_MODES,
	STAFF_ASSIGNMENT_ROLES,
	STAFF_ROLES,
	type StaffRole,
} from "@school-clerk/utils/constants";
import { classroomDisplayName } from "@school-clerk/utils";
import { createTRPCRouter, publicProcedure } from "../init";

function normalizeRole(role?: string | null): StaffRole {
	return STAFF_ROLES.includes(role as StaffRole)
		? (role as StaffRole)
		: "Teacher";
}

function roleSupportsAssignments(role: string) {
	return STAFF_ASSIGNMENT_ROLES.includes(
		role as (typeof STAFF_ASSIGNMENT_ROLES)[number],
	);
}

function resolveOnboardingStatus({
	inviteStatus,
	inviteSentAt,
	lastInviteError,
	onboardedAt,
	user,
}: {
	inviteStatus?: string | null;
	inviteSentAt?: Date | null;
	lastInviteError?: string | null;
	onboardedAt?: Date | null;
	user?:
		| {
				emailVerified?: boolean | null;
				password?: string | null;
				accounts?: Array<{ password?: string | null }>;
				sessions?: Array<{ id: string }>;
		  }
		| null
		| undefined;
}) {
	const hasCredentials = Boolean(
		onboardedAt ||
			user?.emailVerified ||
			user?.password ||
			user?.accounts?.some((account) => Boolean(account.password)) ||
			user?.sessions?.length,
	);

	if (hasCredentials) return "ACTIVE" as const;
	if (inviteStatus === "FAILED" || lastInviteError) return "FAILED" as const;
	if (inviteStatus === "PENDING" || inviteSentAt) return "PENDING" as const;
	return "NOT_SENT" as const;
}

const createStaffSchema = z.object({
	email: z.string().email(),
	role: z.enum(STAFF_ROLES).default("Teacher"),
	assignments: z
		.array(
			z.object({
				scope: z
					.enum(["CLASS", "DEPARTMENT", "CLASS_SUBJECT", "DEPARTMENT_SUBJECT"])
					.default("DEPARTMENT"),
				classRoomId: z.string().optional().nullable(),
				classRoomDepartmentId: z.string().optional().nullable(),
				subjectId: z.string().optional().nullable(),
				departmentSubjectId: z.string().optional().nullable(),
				subjectAccessMode: z
					.enum(STAFF_CLASSROOM_SUBJECT_ACCESS_MODES)
					.default("SELECTED"),
				departmentSubjectIds: z.array(z.string()).default([]),
			}),
		)
		.default([]),
});

const deleteStaffSchema = z.object({
	staffId: z.string(),
	termProfileId: z.string().optional(),
});

const staffFormDataSchema = z
	.object({
		staffId: z.string().optional(),
	})
	.optional();

const staffListSchema = z
	.object({
		q: z.string().optional(),
		status: z.enum(["all", "pending", "active", "failed"]).optional(),
	})
	.optional();

export const staffRouter = createTRPCRouter({
	getFormData: publicProcedure
		.input(staffFormDataSchema)
		.query(async ({ input, ctx }) => {
			const { schoolId, sessionId, termId } = ctx.profile;

			if (!schoolId || !sessionId || !termId) {
				return {
					classes: [],
					classrooms: [],
					roles: [],
					staff: null,
					subjects: [],
					subjectsByClass: {},
					subjectsByClassroom: {},
				};
			}

			const [classes, classrooms, subjects, school, staffProfile] = await Promise.all([
				ctx.db.classRoom.findMany({
					where: {
						deletedAt: null,
						schoolProfileId: schoolId,
						schoolSessionId: sessionId,
					},
					select: {
						id: true,
						name: true,
					},
					orderBy: {
						name: "asc",
					},
				}),
				ctx.db.classRoomDepartment.findMany({
					where: {
						deletedAt: null,
						schoolProfileId: schoolId,
						classRoom: {
							deletedAt: null,
							schoolSessionId: sessionId,
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
				}),
				ctx.db.departmentSubject.findMany({
					where: {
						deletedAt: null,
						sessionTermId: termId,
						classRoomDepartment: {
							deletedAt: null,
							schoolProfileId: schoolId,
						},
					},
					select: {
						id: true,
						classRoomDepartmentId: true,
						subjectId: true,
						subject: {
							select: {
								title: true,
							},
						},
						classRoomDepartment: {
							select: {
								departmentName: true,
								classRoom: {
									select: {
										id: true,
										name: true,
									},
								},
							},
						},
					},
					orderBy: [
						{
							classRoomDepartment: {
								classRoom: {
									name: "asc",
								},
							},
						},
						{
							subject: {
								title: "asc",
							},
						},
					],
				}),
				ctx.db.schoolProfile.findUnique({
					where: {
						id: schoolId,
					},
					select: {
						accountId: true,
					},
				}),
				input?.staffId
					? ctx.db.staffProfile.findFirst({
							where: {
								id: input.staffId,
								schoolProfileId: schoolId,
								deletedAt: null,
							},
							select: {
								id: true,
								name: true,
								title: true,
								email: true,
								phone: true,
								phone2: true,
								address: true,
								inviteStatus: true,
								inviteSentAt: true,
								inviteResentAt: true,
								lastInviteError: true,
								onboardedAt: true,
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
												classRoomDepartmentId: true,
												subjectAccessMode: true,
											},
										},
										academicAccessGrants: {
											where: {
												deletedAt: null,
											},
											select: {
												scope: true,
												classRoomId: true,
												classRoomDepartmentId: true,
												subjectId: true,
												departmentSubjectId: true,
												departmentSubject: {
													select: {
														classRoomDepartmentId: true,
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
										departmentSubjectId: true,
										departmentSubject: {
											select: {
												classRoomDepartmentId: true,
											},
										},
									},
								},
							},
						})
					: Promise.resolve(null),
			]);

			const user =
				staffProfile?.email && school?.accountId
					? await ctx.db.user.findFirst({
							where: {
								email: staffProfile.email,
								saasAccountId: school.accountId,
								deletedAt: null,
							},
							select: {
								role: true,
								emailVerified: true,
								password: true,
								accounts: {
									select: {
										password: true,
									},
								},
								sessions: {
									take: 1,
									select: {
										id: true,
									},
								},
							},
						})
					: null;

			const role = normalizeRole(user?.role);
			const selectedSubjectsByClassroom = new Map<string, string[]>();

			for (const subject of staffProfile?.subjects ?? []) {
				const classroomId = subject.departmentSubject?.classRoomDepartmentId;
				const subjectId = subject.departmentSubjectId;
				if (!classroomId || !subjectId) continue;

				const next = selectedSubjectsByClassroom.get(classroomId) ?? [];
				next.push(subjectId);
				selectedSubjectsByClassroom.set(classroomId, next);
			}

			const classroomOptions = classrooms.map((classroom) => ({
				label: classroomDisplayName({
					className: classroom.classRoom?.name,
					departmentName: classroom.departmentName,
				}),
				value: classroom.id,
			}));
			const classOptions = classes.map((classroom) => ({
				label: classroom.name ?? "Untitled class",
				value: classroom.id,
			}));

			const subjectsByClassroom = subjects.reduce<
				Record<string, Array<{ label: string; value: string }>>
			>((acc, subject) => {
				const classroomDepartmentId = subject.classRoomDepartmentId;
				if (!classroomDepartmentId) return acc;

				acc[classroomDepartmentId] ??= [];
				acc[classroomDepartmentId]!.push({
					label: subject.subject.title,
					value: subject.id,
				});
				return acc;
			}, {});
			const subjectsByClass = subjects.reduce<
				Record<string, Array<{ label: string; value: string }>>
			>((acc, subject) => {
				const classId = subject.classRoomDepartment?.classRoom?.id;
				if (!classId) return acc;

				acc[classId] ??= [];
				if (
					!acc[classId]!.some((option) => option.value === subject.subjectId)
				) {
					acc[classId]!.push({
						label: subject.subject.title,
						value: subject.subjectId,
					});
				}
				return acc;
			}, {});
			const subjectOptions = Array.from(
				new Map(
					subjects.map((subject) => [
						subject.subjectId,
						{
							label: subject.subject.title,
							value: subject.subjectId,
						},
					]),
				).values(),
			).sort((a, b) => a.label.localeCompare(b.label));

			const legacyAssignments = (
				staffProfile?.termProfiles[0]?.classroomsProfiles ?? []
			).map((profile) => ({
				scope: "DEPARTMENT",
				classRoomDepartmentId: profile.classRoomDepartmentId ?? "",
				subjectAccessMode: profile.subjectAccessMode ?? "SELECTED",
				departmentSubjectIds:
					profile.subjectAccessMode === "ALL"
						? []
						: (selectedSubjectsByClassroom.get(
								profile.classRoomDepartmentId ?? "",
							) ?? []),
			}));
			const academicGrantAssignments = mapStaffAcademicAccessGrantsToAssignments(
				staffProfile?.termProfiles[0]?.academicAccessGrants ?? [],
			);
			const assignments = academicGrantAssignments.length
				? academicGrantAssignments
				: legacyAssignments;
			const effectiveAccess =
				staffProfile?.termProfiles[0] && roleSupportsAssignments(role)
					? await resolveStaffAcademicAccess({
							db: ctx.db,
							staffProfileId: staffProfile.id,
							schoolProfileId: schoolId,
							schoolSessionId: sessionId,
							sessionTermId: termId,
						})
					: null;

			return {
				roles: [...STAFF_ROLES],
				classes: classOptions,
				classrooms: classroomOptions,
				subjects: subjectOptions,
				subjectsByClass,
				subjectsByClassroom,
				staff: staffProfile
					? {
							id: staffProfile.id,
							name: staffProfile.name,
							title: staffProfile.title,
							email: staffProfile.email,
							phone: staffProfile.phone,
							phone2: staffProfile.phone2,
							address: staffProfile.address,
							role,
							assignments,
							effectiveClassroomCount:
								effectiveAccess?.classRoomDepartmentIds.length ?? assignments.length,
							effectiveSubjectCount:
								effectiveAccess?.departmentSubjectIds.length ??
								assignments.reduce(
									(total, assignment) =>
										total + assignment.departmentSubjectIds.length,
									0,
								),
							onboardingStatus: resolveOnboardingStatus({
								inviteStatus: staffProfile.inviteStatus,
								inviteSentAt: staffProfile.inviteSentAt,
								lastInviteError: staffProfile.lastInviteError,
								onboardedAt: staffProfile.onboardedAt,
								user,
							}),
							inviteSentAt: staffProfile.inviteSentAt,
							inviteResentAt: staffProfile.inviteResentAt,
							onboardedAt: staffProfile.onboardedAt,
							lastInviteError: staffProfile.lastInviteError,
							canManageAssignments: roleSupportsAssignments(role),
						}
					: null,
			};
		}),
	getStaffList: publicProcedure
		.input(staffListSchema)
		.query(async ({ input, ctx }) => {
			const { schoolId, sessionId, termId } = ctx.profile;
			const school = schoolId
				? await ctx.db.schoolProfile.findUnique({
						where: {
							id: schoolId,
						},
						select: {
							accountId: true,
						},
					})
				: null;
			const staff = await ctx.db.staffProfile.findMany({
				where: {
					schoolProfileId: schoolId,
					deletedAt: null,
					OR: input?.q
						? [
								{
									name: {
										contains: input.q,
										mode: "insensitive",
									},
								},
								{
									email: {
										contains: input.q,
										mode: "insensitive",
									},
								},
							]
						: undefined,
				},
				select: {
					id: true,
					name: true,
					title: true,
					email: true,
					inviteStatus: true,
					inviteSentAt: true,
					inviteResentAt: true,
					lastInviteError: true,
					onboardedAt: true,
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
									classRoomDepartmentId: true,
									subjectAccessMode: true,
									classRoomDepartment: {
										select: {
											departmentName: true,
											classRoom: {
												select: {
													name: true,
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
							departmentSubjectId: true,
							departmentSubject: {
								select: {
									subject: {
										select: {
											title: true,
										},
									},
								},
							},
						},
					},
				},
				orderBy: { name: "asc" },
			});

			const emails = staff
				.map((item) => item.email?.trim().toLowerCase())
				.filter(Boolean) as string[];

			const users = emails.length
				? await ctx.db.user.findMany({
						where: {
							deletedAt: null,
							saasAccountId: school?.accountId,
							email: {
								in: emails,
							},
						},
						select: {
							email: true,
							role: true,
							emailVerified: true,
							password: true,
							accounts: {
								select: {
									password: true,
								},
							},
							sessions: {
								take: 1,
								select: {
									id: true,
								},
							},
						},
					})
				: [];

			const userByEmail = new Map(
				users.map((user) => [user.email.trim().toLowerCase(), user]),
			);

			const items = await Promise.all(staff.map(async (item) => {
				const normalizedEmail = item.email?.trim().toLowerCase();
				const user = normalizedEmail ? userByEmail.get(normalizedEmail) : null;
				const role = normalizeRole(user?.role);
				const onboardingStatus = resolveOnboardingStatus({
					inviteStatus: item.inviteStatus,
					inviteSentAt: item.inviteSentAt,
					lastInviteError: item.lastInviteError,
					onboardedAt: item.onboardedAt,
					user,
				});
				const classrooms = item.termProfiles[0]?.classroomsProfiles ?? [];
				const termProfile = item.termProfiles[0];
				let classroomLabels = classrooms
					.map((classroom) =>
						classroomDisplayName({
							className: classroom.classRoomDepartment?.classRoom?.name,
							departmentName: classroom.classRoomDepartment?.departmentName,
						}),
					)
					.filter(Boolean);
				let subjectLabels = Array.from(
					new Set(
						item.subjects
							.map((subject) => subject.departmentSubject?.subject?.title)
							.filter(Boolean),
					),
				) as string[];
				let hasClassroomWideSubjectAccess = classrooms.some(
					(classroom) => classroom.subjectAccessMode === "ALL",
				);

				if (
					roleSupportsAssignments(role) &&
					termProfile &&
					schoolId &&
					sessionId &&
					termId
				) {
					const access = await resolveStaffAcademicAccess({
						db: ctx.db,
						staffProfileId: item.id,
						schoolProfileId: schoolId,
						schoolSessionId: sessionId,
						sessionTermId: termId,
					});
					const [effectiveClassrooms, effectiveSubjects] = await Promise.all([
						access.classRoomDepartmentIds.length
							? ctx.db.classRoomDepartment.findMany({
									where: {
										id: {
											in: access.classRoomDepartmentIds,
										},
										deletedAt: null,
										schoolProfileId: schoolId,
									},
									select: {
										departmentName: true,
										classRoom: {
											select: {
												name: true,
											},
										},
									},
								})
							: Promise.resolve([]),
						access.departmentSubjectIds.length
							? ctx.db.departmentSubject.findMany({
									where: {
										id: {
											in: access.departmentSubjectIds,
										},
										deletedAt: null,
										sessionTermId: termId,
									},
									select: {
										subject: {
											select: {
												title: true,
											},
										},
									},
								})
							: Promise.resolve([]),
					]);

					classroomLabels = effectiveClassrooms
						.map((classroom) =>
							classroomDisplayName({
								className: classroom.classRoom?.name,
								departmentName: classroom.departmentName,
							}),
						)
						.filter(Boolean);
					subjectLabels = Array.from(
						new Set(
							effectiveSubjects
								.map((subject) => subject.subject?.title)
								.filter(Boolean),
						),
					) as string[];
					hasClassroomWideSubjectAccess =
						hasClassroomWideSubjectAccess ||
						access.departmentSubjectIds.length > item.subjects.length;
				}

				return {
					id: item.id,
					name: item.name,
					title: item.title,
					email: item.email,
					staffTermId: item.termProfiles[0]?.id ?? null,
					role,
					onboardingStatus,
					inviteSentAt: item.inviteSentAt,
					inviteResentAt: item.inviteResentAt,
					lastInviteError: item.lastInviteError,
					classroomCount: classroomLabels.length,
					subjectCount: subjectLabels.length,
					hasClassroomWideSubjectAccess,
					classroomLabels,
					subjectLabels,
					canResend:
						Boolean(item.email) &&
						(onboardingStatus === "PENDING" || onboardingStatus === "FAILED"),
					canManageAssignments: roleSupportsAssignments(role),
				};
			}));

			const filteredItems =
				input?.status && input.status !== "all"
					? items.filter((item) => {
							if (input.status === "pending") {
								return item.onboardingStatus === "PENDING";
							}
							if (input.status === "active") {
								return item.onboardingStatus === "ACTIVE";
							}
							if (input.status === "failed") {
								return item.onboardingStatus === "FAILED";
							}
							return true;
						})
					: items;

			return {
				items: filteredItems,
				stats: {
					total: items.length,
					pending: items.filter((item) => item.onboardingStatus === "PENDING")
						.length,
					active: items.filter((item) => item.onboardingStatus === "ACTIVE")
						.length,
					failed: items.filter((item) => item.onboardingStatus === "FAILED")
						.length,
					teachersNeedingAssignments: items.filter(
						(item) =>
							item.role === "Teacher" &&
							(item.classroomCount === 0 || item.subjectCount === 0),
					).length,
				},
			};
		}),

	createStaff: publicProcedure
		.input(createStaffSchema)
		.mutation(async ({ input, ctx }) => {
			const { schoolId } = ctx.profile;
			if (!schoolId) {
				throw new Error("Missing school context.");
			}
			return ctx.db.staffProfile.create({
				data: {
					name: input.email.split("@")[0] ?? "Pending staff",
					email: input.email,
					schoolProfileId: schoolId,
					inviteStatus: "NOT_SENT",
				},
			});
		}),

	deleteStaff: publicProcedure
		.input(deleteStaffSchema)
		.mutation(async ({ input, ctx }) => {
			await ctx.db.staffProfile.update({
				where: {
					id: input.staffId,
				},
				data: {
					deletedAt: new Date(),
				},
			});

			return {
				success: true,
			};
		}),
});
