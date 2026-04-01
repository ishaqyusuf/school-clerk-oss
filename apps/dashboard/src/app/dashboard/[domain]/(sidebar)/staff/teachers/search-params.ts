import { createSearchParamsCache, parseAsString } from "nuqs/server";

export const staffPageQuery = {
	search: parseAsString,
};
export const searchParamsCache = createSearchParamsCache(staffPageQuery);
