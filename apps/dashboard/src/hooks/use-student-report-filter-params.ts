import {
  parseAsArrayOf,
  parseAsStringEnum,
  useQueryStates,
} from "nuqs";
import { createLoader, parseAsString } from "nuqs/server";

export const studentReportFilterParams = {
	departmentId: parseAsString,
	termId: parseAsString,
	// ordered list of termFormIds across all classrooms (replaces index-based selections)
	printOrder: parseAsArrayOf(parseAsString),
	// departments that have been visited / have selected students — we load data for all of them
	activeDepts: parseAsArrayOf(parseAsString),
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
	studentReportFilterParams,
);
