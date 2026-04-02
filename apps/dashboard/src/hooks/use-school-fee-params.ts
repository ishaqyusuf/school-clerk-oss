import {
  parseAsBoolean,
  parseAsString,
  useQueryStates,
} from "nuqs";

export function useSchoolFeeParams(options?: { shallow: boolean }) {
  const [params, setParams] = useQueryStates(
    {
      createSchoolFee: parseAsBoolean,
      schoolFeeId: parseAsString,
      importSchoolFee: parseAsBoolean,
    },
    options
  );

  return {
    ...params,
    setParams,
  };
}
