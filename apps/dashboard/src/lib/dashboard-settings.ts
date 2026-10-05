import "server-only";

import { cache } from "react";
import { prisma } from "@school-clerk/db";

export const getDashboardSettings = cache((schoolProfileId: string) =>
	prisma.schoolProfile.findFirst({
		where: { id: schoolProfileId, deletedAt: null },
		select: { academicDataDirectionMode: true, studentNameFormat: true },
	}),
);
