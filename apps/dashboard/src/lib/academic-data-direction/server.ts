import "server-only";

import {
	type AcademicDataDirectionMode,
	type SchoolAcademicDataDirection,
	analyzeSchoolAcademicDataDirection,
	applyAcademicDirectionMode,
	createAcademicDirectionFallback,
} from "@school-clerk/db";
import { prisma } from "@school-clerk/db";
import { unstable_cache } from "next/cache";

const getCachedAcademicDataDirectionAnalysis = unstable_cache(
	async (schoolProfileId: string) =>
		analyzeSchoolAcademicDataDirection(prisma, schoolProfileId),
	["school-academic-data-direction"],
	{
		revalidate: 300,
	},
);

async function getAcademicDataDirectionMode(
	schoolProfileId: string,
): Promise<AcademicDataDirectionMode | null> {
	const school = await prisma.schoolProfile.findFirst({
		where: { id: schoolProfileId, deletedAt: null },
		select: { academicDataDirectionMode: true },
	});

	return school
		? (school.academicDataDirectionMode as AcademicDataDirectionMode)
		: null;
}

export async function resolveDashboardAcademicDataDirection(
	schoolProfileId: string,
): Promise<SchoolAcademicDataDirection> {
	const mode = await getAcademicDataDirectionMode(schoolProfileId);

	if (!mode) return createAcademicDirectionFallback();

	if (mode !== "AUTO") {
		return createAcademicDirectionFallback(mode);
	}

	try {
		const analysis =
			await getCachedAcademicDataDirectionAnalysis(schoolProfileId);
		return applyAcademicDirectionMode(mode, analysis);
	} catch (error) {
		console.error("Unable to resolve dashboard academic data direction", {
			error,
			schoolProfileId,
		});
		return createAcademicDirectionFallback(mode);
	}
}

export async function getDashboardAcademicDataDirectionSettings(
	schoolProfileId: string,
): Promise<SchoolAcademicDataDirection> {
	const mode = await getAcademicDataDirectionMode(schoolProfileId);

	if (!mode) return createAcademicDirectionFallback();

	try {
		const analysis =
			await getCachedAcademicDataDirectionAnalysis(schoolProfileId);
		return applyAcademicDirectionMode(mode, analysis);
	} catch (error) {
		console.error("Unable to load academic data direction settings", {
			error,
			schoolProfileId,
		});
		return createAcademicDirectionFallback(mode);
	}
}
