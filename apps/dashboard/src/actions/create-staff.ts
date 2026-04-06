"use server";

import { transaction } from "@/utils/db";
import type { z } from "zod";

import type { prisma } from "@school-clerk/db";

import { staffChanged } from "./cache/cache-control";
import { getAuthCookie } from "./cookies/auth-cookie";
import { actionClient } from "./safe-action";
import { createStaffSchema } from "./schema";

export type Form = z.infer<typeof createStaffSchema>;
export async function createStaff(data: Form, tx: typeof prisma) {
	const profile = await getAuthCookie();
	const pendingName =
		data.email
			?.split("@")[0]
			?.replace(/[._-]+/g, " ")
			?.replace(/\b\w/g, (match) => match.toUpperCase()) || "Pending staff";
	const resp = await tx.staffProfile.create({
		data: {
			schoolProfileId: profile.schoolId,
			name: pendingName,
			email: data.email,
			inviteStatus: "NOT_SENT",
			termProfiles: {
				create: {
					schoolSessionId: profile.sessionId,
					sessionTermId: profile.termId,
				},
			},
		},
	});
	staffChanged();
	return resp;
}
export const createStaffAction = actionClient
	.schema(createStaffSchema)
	.action(async ({ parsedInput: data }) => {
		return await transaction(async (tx) => {
			const resp = await createStaff(data, tx);
			return resp;
		});
	});
