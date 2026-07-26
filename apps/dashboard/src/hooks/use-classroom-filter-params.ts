import { useQueryStates } from "nuqs";
import { createLoader, parseAsString, parseAsStringLiteral } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
type FilterKeys = keyof Exclude<
  RouterInputs["academics"]["getClassrooms"],
  void
>;

const classroomViews = ["stream", "class"] as const;

export const classroomFilterParams = {
  q: parseAsString,
  view: parseAsStringLiteral(classroomViews),
} satisfies Partial<Record<FilterKeys | "view", any>>;

export function useClassroomFilterParams() {
  const [filters, setFilters] = useQueryStates(classroomFilterParams);
  return {
    filters,
    setFilters,
    hasFilters: Object.values(filters).some((value) => value !== null),
  };
}
export const loadClassroomFilterParams = createLoader(classroomFilterParams);
