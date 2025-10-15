import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";
import { z } from "zod";

const lineItemSchema = z.object({
  name: z.string(),
  price: z.number(),
  quantity: z.number(),
});

export function useBillParams(options?: { shallow: boolean }) {
  const [params, setParams] = useQueryStates(
    {
      createBill: parseAsBoolean,
    },
    options
  );

  return {
    ...params,
    setParams,
  };
}
