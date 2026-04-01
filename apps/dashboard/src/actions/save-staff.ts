"use server";

import { staffChanged } from "@/actions/cache/cache-control";
import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { actionClient } from "@/actions/safe-action";
import { createStaffSchema } from "@/actions/schema";
import { auth } from "@/auth/server";
import { headers } from "next/headers";

import { prisma } from "@school-clerk/db";

function emptyToUndefined(value?: string | null) {
	const normalized = value?.trim();
	return normalized ? normalized : undefined;
}

async function getCurrentOrigin() {
	const requestHeaders = await headers();
	const host =
		requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
	const proto =
		requestHeaders.get("x-forwarded-proto") ??
		(host.includes("localhost") ? "http" : "https");

	return `${proto}://${host}`;
}

export const saveStaffAction = actionClient
	.schema(createStaffSchema)
	.action(async ({ parsedInput }) => {
		const profile = await getAuthCookie();

		if (!profile.schoolId || !profile.sessionId || !profile.termId) {
			throw new Error("Missing active school session context.");
		}

		const school = await prisma.schoolProfile.findUnique({
			where: {
				id: profile.schoolId,
			},
			select: {
				id: true,
				accountId: true,
			},
		});

		if (!school) {
			throw new Error("School not found.");
		}

		const payload = {
			...parsedInput,
			email: emptyToUndefined(parsedInput.email),
			phone: emptyToUndefined(parsedInput.phone),
			phone2: emptyToUndefined(parsedInput.phone2),
			address: emptyToUndefined(parsedInput.address),
			classRoomDepartmentIds: [...new Set(parsedInput.classRoomDepartmentIds)],
			departmentSubjectIds: [...new Set(parsedInput.departmentSubjectIds)],
		};

		const savedStaff = await prisma.$transaction(async (tx) => {
			if (payload.staffId) {
				const existingStaff = await tx.staffProfile.findFirst({
					where: {
						id: payload.staffId,
						schoolProfileId: profile.schoolId,
						deletedAt: null,
					},
					select: {
						id: true,
					},
				});

				if (!existingStaff) {
					throw new Error("Staff record not found.");
				}
			}

			const [validClassroomIds, validSubjectIds] = await Promise.all([
				tx.classRoomDepartment.findMany({
					where: {
						id: {
							in: payload.classRoomDepartmentIds,
						},
						deletedAt: null,
						schoolProfileId: profile.schoolId,
						classRoom: {
							schoolSessionId: profile.sessionId,
							deletedAt: null,
						},
					},
					select: {
						id: true,
					},
				}),
				tx.departmentSubject.findMany({
					where: {
						id: {
							in: payload.departmentSubjectIds,
						},
						deletedAt: null,
						sessionTermId: profile.termId,
						classRoomDepartment: {
							deletedAt: null,
							schoolProfileId: profile.schoolId,
						},
					},
					select: {
						id: true,
					},
				}),
			]);

			const classroomIds = validClassroomIds.map((item) => item.id);
			const subjectIds = validSubjectIds.map((item) => item.id);

			const staffProfile = payload.staffId
				? await tx.staffProfile.update({
						where: {
							id: payload.staffId,
						},
						data: {
							title: payload.title,
							name: payload.name,
							email: payload.email,
							phone: payload.phone,
							phone2: payload.phone2,
							address: payload.address,
						},
					})
				: await tx.staffProfile.create({
						data: {
							title: payload.title,
							name: payload.name,
							email: payload.email,
							phone: payload.phone,
							phone2: payload.phone2,
							address: payload.address,
							schoolProfileId: profile.schoolId,
						},
					});

			const termProfile =
				(await tx.staffTermProfile.findFirst({
					where: {
						staffProfileId: staffProfile.id,
						schoolSessionId: profile.sessionId,
						sessionTermId: profile.termId,
						deletedAt: null,
					},
					select: {
						id: true,
					},
				})) ??
				(await tx.staffTermProfile.create({
					data: {
						staffProfileId: staffProfile.id,
						schoolSessionId: profile.sessionId,
						sessionTermId: profile.termId,
					},
					select: {
						id: true,
					},
				}));

			await tx.staffClassroomDepartmentTermProfiles.updateMany({
				where: {
					staffTermProfileId: termProfile.id,
					deletedAt: null,
				},
				data: {
					deletedAt: new Date(),
				},
			});

			if (classroomIds.length) {
				await tx.staffClassroomDepartmentTermProfiles.createMany({
					data: classroomIds.map((classRoomDepartmentId) => ({
						staffTermProfileId: termProfile.id,
						classRoomDepartmentId,
					})),
				});
			}

			await tx.staffSubject.updateMany({
				where: {
					staffProfilesId: staffProfile.id,
					deletedAt: null,
					departmentSubject: {
						sessionTermId: profile.termId,
					},
				},
				data: {
					deletedAt: new Date(),
				},
			});

			if (subjectIds.length) {
				await tx.staffSubject.createMany({
					data: subjectIds.map((departmentSubjectId) => ({
						staffProfilesId: staffProfile.id,
						departmentSubjectId,
					})),
				});
			}

			if (payload.email) {
				const existingUser = await tx.user.findFirst({
					where: {
						email: payload.email,
						saasAccountId: school.accountId,
						deletedAt: null,
					},
					select: {
						id: true,
					},
				});

				if (existingUser) {
					await tx.user.update({
						where: {
							id: existingUser.id,
						},
						data: {
							name: payload.name,
							role: payload.role,
						},
					});
				} else {
					await tx.user.create({
						data: {
							name: payload.name,
							email: payload.email,
							role: payload.role,
							saasAccountId: school.accountId,
						},
					});
				}
			}

			return {
				id: staffProfile.id,
			};
		});

		let invited = false;
		let inviteError: string | null = null;

		if (payload.sendInvite && payload.email) {
			try {
				const currentOrigin = await getCurrentOrigin();
				const requestHeaders = new Headers(await headers());
				requestHeaders.set("origin", currentOrigin);

				await auth.api.requestPasswordReset({
					body: {
						email: payload.email,
						redirectTo: `${currentOrigin}/reset-password`,
					},
					headers: requestHeaders,
				});
				invited = true;
			} catch (error) {
				inviteError =
					error instanceof Error
						? error.message
						: "Failed to send invite email.";
			}
		}

		staffChanged();

		return {
			invited,
			inviteError,
			staffId: savedStaff.id,
		};
	});
