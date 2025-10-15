import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";
import { z } from "zod";

const lineItemSchema = z.object({
  name: z.string(),
  price: z.number(),
  quantity: z.number(),
});

export function useTermBillableParams(options?: { shallow: boolean }) {
  const [params, setParams] = useQueryStates(
    {
      createTermBillable: parseAsBoolean,
      billableId: parseAsString,
    },
    options
  );

  return {
    ...params,
    setParams,
  };
}
