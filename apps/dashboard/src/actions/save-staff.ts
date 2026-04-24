"use server";

import { staffChanged } from "@/actions/cache/cache-control";
import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { actionClient } from "@/actions/safe-action";
import {
	completeStaffOnboardingSchema,
	createStaffSchema,
	staffRoleSchema,
} from "@/actions/schema";
import { auth } from "@/auth/server";
import { headers } from "next/headers";
import { z } from "zod";

import { prisma } from "@school-clerk/db";
import { createNotificationFromType } from "@school-clerk/notifications";
import {
	STAFF_ASSIGNMENT_ROLES,
	type StaffInviteStatus,
} from "@school-clerk/utils/constants";

function emptyToUndefined(value?: string | null) {
	const normalized = value?.trim();
	return normalized ? normalized : undefined;
}

function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

function roleSupportsAssignments(role: string) {
	return STAFF_ASSIGNMENT_ROLES.includes(
		role as (typeof STAFF_ASSIGNMENT_ROLES)[number],
	);
}

function buildPendingStaffName(email: string) {
	const localPart = email.split("@")[0] ?? "staff";
	const formatted = localPart
		.replace(/[._-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();

	if (!formatted) {
		return "Pending staff";
	}

	return formatted.replace(/\b\w/g, (match) => match.toUpperCase());
}

function dedupeAssignments(
	assignments: Array<{
		classRoomDepartmentId: string;
		departmentSubjectIds: string[];
	}>,
) {
	const map = new Map<string, Set<string>>();

	for (const assignment of assignments) {
		const classroomId = assignment.classRoomDepartmentId?.trim();
		if (!classroomId) continue;

		const subjects = map.get(classroomId) ?? new Set<string>();
		for (const subjectId of assignment.departmentSubjectIds ?? []) {
			if (subjectId?.trim()) {
				subjects.add(subjectId);
			}
		}
		map.set(classroomId, subjects);
	}

	return Array.from(map.entries()).map(
		([classRoomDepartmentId, departmentSubjectIds]) => ({
			classRoomDepartmentId,
			departmentSubjectIds: Array.from(departmentSubjectIds),
		}),
	);
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

async function sendOnboardingInvite({
	email,
	staffId,
}: {
	email: string;
	staffId: string;
}) {
	const currentOrigin = await getCurrentOrigin();
	const requestHeaders = new Headers(await headers());
	requestHeaders.set("origin", currentOrigin);

	const redirectTo = new URL(`${currentOrigin}/reset-password`);
	redirectTo.searchParams.set("onboarding", "1");
	redirectTo.searchParams.set("staffId", staffId);
	redirectTo.searchParams.set("email", email);

	await auth.api.requestPasswordReset({
		body: {
			email,
			redirectTo: redirectTo.toString(),
		},
		headers: requestHeaders,
	});
}

function inviteErrorMessage(error: unknown) {
	return error instanceof Error
		? error.message
		: "Failed to send onboarding email. Please verify the email address and try again.";
}

async function syncInviteState({
	staffId,
	status,
	error,
	resent,
}: {
	staffId: string;
	status: StaffInviteStatus;
	error?: string | null;
	resent?: boolean;
}) {
	const now = new Date();
	await prisma.staffProfile.update({
		where: {
			id: staffId,
		},
		data: {
			inviteStatus: status,
			inviteSentAt: status === "PENDING" ? now : undefined,
			inviteResentAt: resent ? now : undefined,
			lastInviteError: error ?? null,
		},
	});
}

async function createStaffInvitationNotification(input: {
	payload: {
		inviteLink?: string | null;
		invitedByName?: string | null;
		recipientEmail: string;
		roleLabel: string;
		schoolName: string;
		staffName: string;
	};
	schoolProfileId: string;
	userId: string;
}) {
	const preference = await prisma.notificationPreference.findFirst({
		where: {
			deletedAt: null,
			schoolProfileId: input.schoolProfileId,
			type: "staff_invitation",
			userId: input.userId,
		},
		select: {
			inApp: true,
		},
	});

	if (preference?.inApp === false) {
		return;
	}

	const notification = createNotificationFromType("staff_invitation", input.payload);

	if (!notification.channels.includes("in_app")) {
		return;
	}

	await prisma.notification.create({
		data: {
			body: notification.body,
			link: notification.link,
			schoolProfileId: input.schoolProfileId,
			title: notification.title,
			type: notification.type,
			userId: input.userId,
		},
	});
}

async function getSchoolContext() {
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
			name: true,
		},
	});

	const actor = profile.auth?.userId
		? await prisma.user.findFirst({
				where: {
					deletedAt: null,
					id: profile.auth.userId,
				},
				select: {
					name: true,
				},
			})
		: null;

	if (!school) {
		throw new Error("School not found.");
	}

	return {
		actor,
		profile,
		school,
	};
}

