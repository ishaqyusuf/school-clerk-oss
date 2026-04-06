import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";

export const schoolFeeFilterParams = {
	createSchoolFee: parseAsBoolean,
	schoolFeeId: parseAsString,
	importSchoolFee: parseAsBoolean,
	search: parseAsString,
};

export function useSchoolFeeParams(options?: { shallow: boolean }) {
	const [params, setParams] = useQueryStates(schoolFeeFilterParams, options);

	return {
		...params,
		setParams,
	};
}
