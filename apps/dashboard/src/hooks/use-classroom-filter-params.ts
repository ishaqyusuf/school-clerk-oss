import { useQueryStates } from "nuqs";
import { createLoader, parseAsString, parseAsInteger } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
type FilterKeys = keyof Exclude<
  RouterInputs["academics"]["getClassrooms"],
  void
>;

export const classroomFilterParams = {
  q: parseAsString,
} satisfies Partial<Record<FilterKeys, any>>;

export function useClassroomFilterParams() {
  const [filters, setFilters] = useQueryStates(classroomFilterParams);
  return {
    filters,
    setFilters,
    hasFilters: Object.values(filters).some((value) => value !== null),
  };
}
export const loadClassroomFilterParams = createLoader(classroomFilterParams);
