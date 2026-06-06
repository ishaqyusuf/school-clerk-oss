import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";

export function useFinanceSheetParams(options?: { shallow: boolean }) {
	const [params, setParams] = useQueryStates(
		{
			createFinanceCharge: parseAsBoolean,
			recordFinancePayment: parseAsBoolean,
			financeChargeId: parseAsString,
			financePaymentPayerType: parseAsString,
		},
		options,
	);

	return {
		...params,
		setParams,
	};
}
