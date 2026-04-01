import { z } from "@hono/zod-openapi";
import { createTRPCRouter, publicProcedure } from "../init";

const createStaffSchema = z.object({
	title: z.string(),
	name: z.string().min(0),
	email: z.string().optional(),
	phone: z.string().optional(),
	phone2: z.string().optional(),
	address: z.string().optional(),
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

export const staffRouter = createTRPCRouter({
	getFormData: publicProcedure
		.input(staffFormDataSchema)
		.query(async ({ input, ctx }) => {
			const { schoolId, sessionId, termId } = ctx.profile;

			if (!schoolId || !sessionId || !termId) {
				return {
					classrooms: [],
					roles: [],
					staff: null,
					subjects: [],
				};
			}

			const [classrooms, subjects, school, staffProfile] = await Promise.all([
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
									},
								},
							},
						})
					: Promise.resolve(null),
			]);

			const role = staffProfile?.email
				? (
						await ctx.db.user.findFirst({
							where: {
								email: staffProfile.email,
								saasAccountId: school?.accountId,
								deletedAt: null,
							},
							select: {
								role: true,
							},
						})
					)?.role
				: null;

			return {
				roles: [
					"Admin",
					"Teacher",
					"Accountant",
					"Registrar",
					"HR",
					"Staff",
					"Support",
				],
				classrooms: classrooms.map((classroom) => ({
					label: [classroom.classRoom?.name, classroom.departmentName]
						.filter(Boolean)
						.join(" "),
					value: classroom.id,
				})),
				subjects: subjects.map((subject) => ({
					label: [
						subject.subject.title,
						[
							subject.classRoomDepartment?.classRoom?.name,
							subject.classRoomDepartment?.departmentName,
						]
							.filter(Boolean)
							.join(" "),
					]
						.filter(Boolean)
						.join(" — "),
					value: subject.id,
				})),
				staff: staffProfile
					? {
							...staffProfile,
							classRoomDepartmentIds:
								staffProfile.termProfiles[0]?.classroomsProfiles
									.map((profile) => profile.classRoomDepartmentId)
									.filter(Boolean) ?? [],
							departmentSubjectIds:
								staffProfile.subjects
									.map((subject) => subject.departmentSubjectId)
									.filter(Boolean) ?? [],
							role: role ?? "Teacher",
							sendInvite: false,
						}
					: null,
			};
		}),
	getStaffList: publicProcedure
		.input(z.object({ q: z.string().optional() }).optional())
		.query(async ({ input, ctx }) => {
			const { schoolId, sessionId, termId } = ctx.profile;
			const staff = await ctx.db.staffProfile.findMany({
				where: {
					schoolProfileId: schoolId,
					deletedAt: null,
					name: input?.q
						? { contains: input.q, mode: "insensitive" }
						: undefined,
				},
				select: {
					id: true,
					name: true,
					title: true,
					termProfiles: {
						where: {
							deletedAt: null,
							schoolSessionId: sessionId,
							sessionTermId: termId,
						},
						take: 1,
						select: { id: true },
					},
				},
				orderBy: { name: "asc" },
			});
			return staff.map(({ termProfiles, ...s }) => ({
				...s,
				staffSessionId: termProfiles?.[0]?.id,
				staffTermId: termProfiles?.[0]?.id,
			}));
		}),

	createStaff: publicProcedure
		.input(createStaffSchema)
		.mutation(async ({ input, ctx }) => {
			const { schoolId, sessionId, termId } = ctx.profile;
			if (!schoolId || !sessionId || !termId) {
				throw new Error("Missing school context.");
			}
			return ctx.db.staffProfile.create({
				data: {
					title: input.title,
					name: input.name,
					email: input.email,
					schoolProfileId: schoolId,
					termProfiles: {
						create: {
							schoolSessionId: sessionId,
							sessionTermId: termId,
						},
					},
				},
			});
		}),

	deleteStaff: publicProcedure
		.input(deleteStaffSchema)
		.mutation(async ({ input, ctx }) => {
			await ctx.db.staffProfile.update({
				where: { id: input.staffId },
				data: {
					deletedAt: input.termProfileId ? undefined : new Date(),
					termProfiles: {
						updateMany: {
							where: {
								id: input.termProfileId ? input.termProfileId : undefined,
							},
							data: { deletedAt: new Date() },
						},
					},
				},
			});
			return { success: true };
		}),
});
