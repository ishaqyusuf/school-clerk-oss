"use server";

import { staffChanged } from "@/actions/cache/cache-control";
import { requireDashboardModules } from "@/lib/module-access";
import { completeStaffOnboarding } from "@school-clerk/auth/staff-onboarding";
import { actionClient } from "@/actions/safe-action";
import {
	completeStaffOnboardingSchema,
	createStaffSchema,
	staffRoleSchema,
} from "@/actions/schema";
import {
	type SendStaffInvitationEmailPayload,
	sendStaffInvitationEmailTaskId,
} from "@school-clerk/utils/task-contracts";
import { tasks } from "@trigger.dev/sdk";
import { z } from "zod";
import { getTenantDashboardEmailUrl } from "./tenant-email-url";

import {
	assertSchoolClerkIdentityLane,
	assertStaffAcademicAssignmentReferences,
	buildStaffAcademicAccessPersistence,
	collectStaffAcademicAssignmentReferenceIds,
	createStaffInvitationDelivery,
	createStaffOnboardingProof,
	staffPasswordSetupIdentifier,
	saveStaffLoginIdentity,
	getStaffInvitationIdentity,
	ensureStaffCredentialAccount,
	updateStaffInvitationStatus,
	createDeliveredUserNotification,
	getNotificationDeliveryRecipient,
	getStaffOnboardingContext,
	lockStaffOnboardingProof,
	normalizeStaffAcademicAssignments,
	prisma,
} from "@school-clerk/db";
import { createNotificationFromType } from "@school-clerk/notifications";
import { assertModuleAccess } from "@school-clerk/utils/module-config";
import {
	STAFF_ASSIGNMENT_ROLES,
	STAFF_ROLES,
} from "@school-clerk/utils/constants";

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

async function sendOnboardingInvite({
	email,
	roleLabel,
	staffId,
	userId,
	tenantSlug,
	resent = false,
}: {
	email: string;
	invitedByName?: string | null;
	roleLabel: string;
	schoolName: string;
	staffName: string;
	staffId: string;
	userId: string;
	tenantSlug: string;
	resent?: boolean;
}) {
	if (!process.env.RESEND_API_KEY) {
		throw new Error(
			"RESEND_API_KEY is not configured; onboarding email was not sent.",
		);
	}

	if (
		process.env.NODE_ENV === "development" &&
		!process.env.DEV_EMAIL_RECIPIENT?.trim()
	) {
		throw new Error(
			"DEV_EMAIL_RECIPIENT must be configured in development before sending email.",
		);
	}

	const inviteLink = await createCopyableOnboardingLink({
		email,
		staffId,
		tenantSlug,
		userId,
		resent,
	});

	try {
		const current = await getSchoolContext();
		if (current.tenantSlug !== tenantSlug) throw new Error("Staff workspace changed. Reload before inviting.");
		const deliveryId = await createStaffInvitationDelivery(prisma, {
			ctaHref: inviteLink, email, role: roleLabel, staffId, userId, tenantSlug: current.tenantSlug,
			schoolId: current.school.id, accountId: current.school.accountId, actorUserId: current.actor.id,
			expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
		});
		await tasks.trigger(sendStaffInvitationEmailTaskId, {
			deliveryId, ctaHref: inviteLink,
		} satisfies SendStaffInvitationEmailPayload);
	} catch (error) {
		const token = new URL(inviteLink).searchParams.get("token");
		if (token) {
			try {
				await prisma.$transaction(async (tx) => {
					if (!await lockStaffOnboardingProof(tx, { staffId, token })) return;
					const context = await getStaffOnboardingContext(tx, { staffId, token, email });
					if (!context || context.binding.userId !== userId) return;
					await updateStaffInvitationStatus(tx, {
						staffId, schoolId: context.binding.schoolId, accountId: context.binding.accountId,
						email, status: "FAILED", error: "Invitation could not be queued. Retry or copy a new link.",
					});
				});
			} catch {
				console.error("[staff-invite] Could not record invitation queue failure");
			}
		}
		throw error;
	}

	return inviteLink;
}

