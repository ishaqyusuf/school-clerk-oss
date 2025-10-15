import { useQueryStates } from "nuqs";
import {
  createLoader,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";

export const questionParamsSchema = {
  subjectId: parseAsString,
  classDepartmentId: parseAsString,
};
export const loadQuestionsParams = createLoader(questionParamsSchema);
export function useQuestionParams() {
  const [params, setParams] = useQueryStates(questionParamsSchema);

  return {
    params,
    setParams,
  };
}
