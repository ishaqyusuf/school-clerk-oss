import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";

export function useAddFeeParams(options?: { shallow: boolean }) {
	const [params, setParams] = useQueryStates(
		{
			addFee: parseAsBoolean,
			addFeeClassroomId: parseAsString,
		},
		options,
	);

	return {
		...params,
		setParams,
	};
}
