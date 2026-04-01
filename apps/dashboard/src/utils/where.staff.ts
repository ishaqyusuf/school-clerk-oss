import type { Prisma } from "@school-clerk/db";

import type { SearchParamsType } from "./search-params";
import { composeQuery } from "./utils";

export function whereStaff(query: SearchParamsType) {
	const where: Prisma.StaffProfileWhereInput[] = [{ deletedAt: null }];

	if (query.schoolProfileId) {
		where.push({
			schoolProfileId: query.schoolProfileId,
		});
	}

	if (query.search) {
		where.push({
			OR: [
				{
					name: {
						contains: query.search,
						mode: "insensitive",
					},
				},
				{
					title: {
						contains: query.search,
						mode: "insensitive",
					},
				},
				{
					email: {
						contains: query.search,
						mode: "insensitive",
					},
				},
			],
		});
	}

	return composeQuery(where);
}
