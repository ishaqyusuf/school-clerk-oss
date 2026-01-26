import { parseAsString, parseAsStringEnum, useQueryStates } from "nuqs";

export function useTermConfigurationParams() {
  const [filters, setFilters] = useQueryStates({
    classRoomConfig: parseAsStringEnum(["copy", "select", "none"]),
    subjectConfig: parseAsStringEnum(["copy", "select", "none"]),
    // teacherConfig: parseAsStringEnum(['assign','select','none']),
  });

  return {
    filters,
    setFilters,
    hasFilters: Object.values(filters).some((value) => value !== null),
  };
}
