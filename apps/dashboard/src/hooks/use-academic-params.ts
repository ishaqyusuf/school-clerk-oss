import { parseAsString, parseAsStringEnum, useQueryStates } from "nuqs";

export function useAcademicParams() {
  const [params, setParams] = useQueryStates({
    academicSessionFormType: parseAsStringEnum(["session", "term"]),
    sessionId: parseAsString,
    termId: parseAsString,
  });

  return {
    params,
    setParams,
  };
}
