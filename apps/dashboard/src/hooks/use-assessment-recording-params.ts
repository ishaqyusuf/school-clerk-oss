import { parseAsString, parseAsStringEnum, useQueryStates } from "nuqs";

export function useAssessmentRecordingParams() {
  const [filters, setFilters] = useQueryStates({
    deptSubjectId: parseAsString,
    deptId: parseAsString,
    termId: parseAsString,
    permission: parseAsStringEnum([
      "classroom",
      "none",
      "subject",
      "all",
    ]).withDefault("none"),
  });
  const permissions = {
    subjects: ["classroom", "all", "subject"].includes(filters.permission),
    classrooms: ["all", "classroom"].includes(filters.permission),
    all: filters.permission === "all",
  };
  return {
    filters,
    setFilters,
    permissions,
  };
}
