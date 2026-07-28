import { RouterInputs } from "@api/trpc/routers/_app";
import {
  STUDENT_PAGE_STATUS_FILTERS,
  STUDENT_TERM_ADMISSION_TYPES,
} from "@school-clerk/utils/constants";
import { useQueryStates } from "nuqs";
import {
  createLoader,
  parseAsArrayOf,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";

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
