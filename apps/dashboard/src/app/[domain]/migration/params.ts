import { parseAsArrayOf, parseAsString, useQueryStates } from "nuqs";

export function useNameMerger() {
  const [params, setParams] = useQueryStates(
    {
      classRoom: parseAsString,
      names: parseAsArrayOf(parseAsString),
    },
    {
      shallow: false,
    },
  );
  return {
    params,
    setParams,
  };
}
