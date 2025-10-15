// import {
//     DISPATCH_FILTER_OPTIONS,
//     INVOICE_FILTER_OPTIONS,
//     PRODUCTION_ASSIGNMENT_FILTER_OPTIONS,
//     PRODUCTION_STATUS,
// } from "@/app/(clean-code)/(sales)/_common/utils/contants";
// import { PERMISSIONS, ROLES } from "@/data/contants/permissions";
// // Note: import from 'nuqs/server' to avoid the "use client" directive
// import { ARRAY_DELIMITER, SORT_DELIMITER } from "@/lib/delimiters";
// import { noteParamsParser, noteSchema } from "@/modules/notes/constants";
import {
  createParser,
  createSearchParamsCache,
  createSerializer,
  parseAsArrayOf,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
  parseAsStringLiteral,
} from "nuqs/server";
import { z } from "zod";

import { SORT_DELIMITER } from "./delimiters";

// import { REGIONS } from "@/constants/region";
// import { METHODS } from "@/constants/method";

// https://logs.run/i?sort=latency.desc

export const parseAsSort = createParser({
  parse(queryValue) {
    const [id, desc] = queryValue.split(SORT_DELIMITER);
    if (!id && !desc) return null;
    return { id, desc: desc === "desc" };
  },
  serialize(value) {
    return `${value.id}.${value.desc ? "desc" : "asc"}`;
  },
});
type SpecialFilters =
  | "sort"
  | "size"
  | "start"
  | "uuid"
  | "with.trashed"
  | "trashed.only"
  | "search";
export type FilterKeys = keyof typeof searchSchema._type;
export type SearchParamsKeys = SpecialFilters | FilterKeys;
const commissionFilters = ["all", "earned", "pending"] as const;
export const searchParamsParser: {
  [k in SearchParamsKeys]: any;
} = {
  ...{
    className: parseAsString,
    sort: parseAsSort,
    uuid: parseAsString,
    search: parseAsString,
    size: parseAsInteger.withDefault(30),
    start: parseAsInteger.withDefault(0),
    "with.trashed": parseAsBoolean,
    "trashed.only": parseAsBoolean,
    sessionId: parseAsString,
    schoolProfileId: parseAsString,
    // classDepartmentId: parseAsString,
  },
  gender: parseAsStringEnum(["Male", "Female"]),
  termId: parseAsString,
  studentId: parseAsString,
  departmentId: parseAsString,
  title: parseAsString,
};
export const searchSchema = z.object({
  gender: z.enum(["Male", "Female"]),
  size: z.number().optional(),
  start: z.number().optional(),
  termId: z.string().optional(),
  sessionId: z.string().optional(),
  // classDepartmentId: z.string().optional(),
  schoolProfileId: z.string().optional(),
  studentId: z.string().optional(),
  departmentId: z.string().optional(),
  "with.trashed": z.boolean().optional(),
  "trashed.only": z.boolean().optional(),
  className: z.string().optional(),
  title: z.string().optional(),
});
// .merge(noteSchema);
export const searchParamsCache = createSearchParamsCache(searchParamsParser);
export const searchParamsSerializer = createSerializer(searchParamsParser);
export type SearchParamsType = Partial<
  z.infer<typeof searchSchema> & {
    [id in SpecialFilters]: any;
  }
>; //SearchParamsType; // inferParserType<typeof searchParamsParser>;