async function createCopyableOnboardingLink({
	email,
	staffId,
	tenantSlug,
	userId,
	resent = false,
}: {
	email: string;
	staffId: string;
	tenantSlug: string;
	userId: string;
	resent?: boolean;
}) {
	const current = await getSchoolContext();
	if (current.tenantSlug !== tenantSlug) throw new Error("Staff workspace changed. Reload before inviting.");
	const identity = await getStaffInvitationIdentity(prisma, {
		staffId, schoolId: current.school.id, accountId: current.school.accountId,
	});
	if (!identity || identity.user.id !== userId || identity.email !== email) {
		throw new Error("Staff invitation identity is unavailable or ambiguous. Review the staff email and login before inviting.");
	}
	const { user } = identity;
	staffRoleSchema.parse(user.role);
	const token = crypto.randomUUID();
	const identifier = staffPasswordSetupIdentifier(token);

	const inviteLink = new URL(
		await getTenantDashboardEmailUrl({
			path: "/reset-password",
			tenantSlug,
		}),
	);
	inviteLink.searchParams.set("onboarding", "1");
	inviteLink.searchParams.set("staffId", staffId);
	inviteLink.searchParams.set("email", email);
	inviteLink.searchParams.set("token", token);

	const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
	await prisma.$transaction(async (tx) => {
		const latest = await getStaffInvitationIdentity(tx, {
			staffId, schoolId: current.school.id, accountId: current.school.accountId,
		});
		if (!latest || latest.user.id !== userId || latest.email !== email || latest.user.role !== user.role) {
			throw new Error("Staff invitation identity changed. Reload before inviting.");
		}
		await ensureStaffCredentialAccount(tx, userId);
		await tx.verification.create({ data: { identifier, value: userId, expiresAt } });
		await createStaffOnboardingProof(tx, {
			staffId, userId, schoolId: current.school.id, accountId: current.school.accountId,
			email, role: staffRoleSchema.parse(user.role),
		}, token, expiresAt);
		const context = await getStaffOnboardingContext(tx, { staffId, token, email });
		if (!context) throw new Error("Staff invitation identity changed. Reload before inviting.");
		assertModuleAccess(context.staff.schoolProfile?.moduleConfiguration, ["STAFF_MANAGEMENT"]);
		const updated = await updateStaffInvitationStatus(tx, {
			staffId, schoolId: current.school.id, accountId: current.school.accountId,
			email, status: "PENDING", resent,
		});
		if (updated.count !== 1) throw new Error("Staff invitation changed. Reload before inviting.");
	}, { isolationLevel: "Serializable" });

	return inviteLink.toString();
}

function inviteErrorMessage(error: unknown) {
	return error instanceof Error
		? error.message
		: "Failed to send onboarding email. Please verify the email address and try again.";
}

function isDevelopmentEmailConfigurationError(error: unknown) {
	if (process.env.NODE_ENV !== "development" || !(error instanceof Error)) {
		return false;
	}

	return (
		error.message.includes("DEV_EMAIL_RECIPIENT") ||
		error.message.includes("RESEND_API_KEY") ||
		error.message.includes("domain is not verified")
	);
}

async function tryCreateStaffInvitationNotification(
	input: Parameters<typeof createStaffInvitationNotification>[0],
) {
	try {
		await createStaffInvitationNotification(input);
	} catch {
		console.error(
			"[staff-invite] Staff invitation notification failed after email enqueue",
		);
	}
}

