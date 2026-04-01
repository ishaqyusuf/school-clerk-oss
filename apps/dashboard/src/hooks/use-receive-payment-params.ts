import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";

export function useReceivePaymentParams(options?: { shallow: boolean }) {
	const [params, setParams] = useQueryStates(
		{
			receivePayment: parseAsBoolean,
			receivePaymentStudentId: parseAsString,
		},
		options,
	);

	return {
		...params,
		setParams,
	};
}
