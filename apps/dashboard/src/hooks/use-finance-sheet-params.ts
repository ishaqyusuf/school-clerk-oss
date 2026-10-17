import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";

export function useFinanceSheetParams(options?: { shallow: boolean }) {
	const [params, setParams] = useQueryStates(
		{
			createFinanceCharge: parseAsBoolean,
			recordFinancePayment: parseAsBoolean,
			financeChargeId: parseAsString,
			financePaymentPayerType: parseAsString,
			financeAccountId: parseAsString,
			createFinanceAccount: parseAsBoolean,
			transferFunds: parseAsBoolean,
			transferFromAccountId: parseAsString,
			/** "SERVICE" or "PURCHASE": opens the pay-for-a-service / record-a-purchase sheet. */
			recordExpense: parseAsString,
			paySalaries: parseAsBoolean,
			/** Staff profile whose pay setup is being edited. */
			staffPayStaffId: parseAsString,
			createSalaries: parseAsBoolean,
		},
		options,
	);

	return {
		...params,
		setParams,
	};
}