async function createStaffInvitationNotification(input: {
	actorName?: string | null;
	actorUserId?: string | null;
	payload: {
		inviteLink?: string | null;
		invitedByName?: string | null;
		recipientEmail: string;
		roleLabel: string;
		schoolName: string;
		staffId: string;
		staffName: string;
	};
	schoolProfileId: string;
	userId: string;
}) {
	const current = await getSchoolContext();
	if (current.school.id !== input.schoolProfileId || current.actor.id !== input.actorUserId) return;
	if (!input.payload.inviteLink) return;
	const token = new URL(input.payload.inviteLink).searchParams.get("token");
	if (!token) return;
	await prisma.$transaction(async (tx) => {
		if (!await lockStaffOnboardingProof(tx, { staffId: input.payload.staffId, token })) return;
		const onboarding = await getStaffOnboardingContext(tx, {
			staffId: input.payload.staffId, token, email: input.payload.recipientEmail,
		});
		if (!onboarding || onboarding.binding.userId !== input.userId ||
			onboarding.binding.schoolId !== current.school.id ||
			onboarding.binding.accountId !== current.school.accountId) return;
		staffRoleSchema.parse(onboarding.binding.role);
		const live = await getNotificationDeliveryRecipient(tx, {
			schoolId: current.school.id, accountId: current.school.accountId,
			actorUserId: current.actor.id, authSessionId: current.authSessionId,
			recipientUserId: input.userId, type: "staff_invitation",
		});
		if (!live || live.actor.role?.toLowerCase() !== "admin" || live.preference?.inApp === false ||
			live.recipient.email !== onboarding.binding.email || live.recipient.role !== onboarding.binding.role) return;
		assertModuleAccess(live.school.moduleConfiguration, ["STAFF_MANAGEMENT"]);
		const staffName = onboarding.staff.name ?? live.recipient.name ?? buildPendingStaffName(live.recipient.email);
		const notification = createNotificationFromType("staff_invitation", {
			inviteLink: input.payload.inviteLink, invitedByName: live.actor.name,
			recipientEmail: live.recipient.email, roleLabel: onboarding.binding.role,
			schoolName: live.school.name, staffId: onboarding.binding.staffId, staffName,
		});
		if (!notification.channels.includes("in_app")) return;
		await createDeliveredUserNotification(tx, live, {
			action: notification.action ?? undefined, body: notification.body, link: notification.link,
			subject: notification.emailTemplate?.subject ?? notification.title,
			title: notification.title, type: notification.type,
			tags: [
				{ tagName: "staff_email", tagValue: live.recipient.email },
				{ tagName: "staff_name", tagValue: staffName },
			],
		});
	});
}

async function getSchoolContext() {
	const context = await requireDashboardModules(["STAFF_MANAGEMENT"], ["Admin"]);
	const { profile } = context;
	if (!profile.sessionId || !profile.termId) throw new Error("Missing active school session context.");
	const school = await prisma.schoolProfile.findFirst({
		where: { id: profile.schoolId, accountId: context.user.saasAccountId, deletedAt: null,
			account: { deletedAt: null, qaPurgeStartedAt: null } },
		select: { id: true, accountId: true, name: true, subDomain: true },
	});
	const term = await prisma.sessionTerm.findFirst({
		where: { id: profile.termId, sessionId: profile.sessionId, schoolId: profile.schoolId, deletedAt: null,
			session: { schoolId: profile.schoolId, deletedAt: null } },
		select: { id: true },
	});
	if (!school || !term) throw new Error("The active school or academic term is unavailable.");
	return { actor: context.user, authSessionId: context.authSessionId, profile, school, tenantSlug: school.subDomain };
}

