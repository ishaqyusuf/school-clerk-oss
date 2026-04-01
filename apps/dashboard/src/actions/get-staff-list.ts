"use server";

import { getStaffDirectoryAction } from "@/actions/get-staff-pages";
import type { PageDataMeta, PageItemData } from "@/types";
import type { SearchParamsType } from "@/utils/search-params";

export type ListItem = PageItemData<typeof getStaffListAction>;
export async function getStaffListAction(query: SearchParamsType = {}) {
	const staff = await getStaffDirectoryAction({
		category: "teachers",
		search: query.search,
	});
	return {
		meta: {} as PageDataMeta,
		data: staff.items.map((staffProfile) => ({
			id: staffProfile.id,
			name: staffProfile.name,
			title: staffProfile.title,
			email: staffProfile.email,
			staffTermId: undefined,
		})),
	};
}
