import {
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
  useQueryStates,
} from "nuqs";

export function useAutoCreate() {
  const [params, setParams] = useQueryStates({
    state: parseAsStringEnum(["idle", "started"]),
    studentIndex: parseAsString,
  });
  return {
    params,
    setParams,
  };
}
