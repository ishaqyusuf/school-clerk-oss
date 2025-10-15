import { useQueryStates } from "nuqs";
import { createLoader, parseAsString, parseAsInteger } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
type FilterKeys = keyof Exclude<RouterInputs["subjects"]["getSubjects"], void>;

export const subjectFilterParams = {
  q: parseAsString,
  departmentId: parseAsString,
} satisfies Partial<Record<FilterKeys, any>>;

export function useSubjectFilterParams() {
  const [filters, setFilters] = useQueryStates(subjectFilterParams);
  return {
    filters,
    setFilters,
    hasFilters: Object.values(filters).some((value) => value !== null),
  };
}
export const loadSubjectFilterParams = createLoader(subjectFilterParams);
