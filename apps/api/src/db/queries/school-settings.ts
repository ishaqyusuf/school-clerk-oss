import type { TRPCContext } from "@api/trpc/init";
import {
	type AcademicDataDirectionMode,
	analyzeSchoolAcademicDataDirection,
	applyAcademicDirectionMode,
	createAcademicDirectionFallback,
} from "@school-clerk/db";
import {
	type StudentNameFormat,
	normalizeStudentNameFormat,
} from "@school-clerk/utils/student-name";
import { TRPCError } from "@trpc/server";

const ADMIN_ROLES = new Set(["Admin", "ADMIN"]);

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

function requireSchoolAdmin(ctx: TRPCContext) {
	const schoolProfileId = requireSchoolId(ctx);
	const role = ctx.currentUser?.role;

	if (!role || !ADMIN_ROLES.has(role)) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Only school administrators can update school settings.",
		});
	}

	return schoolProfileId;
}

export async function getGeneralSchoolSettings(ctx: TRPCContext) {
	const schoolProfileId = requireSchoolId(ctx);
	const school = await ctx.db.schoolProfile.findFirst({
		where: {
			id: schoolProfileId,
			deletedAt: null,
		},
		select: {
			id: true,
			name: true,
			subDomain: true,
			slug: true,
			createdAt: true,
			studentNameFormat: true,
			_count: {
				select: {
					students: true,
					sessions: {
						where: {
							deletedAt: null,
						},
					},
				},
			},
		},
	});

	if (!school) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "School profile was not found.",
		});
	}

	return {
		...school,
		studentNameFormat: normalizeStudentNameFormat(school.studentNameFormat),
	};
}

export async function getAcademicDataDirectionSettings(ctx: TRPCContext) {
	const schoolProfileId = requireSchoolId(ctx);
	const school = await ctx.db.schoolProfile.findFirst({
		where: { id: schoolProfileId, deletedAt: null },
		select: { academicDataDirectionMode: true },
	});

	if (!school) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "School profile was not found.",
		});
	}

	const mode = school.academicDataDirectionMode as AcademicDataDirectionMode;

	try {
		const analysis = await analyzeSchoolAcademicDataDirection(
			ctx.db,
			schoolProfileId,
		);
		return applyAcademicDirectionMode(mode, analysis);
	} catch (error) {
		console.error("Unable to analyze academic data direction", {
			error,
			schoolProfileId,
		});
		return createAcademicDirectionFallback(mode);
	}
}

export async function updateStudentNameFormat(
	ctx: TRPCContext,
	format: StudentNameFormat,
) {
	const schoolProfileId = requireSchoolAdmin(ctx);
	const result = await ctx.db.schoolProfile.updateMany({
		where: {
			id: schoolProfileId,
			deletedAt: null,
		},
		data: {
			studentNameFormat: format,
		},
	});

	if (result.count !== 1) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "School profile was not found.",
		});
	}

	return { format };
}

export async function updateAcademicDataDirectionMode(
	ctx: TRPCContext,
	mode: AcademicDataDirectionMode,
) {
	const schoolProfileId = requireSchoolAdmin(ctx);
	const result = await ctx.db.schoolProfile.updateMany({
		where: {
			id: schoolProfileId,
			deletedAt: null,
		},
		data: {
			academicDataDirectionMode: mode,
		},
	});

	if (result.count !== 1) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "School profile was not found.",
		});
	}

	return { mode };
}
