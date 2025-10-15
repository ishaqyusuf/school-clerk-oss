import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";

export function useStudentParams(options?: { shallow: boolean }) {
  const [params, setParams] = useQueryStates(
    {
      createStudent: parseAsBoolean,
      createStudentDeptId: parseAsString,
      createStudentSessionId: parseAsString,
      createStudentTermId: parseAsString,
      studentViewId: parseAsString,
      studentViewTermId: parseAsString,
      studentViewTab: parseAsString,
      studentTermSheetId: parseAsString,
    },
    options
  );
  return {
    ...params,
    setParams,
  };
}
