import { SearchParamsKeys } from "@/utils/search-params";
import { createSearchParamsCache, parseAsString } from "nuqs/server";

export const studentPageQuery = {
  search: parseAsString,
  departmentId: parseAsString,
} as { [k in SearchParamsKeys]: any };
export const searchParamsCache = createSearchParamsCache(studentPageQuery);