export const saveStaffAction = actionClient
	.schema(createStaffSchema)
	.action(async ({ parsedInput }) => {
		const { actor, profile, school } = await getSchoolContext();

		const email = normalizeEmail(parsedInput.email);
		const assignments = roleSupportsAssignments(parsedInput.role)
			? dedupeAssignments(parsedInput.assignments)
			: [];

		const savedStaff = await prisma.$transaction(async (tx) => {
			const existingStaff = parsedInput.staffId
				? await tx.staffProfile.findFirst({
						where: {
							id: parsedInput.staffId,
							schoolProfileId: profile.schoolId,
							deletedAt: null,
						},
						select: {
							id: true,
							email: true,
							name: true,
							inviteStatus: true,
						},
					})
				: null;

			if (parsedInput.staffId && !existingStaff) {
				throw new Error("Staff record not found.");
			}

			const requestedClassroomIds = assignments.map(
				(item) => item.classRoomDepartmentId,
			);
			const requestedSubjectIds = assignments.flatMap(
				(item) => item.departmentSubjectIds,
			);

			const [validClassrooms, validSubjects] = await Promise.all([
				requestedClassroomIds.length
					? tx.classRoomDepartment.findMany({
							where: {
								id: {
									in: requestedClassroomIds,
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
						})
					: Promise.resolve([]),
				requestedSubjectIds.length
					? tx.departmentSubject.findMany({
							where: {
								id: {
									in: requestedSubjectIds,
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
								classRoomDepartmentId: true,
							},
						})
					: Promise.resolve([]),
			]);

			if (validClassrooms.length !== requestedClassroomIds.length) {
				throw new Error("One or more selected classrooms are no longer valid.");
			}

			if (validSubjects.length !== requestedSubjectIds.length) {
				throw new Error("One or more selected subjects are no longer valid.");
			}

			const subjectToClassroom = new Map(
				validSubjects.map((subject) => [
					subject.id,
					subject.classRoomDepartmentId,
				]),
			);

			for (const assignment of assignments) {
				for (const subjectId of assignment.departmentSubjectIds) {
					if (
						subjectToClassroom.get(subjectId) !==
						assignment.classRoomDepartmentId
					) {
						throw new Error(
							"Subjects must belong to the selected classroom assignment.",
						);
					}
				}
			}

			const resolvedName =
				existingStaff?.name?.trim() || buildPendingStaffName(email);
			const emailChanged =
				Boolean(existingStaff?.email) && existingStaff?.email !== email;
			const shouldSendInvite =
				!existingStaff ||
				emailChanged ||
				existingStaff.inviteStatus === "NOT_SENT" ||
				existingStaff.inviteStatus === "FAILED";

			const staffProfile = existingStaff
				? await tx.staffProfile.update({
						where: {
							id: existingStaff.id,
						},
						data: {
							email,
							name: resolvedName,
							inviteStatus: shouldSendInvite
								? "PENDING"
								: existingStaff.inviteStatus,
							onboardedAt: emailChanged ? null : undefined,
						},
					})
				: await tx.staffProfile.create({
						data: {
							email,
							name: resolvedName,
							schoolProfileId: profile.schoolId,
							inviteStatus: "PENDING",
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

			if (assignments.length) {
				await tx.staffClassroomDepartmentTermProfiles.createMany({
					data: assignments.map(({ classRoomDepartmentId }) => ({
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

			if (requestedSubjectIds.length) {
				await tx.staffSubject.createMany({
					data: requestedSubjectIds.map((departmentSubjectId) => ({
						staffProfilesId: staffProfile.id,
						departmentSubjectId,
					})),
				});
			}

			const existingUser = await tx.user.findFirst({
				where: {
					saasAccountId: school.accountId,
					deletedAt: null,
					OR: [
						{
							email,
						},
						...(existingStaff?.email
							? [
									{
										email: existingStaff.email,
									},
								]
							: []),
					],
				},
				select: {
					id: true,
				},
			});

			let userId: string;

			if (existingUser) {
				const updatedUser = await tx.user.update({
					where: {
						id: existingUser.id,
					},
					data: {
						name: resolvedName,
						email,
						role: parsedInput.role,
					},
					select: {
						id: true,
					},
				});
				userId = updatedUser.id;
			} else {
				const createdUser = await tx.user.create({
					data: {
						name: resolvedName,
						email,
						role: parsedInput.role,
						saasAccountId: school.accountId,
					},
					select: {
						id: true,
					},
				});
				userId = createdUser.id;
			}

			return {
				id: staffProfile.id,
				email,
				name: resolvedName,
				shouldSendInvite,
				userId,
			};
		});

		let invited = false;
		let inviteError: string | null = null;

		if (savedStaff.shouldSendInvite) {
			try {
				await sendOnboardingInvite({
					email: savedStaff.email,
					staffId: savedStaff.id,
				});
				invited = true;
				await syncInviteState({
					staffId: savedStaff.id,
					status: "PENDING",
				});
				await createStaffInvitationNotification({
					payload: {
						inviteLink: null,
						invitedByName: actor?.name ?? null,
						recipientEmail: savedStaff.email,
						roleLabel: parsedInput.role,
						schoolName: school.name,
						staffName: savedStaff.name,
					},
					schoolProfileId: profile.schoolId!,
					userId: savedStaff.userId,
				});
			} catch (error) {
				console.error("[staff-invite] Failed to send invite email", error);
				inviteError = inviteErrorMessage(error);
				await syncInviteState({
					staffId: savedStaff.id,
					status: "FAILED",
					error: inviteError,
				});
			}
		}

		staffChanged();

		return {
			invited,
			inviteError,
			staffId: savedStaff.id,
		};
	});

export const resendStaffOnboardingAction = actionClient
	.schema(
		z.object({
			staffId: z.string(),
		}),
	)
	.action(async ({ parsedInput }) => {
		const { actor, profile, school } = await getSchoolContext();

		const staff = await prisma.staffProfile.findFirst({
			where: {
				id: parsedInput.staffId,
				schoolProfileId: profile.schoolId,
				deletedAt: null,
			},
			select: {
				id: true,
				email: true,
				name: true,
				onboardedAt: true,
			},
		});

		if (!staff?.email) {
			throw new Error("This staff member does not have an onboarding email.");
		}

		if (staff.onboardedAt) {
			throw new Error("This staff member has already completed onboarding.");
		}

		const user = await prisma.user.findFirst({
			where: {
				email: staff.email,
				saasAccountId: school.accountId,
				deletedAt: null,
			},
			select: {
				id: true,
				role: true,
			},
		});

		staffRoleSchema.parse(user?.role ?? "Teacher");

		try {
			await sendOnboardingInvite({
				email: staff.email,
				staffId: staff.id,
			});
			await syncInviteState({
				staffId: staff.id,
				status: "PENDING",
				resent: true,
			});
			if (user?.id) {
				await createStaffInvitationNotification({
					payload: {
						inviteLink: null,
						invitedByName: actor?.name ?? null,
						recipientEmail: staff.email,
						roleLabel: user.role ?? "Teacher",
						schoolName: school.name,
						staffName: staff.name ?? buildPendingStaffName(staff.email),
					},
					schoolProfileId: profile.schoolId!,
					userId: user.id,
				});
			}
			staffChanged();
			return {
				invited: true,
			};
		} catch (error) {
			console.error("[staff-invite] Failed to resend invite email", error);
			const message = inviteErrorMessage(error);
			await syncInviteState({
				staffId: staff.id,
				status: "FAILED",
				error: message,
				resent: true,
			});
			throw new Error(message);
		}
	});

export const completeStaffOnboardingAction = actionClient
	.schema(completeStaffOnboardingSchema)
	.action(async ({ parsedInput }) => {
		const payload = {
			...parsedInput,
			title: emptyToUndefined(parsedInput.title),
			phone: emptyToUndefined(parsedInput.phone),
			phone2: emptyToUndefined(parsedInput.phone2),
			address: emptyToUndefined(parsedInput.address),
		};

		const staff = await prisma.staffProfile.findFirst({
			where: {
				id: payload.staffId,
				email: payload.email,
				deletedAt: null,
			},
			select: {
				id: true,
				schoolProfile: {
					select: {
						accountId: true,
					},
				},
			},
		});

		if (!staff) {
			throw new Error("This onboarding link no longer matches a staff record.");
		}

		await prisma.$transaction(async (tx) => {
			await tx.staffProfile.update({
				where: {
					id: staff.id,
				},
				data: {
					name: payload.name.trim(),
					title: payload.title,
					phone: payload.phone,
					phone2: payload.phone2,
					address: payload.address,
					inviteStatus: "ACTIVE",
					onboardedAt: new Date(),
					lastInviteError: null,
				},
			});

			await tx.user.updateMany({
				where: {
					email: payload.email,
					saasAccountId: staff.schoolProfile?.accountId,
					deletedAt: null,
				},
				data: {
					name: payload.name.trim(),
					emailVerified: true,
				},
			});
		});

		staffChanged();

		return {
			staffId: staff.id,
			completed: true,
		};
	});
