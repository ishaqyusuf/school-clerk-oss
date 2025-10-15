import { useQueryStates } from "nuqs";
import { parseAsInteger } from "nuqs/server";

export function useQuestionFormParams() {
  const [params, setParams] = useQueryStates({
    postId: parseAsInteger,
  });
  return {
    params,
    setParams,
  };
}
