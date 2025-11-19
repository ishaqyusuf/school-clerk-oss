import { useQueryStates } from "nuqs";
import { createLoader, parseAsString } from "nuqs/server";

export const studentReportFilterParams = {
  departmentId: parseAsString,
  termId: parseAsString,
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