export const saveStaffAction = actionClient
	.schema(createStaffSchema)
	.action(async ({ parsedInput }) => {
		await requireDashboardModules(["STAFF_MANAGEMENT", "ACADEMIC_PROGRAMS"], ["Admin"]);
		const { actor, profile, school, tenantSlug } = await getSchoolContext();

		const email = normalizeEmail(parsedInput.email);
		await assertSchoolClerkIdentityLane(prisma, {
			email,
			saasAccountId: school.accountId,
		});
		const assignments = roleSupportsAssignments(parsedInput.role)
			? normalizeStaffAcademicAssignments(parsedInput.assignments)
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
							onboardedAt: true,
						},
					})
				: null;

			if (parsedInput.staffId && !existingStaff) {
				throw new Error("Staff record not found.");
			}

			const {
				classRoomIds: requestedClassIds,
				classRoomDepartmentIds: requestedClassroomIds,
				subjectIds: requestedSubjectIds,
				departmentSubjectIds: selectedSubjectIds,
			} = collectStaffAcademicAssignmentReferenceIds(assignments);

			const [
				validClasses,
				validClassrooms,
				validSubjects,
				validDepartmentSubjects,
			] = await Promise.all([
				requestedClassIds.length
					? tx.classRoom.findMany({
							where: {
								id: {
									in: requestedClassIds,
								},
								deletedAt: null,
								schoolProfileId: profile.schoolId,
								schoolSessionId: profile.sessionId,
							},
							select: {
								id: true,
							},
						})
					: Promise.resolve([]),
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
					? tx.subject.findMany({
							where: {
								id: {
									in: requestedSubjectIds,
								},
								deletedAt: null,
								schoolProfileId: profile.schoolId,
							},
							select: {
								id: true,
							},
						})
					: Promise.resolve([]),
				selectedSubjectIds.length
					? tx.departmentSubject.findMany({
							where: {
								id: {
									in: selectedSubjectIds,
								},
								deletedAt: null,
								sessionTermId: profile.termId,
								classRoomDepartment: {
									deletedAt: null,
									schoolProfileId: profile.schoolId,
									classRoom: {
										deletedAt: null,
										schoolSessionId: profile.sessionId,
									},
								},
							},
							select: {
								id: true,
								classRoomDepartmentId: true,
								subjectId: true,
							},
						})
					: Promise.resolve([]),
			]);

			assertStaffAcademicAssignmentReferences({
				assignments,
				validClassIds: validClasses,
				validClassRoomDepartmentIds: validClassrooms,
				validSubjectIds: validSubjects,
				validDepartmentSubjects,
			});

			const resolvedName =
				existingStaff?.name?.trim() || buildPendingStaffName(email);
			const emailChanged =
				Boolean(existingStaff) && existingStaff?.email?.trim().toLowerCase() !== email;
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
								? "NOT_SENT"
								: existingStaff.inviteStatus,
							onboardedAt: emailChanged ? null : undefined,
							password: emailChanged ? null : undefined,
						},
					})
				: await tx.staffProfile.create({
						data: {
							email,
							name: resolvedName,
							schoolProfileId: profile.schoolId,
							inviteStatus: "NOT_SENT",
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

			const {
				legacyClassroomAssignments,
				academicAccessGrants,
				selectedDepartmentSubjectIds,
			} = buildStaffAcademicAccessPersistence({
				assignments,
				staffTermProfileId: termProfile.id,
			});

			if (legacyClassroomAssignments.length) {
				await tx.staffClassroomDepartmentTermProfiles.createMany({
					data: legacyClassroomAssignments,
				});
			}

			await tx.staffAcademicAccessGrant.updateMany({
				where: {
					staffTermProfileId: termProfile.id,
					deletedAt: null,
				},
				data: {
					deletedAt: new Date(),
				},
			});

			if (academicAccessGrants.length) {
				await tx.staffAcademicAccessGrant.createMany({
					data: academicAccessGrants,
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

			if (selectedDepartmentSubjectIds.length) {
				await tx.staffSubject.createMany({
					data: selectedDepartmentSubjectIds.map((departmentSubjectId) => ({
						staffProfilesId: staffProfile.id,
						departmentSubjectId,
					})),
				});
			}

			const login = await saveStaffLoginIdentity(tx, {
				staffId: staffProfile.id, accountId: school.accountId, actorUserId: actor.id,
				previousEmail: existingStaff?.email ?? null, email, name: resolvedName,
				role: parsedInput.role, allowedRoles: STAFF_ROLES,
			});
			const userId = login.id;
			if (login.roleChanged && !existingStaff?.onboardedAt) {
				await tx.staffProfile.update({ where: { id: staffProfile.id }, data: { inviteStatus: "NOT_SENT" } });
			}

			return {
				id: staffProfile.id,
				email,
				name: resolvedName,
				shouldSendInvite: shouldSendInvite || (login.roleChanged && !existingStaff?.onboardedAt),
				userId,
			};
		}, { isolationLevel: "Serializable" });

		let invited = false;
		let inviteError: string | null = null;

		if (savedStaff.shouldSendInvite) {
			try {
				const inviteLink = await sendOnboardingInvite({
					email: savedStaff.email,
					invitedByName: actor?.name ?? null,
					roleLabel: parsedInput.role,
					schoolName: school.name,
					staffName: savedStaff.name,
					staffId: savedStaff.id,
					tenantSlug,
					userId: savedStaff.userId,
				});
				invited = true;
				await tryCreateStaffInvitationNotification({
					actorName: actor?.name ?? null,
					actorUserId: profile.auth?.userId ?? null,
					payload: {
						inviteLink,
						invitedByName: actor?.name ?? null,
						recipientEmail: savedStaff.email,
						roleLabel: parsedInput.role,
						schoolName: school.name,
						staffId: savedStaff.id,
						staffName: savedStaff.name,
					},
					schoolProfileId: profile.schoolId!,
					userId: savedStaff.userId,
				});
				await prisma.schoolProfile.updateMany({
					where: {
						id: school.id, accountId: school.accountId, deletedAt: null,
						account: { deletedAt: null, qaPurgeStartedAt: null },
					},
					data: {
						onboardingCompletedAt: new Date(),
					},
				});
			} catch (error) {
				console.error("[staff-invite] Failed to queue invite email");
				inviteError = inviteErrorMessage(error);
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
		const { actor, profile, school, tenantSlug } = await getSchoolContext();

		const identity = await getStaffInvitationIdentity(prisma, {
			staffId: parsedInput.staffId, schoolId: school.id, accountId: school.accountId,
		});
		if (!identity) {
			throw new Error("Staff invitation identity is unavailable or ambiguous. Review the staff email and login before inviting.");
		}
		const { staff, user, email } = identity;
		staffRoleSchema.parse(user.role);

		try {
			const inviteLink = await sendOnboardingInvite({
				email,
				invitedByName: actor?.name ?? null,
				roleLabel: user.role ?? "Teacher",
				schoolName: school.name,
				staffName: staff.name ?? buildPendingStaffName(email),
				staffId: staff.id,
				tenantSlug,
				userId: user.id,
				resent: true,
			});
			if (user?.id) {
				await tryCreateStaffInvitationNotification({
					actorName: actor?.name ?? null,
					actorUserId: profile.auth?.userId ?? null,
					payload: {
						inviteLink,
						invitedByName: actor?.name ?? null,
						recipientEmail: email,
						roleLabel: user.role ?? "Teacher",
						schoolName: school.name,
						staffId: staff.id,
						staffName: staff.name ?? buildPendingStaffName(email),
					},
					schoolProfileId: profile.schoolId!,
					userId: user.id,
				});
				staffChanged();
				return {
					invited: true,
				};
			}
		} catch (error) {
			const message = inviteErrorMessage(error);

			if (isDevelopmentEmailConfigurationError(error)) {
				console.warn(
					"[staff-invite] Resend invite email skipped in development",
					message,
				);
				const inviteLink = await createCopyableOnboardingLink({
					email,
					staffId: staff.id,
					tenantSlug,
					userId: user.id,
					resent: true,
				});
				staffChanged();
				return {
					invited: false,
					inviteError: message,
					inviteLink,
				};
			}

			console.error("[staff-invite] Failed to queue resend invite email");
			throw new Error(message);
		}
	});

export const copyStaffOnboardingLinkAction = actionClient
	.schema(
		z.object({
			staffId: z.string(),
		}),
	)
	.action(async ({ parsedInput }) => {
		const { school, tenantSlug } = await getSchoolContext();

		const identity = await getStaffInvitationIdentity(prisma, {
			staffId: parsedInput.staffId, schoolId: school.id, accountId: school.accountId,
		});
		if (!identity) {
			throw new Error("Staff invitation identity is unavailable or ambiguous. Review the staff email and login before inviting.");
		}
		const { staff, user, email } = identity;
		staffRoleSchema.parse(user.role);

		const inviteLink = await createCopyableOnboardingLink({
			email,
			staffId: staff.id,
			tenantSlug,
			userId: user.id,
		});

		staffChanged();

		return {
			inviteLink,
		};
	});

export const completeStaffOnboardingAction = actionClient
	.schema(completeStaffOnboardingSchema)
	.action(async ({ parsedInput }) => {
		const result = await completeStaffOnboarding(parsedInput);
		staffChanged();
		return result;
	});
