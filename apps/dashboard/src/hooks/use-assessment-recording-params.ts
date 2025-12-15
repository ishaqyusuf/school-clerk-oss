import { parseAsString, parseAsStringEnum, useQueryStates } from "nuqs";

export function useAssessmentRecordingParams() {
  const [filters, setFilters] = useQueryStates({
    deptSubjectId: parseAsString,
    deptId: parseAsString,
    termId: parseAsString,
    permission: parseAsStringEnum(["classroom", "subject"]),
  });
  return {
    filters,
    setFilters,
  };
}
