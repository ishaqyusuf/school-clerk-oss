import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsStringEnum,
  useQueryStates,
} from "nuqs";
import { createLoader, parseAsString } from "nuqs/server";

export const studentReportFilterParams = {
  departmentId: parseAsString,
  termId: parseAsString,
  selections: parseAsArrayOf(parseAsInteger),
  tab: parseAsStringEnum(["print", "classroom-results"]).withDefault("print"),
};

export function useStudentReportFilterParams() {
  const [filters, setFilters] = useQueryStates(studentReportFilterParams);
  return {
    filters,
    setFilters,
    hasFilters: Object.values(filters).some((value) => value !== null),
  };
}
export const loadStudentReportFilterParams = createLoader(
  studentReportFilterParams
);
