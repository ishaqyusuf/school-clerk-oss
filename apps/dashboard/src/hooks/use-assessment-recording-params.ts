import { parseAsString, parseAsStringEnum, useQueryStates } from "nuqs";

export function useAssessmentRecordingParams() {
  const [filters, setFilters] = useQueryStates({
    deptSubjectId: parseAsString,
    deptId: parseAsString,
    termId: parseAsString,
    permission: parseAsStringEnum(["classroom", "subject", "all"]),
  });
  const permissions = {
    subjects: ["classroom", "all"].includes(filters.permission),
    classrooms: ["all"].includes(filters.permission),
  };
  return {
    filters,
    setFilters,
    permissions,
  };
}
