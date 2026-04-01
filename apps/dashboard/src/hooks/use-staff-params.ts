import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";
import { z } from "zod";

const lineItemSchema = z.object({
	name: z.string(),
	price: z.number(),
	quantity: z.number(),
});

export function useStaffParams(options?: { shallow: boolean }) {
	const [params, setParams] = useQueryStates(
		{
			createStaff: parseAsBoolean,
			staffViewId: parseAsString,
			staffViewTab: parseAsString,
		},
		options,
	);

	return {
		...params,
		setParams,
	};
}
