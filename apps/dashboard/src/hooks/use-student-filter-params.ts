import { RouterInputs } from "@api/trpc/routers/_app";
import {
  STUDENT_PAGE_STATUS_FILTERS,
  STUDENT_TERM_ADMISSION_TYPES,
} from "@school-clerk/utils/constants";
import { useQueryStates } from "nuqs";
import {
  createLoader,
  createParser,
  parseAsArrayOf,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";
import {
  isValidDateFilterValue,
  normalizeDateFilterValue,
} from "@/components/midday-search-filter/date-filter-model";

export const parseAsEnrollmentDate = createParser({
  parse(queryValue) {
    const value = normalizeDateFilterValue(queryValue);
    return isValidDateFilterValue(value) ? value : null;
  },
  serialize(value: string[]) {
    return value.join(",");
  },
});

type StudentFilterKeys = keyof Exclude<RouterInputs["students"]["index"], void>;
export const studentFilterParamsSchema = {
  classroomTitle: parseAsString,
  departmentId: parseAsString,
  classroomDepartmentIds: parseAsArrayOf(parseAsString),
  departmentTitles: parseAsArrayOf(parseAsString),
  sessionTermId: parseAsString,
  sessionId: parseAsString,
  status: parseAsStringEnum([...STUDENT_PAGE_STATUS_FILTERS]),
  admissionTypes: parseAsArrayOf(
    parseAsStringEnum([...STUDENT_TERM_ADMISSION_TYPES]),
  ),
  enrollmentDate: parseAsEnrollmentDate,
  q: parseAsString,
} satisfies Partial<Record<StudentFilterKeys, any>>;

export function useStudentFilterParams() {
  const [filter, setFilters] = useQueryStates(studentFilterParamsSchema);
  return {
    filter,
    setFilters,
    hasFilters: Object.values(filter).some((value) => value !== null),
  };
}
export const loadStudentFilterParams = createLoader(studentFilterParamsSchema);
