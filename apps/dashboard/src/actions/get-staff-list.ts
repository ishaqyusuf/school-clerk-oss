"use server";

import type { PageDataMeta, PageItemData } from "@/types";
import type { SearchParamsType } from "@/utils/search-params";
import { whereStaff } from "@/utils/where.staff";

import { prisma } from "@school-clerk/db";

import { getAuthCookie } from "./cookies/auth-cookie";

export type ListItem = PageItemData<typeof getStaffListAction>;
export async function getStaffListAction(query: SearchParamsType = {}) {
	const profile = await getAuthCookie();

	if (!profile.schoolId || !profile.sessionId || !profile.termId) {
		return {
			meta: {} as PageDataMeta,
			data: [],
		};
	}

	const where = whereStaff({
		...query,
		schoolProfileId: profile.schoolId,
	});
	const staff = await prisma.staffProfile.findMany({
		where: {
			AND: [
				where ?? {},
				{
					termProfiles: {
						some: {
							deletedAt: null,
							schoolSessionId: profile.sessionId,
							sessionTermId: profile.termId,
						},
					},
				},
			],
		},
		select: {
			id: true,
			name: true,
			title: true,
			email: true,
			termProfiles: {
				where: {
					deletedAt: null,
					schoolSessionId: profile.sessionId,
					sessionTermId: profile.termId,
				},
				take: 1,
				select: {
					id: true,
				},
			},
		},
		orderBy: {
			name: "asc",
		},
	});
	return {
		meta: {} as PageDataMeta,
		data: staff.map(({ termProfiles, ...staffProfile }) => {
			return {
				...staffProfile,
				staffSessionId: termProfiles?.[0]?.id,
				staffTermId: termProfiles?.[0]?.id,
			};
		}),
	};
}
