import type { TRPCContext } from "@api/trpc/init";
import {
	DEFAULT_REPORT_CARD_TEMPLATE_ID,
	REPORT_CARD_DOCUMENT_TYPE,
	type ReportCardConfig,
	type ReportCardTemplateId,
	isReportCardTemplateId,
	resolveReportCardConfig,
} from "@school-clerk/utils/report-card";
import { TRPCError } from "@trpc/server";

const ADMIN_ROLES = new Set(["ADMIN"]);
const MAX_SIGNATURE_LENGTH = 500_000;

function requireSchoolId(ctx: TRPCContext) {
	const schoolProfileId = ctx.profile.schoolId;
	if (!schoolProfileId) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "School context is required.",
		});
	}
	return schoolProfileId;
}

function isAdmin(ctx: TRPCContext) {
	return ADMIN_ROLES.has(ctx.currentUser?.role?.toUpperCase() ?? "");
}

export function assertSignatureImage(value: string | null) {
	if (value === null) return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	if (trimmed.length > MAX_SIGNATURE_LENGTH) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "The signature image is too large. Use an image under 350 KB.",
		});
	}
	if (
		!/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(trimmed) &&
		!/^https:\/\/\S+$/i.test(trimmed)
	) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Upload a PNG, JPEG or WebP signature image.",
		});
	}
	return trimmed;
}

async function loadSchoolTemplate(ctx: TRPCContext, schoolProfileId: string) {
	const [school, preference] = await Promise.all([
		ctx.db.schoolProfile.findFirst({
			where: { id: schoolProfileId, deletedAt: null },
			select: { name: true },
		}),
		ctx.db.schoolDocumentTemplatePreference.findFirst({
			where: {
				schoolProfileId,
				documentType: REPORT_CARD_DOCUMENT_TYPE,
				deletedAt: null,
			},
			orderBy: { updatedAt: "desc" },
			select: { id: true, templateId: true, config: true, updatedAt: true },
		}),
	]);
	const templateId: ReportCardTemplateId = isReportCardTemplateId(
		preference?.templateId,
	)
		? preference.templateId
		: DEFAULT_REPORT_CARD_TEMPLATE_ID;
	return {
		preferenceId: preference?.id ?? null,
		templateId,
		config: resolveReportCardConfig(preference?.config, {
			schoolName: school?.name,
		}),
		isSaved: !!preference,
		updatedAt: preference?.updatedAt ?? null,
		schoolName: school?.name ?? "",
	};
}

export async function getReportCardTemplate(ctx: TRPCContext) {
	const schoolProfileId = requireSchoolId(ctx);
	const { preferenceId: _preferenceId, ...template } = await loadSchoolTemplate(
		ctx,
		schoolProfileId,
	);
	return { ...template, canEdit: isAdmin(ctx) };
}

export async function saveReportCardTemplate(
	ctx: TRPCContext,
	input: { templateId: ReportCardTemplateId; config: ReportCardConfig },
) {
	const schoolProfileId = requireSchoolId(ctx);
	if (!isAdmin(ctx)) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message:
				"Only school administrators can change the report card template.",
		});
	}
	const config: ReportCardConfig = {
		...input.config,
		signatures: {
			...input.config.signatures,
			headImageUrl: assertSignatureImage(input.config.signatures.headImageUrl),
		},
	};
	const existing = await loadSchoolTemplate(ctx, schoolProfileId);
	const data = {
		templateId: input.templateId,
		templateVersion: 1,
		source: "html",
		config,
	};
	const saved = existing.preferenceId
		? await ctx.db.schoolDocumentTemplatePreference.update({
				where: { id: existing.preferenceId },
				data,
				select: { updatedAt: true },
			})
		: await ctx.db.schoolDocumentTemplatePreference.create({
				data: {
					...data,
					schoolProfileId,
					documentType: REPORT_CARD_DOCUMENT_TYPE,
				},
				select: { updatedAt: true },
			});
	return { templateId: input.templateId, config, updatedAt: saved.updatedAt };
}

/**
 * Everything a printed report card needs beyond the scores: the school's
 * template and settings, the term being printed and each class's teacher
 * signature.
 */
