export type PayrollCadence =
	| "MONTHLY"
	| "TERM"
	| "DAILY"
	| "HOURLY"
	| "TASK"
	| "ONE_OFF";

/** How often a staff member is paid, in the words the bursar uses. */
export const PAYROLL_CADENCES: Array<{
	value: PayrollCadence;
	label: string;
	rateLabel: string;
	/** Suffix for a take-home amount, e.g. "per day". */
	per: string;
	hint: string;
}> = [
	{
		value: "MONTHLY",
		per: "per month",
		label: "Monthly",
		rateLabel: "Monthly pay",
		hint: "Added each month with Create salaries.",
	},
	{
		value: "TERM",
		per: "per term",
		label: "Per term",
		rateLabel: "Pay per term",
		hint: "Added once a term with Create salaries.",
	},
	{
		value: "DAILY",
		per: "per day",
		label: "Daily",
		rateLabel: "Pay per day",
		hint: "Enter the days worked when you create salaries.",
	},
	{
		value: "HOURLY",
		per: "per hour",
		label: "Hourly",
		rateLabel: "Pay per hour",
		hint: "Enter the hours worked when you create salaries.",
	},
	{
		value: "TASK",
		per: "per task",
		label: "Per task",
		rateLabel: "Usual pay per task",
		hint: "Add pay one job at a time from Create salaries.",
	},
	{
		value: "ONE_OFF",
		per: "",
		label: "One-off",
		rateLabel: "Amount",
		hint: "Add pay once, when the work is done.",
	},
];

export function payrollCadence(value: string | null | undefined) {
	return (
		PAYROLL_CADENCES.find((cadence) => cadence.value === value) ??
		PAYROLL_CADENCES[0]!
	);
}

export const naira = new Intl.NumberFormat("en-NG", {
	style: "currency",
	currency: "NGN",
	maximumFractionDigits: 2,
});

export function takeHomePay(values: {
	baseAmount: number;
	allowanceAmount: number;
	bonusAmount: number;
	deductionAmount: number;
	advanceAmount: number;
}) {
	return Math.max(
		0,
		values.baseAmount +
			values.allowanceAmount +
			values.bonusAmount -
			values.deductionAmount -
			values.advanceAmount,
	);
}