export async function getReportCardPrintContext(
	ctx: TRPCContext,
	input: { termId: string; departmentIds: string[] },
) {
	const schoolProfileId = requireSchoolId(ctx);
	const [template, term, teacherProfiles] = await Promise.all([
		loadSchoolTemplate(ctx, schoolProfileId),
		ctx.db.sessionTerm.findFirst({
			where: { id: input.termId, schoolId: schoolProfileId, deletedAt: null },
			select: {
				id: true,
				title: true,
				resumptionDate: true,
				session: { select: { title: true } },
			},
		}),
		input.departmentIds.length
			? ctx.db.staffClassroomDepartmentTermProfiles.findMany({
					where: {
						deletedAt: null,
						classRoomDepartmentId: { in: input.departmentIds },
						classRoomDepartment: { schoolProfileId, deletedAt: null },
						staffTermProfile: {
							sessionTermId: input.termId,
							deletedAt: null,
							staffProfile: { schoolProfileId, deletedAt: null },
						},
					},
					orderBy: { createdAt: "asc" },
					select: {
						classRoomDepartmentId: true,
						staffTermProfile: {
							select: {
								staffProfile: {
									select: { id: true, name: true, signatureUrl: true },
								},
							},
						},
					},
				})
			: Promise.resolve([]),
	]);

	if (!term) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Report term not found.",
		});
	}

	// Prefer the first assigned teacher who has uploaded a signature.
	const teacherByDepartment: Record<
		string,
		{ staffId: string; name: string; signatureUrl: string | null }
	> = {};
	for (const profile of teacherProfiles) {
		const departmentId = profile.classRoomDepartmentId;
		const staff = profile.staffTermProfile.staffProfile;
		if (!departmentId) continue;
		const current = teacherByDepartment[departmentId];
		if (!current || (!current.signatureUrl && staff.signatureUrl)) {
			teacherByDepartment[departmentId] = {
				staffId: staff.id,
				name: staff.name,
				signatureUrl: staff.signatureUrl,
			};
		}
	}

	return {
		templateId: template.templateId,
		config: template.config,
		term: {
			id: term.id,
			title: term.title,
			sessionTitle: term.session?.title ?? "",
			resumptionDate: term.resumptionDate,
		},
		teacherByDepartment,
	};
}

async function findOwnStaffProfile(ctx: TRPCContext, schoolProfileId: string) {
	const email = ctx.currentUser?.email;
	if (!email) return null;
	return ctx.db.staffProfile.findFirst({
		where: {
			schoolProfileId,
			deletedAt: null,
			email: { equals: email, mode: "insensitive" },
		},
		select: { id: true, name: true, signatureUrl: true },
	});
}

export async function getMyStaffSignature(ctx: TRPCContext) {
	const schoolProfileId = requireSchoolId(ctx);
	const staff = await findOwnStaffProfile(ctx, schoolProfileId);
	return staff
		? { staffId: staff.id, name: staff.name, signatureUrl: staff.signatureUrl }
		: null;
}

/** Staff update their own signature; admins may update any staff member's. */
export async function updateStaffSignature(
	ctx: TRPCContext,
	input: { staffId?: string | null; signatureUrl: string | null },
) {
	const schoolProfileId = requireSchoolId(ctx);
	const signatureUrl = assertSignatureImage(input.signatureUrl);
	const own = await findOwnStaffProfile(ctx, schoolProfileId);
	const targetId = input.staffId ?? own?.id;
	if (!targetId) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "No staff profile is linked to your account.",
		});
	}
	if (targetId !== own?.id && !isAdmin(ctx)) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You can only change your own signature.",
		});
	}
	const result = await ctx.db.staffProfile.updateMany({
		where: { id: targetId, schoolProfileId, deletedAt: null },
		data: { signatureUrl },
	});
	if (!result.count) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Staff profile was not found.",
		});
	}
	return { staffId: targetId, signatureUrl };
}

export async function listStaffSignatures(ctx: TRPCContext) {
	const schoolProfileId = requireSchoolId(ctx);
	if (!isAdmin(ctx)) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Only school administrators can manage staff signatures.",
		});
	}
	const staff = await ctx.db.staffProfile.findMany({
		where: { schoolProfileId, deletedAt: null },
		orderBy: { name: "asc" },
		select: { id: true, name: true, title: true, signatureUrl: true },
	});
	return staff;
}
