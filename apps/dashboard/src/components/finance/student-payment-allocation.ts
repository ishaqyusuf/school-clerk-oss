import type { QueryClient } from "@tanstack/react-query";

export const PAYMENT_METHODS = [
	"Bank Transfer",
	"Cash",
	"POS / Card",
	"Cheque",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type OpenCharge = {
	id: string;
	outstanding: number;
};

export function formatNaira(amount: number) {
	return `NGN ${Math.round(Number(amount || 0)).toLocaleString("en-NG")}`;
}

/** Whole-naira parse of a typed amount; blanks and junk become 0. */
export function parseAmount(value: string | number | null | undefined) {
	const parsed = Number(String(value ?? "").replace(/[^\d.]/g, ""));
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/**
 * Spreads a received amount across open charges in the order given (the API
 * already sorts arrears first, then required fees). Never allocates more than
 * a charge's outstanding balance; anything left over is returned as excess.
 */
export function allocateReceivedAmount(amount: number, charges: OpenCharge[]) {
	let remaining = Math.max(0, amount);
	const allocations: Record<string, number> = {};
	for (const charge of charges) {
		if (remaining <= 0) break;
		const take = Math.min(remaining, Math.max(0, charge.outstanding));
		if (take > 0) {
			allocations[charge.id] = round2(take);
			remaining = round2(remaining - take);
		}
	}
	return { allocations, excess: remaining };
}

export function round2(value: number) {
	return Math.round(value * 100) / 100;
}

/** Queries whose numbers move when a student payment posts. */
export function invalidateStudentPaymentQueries(qc: QueryClient, trpc: any) {
	const keys = [
		trpc.finance.getStudentOpenCharges.queryKey(),
		trpc.finance.getClassCollectionRoster.queryKey(),
		trpc.finance.getReceivePaymentOptions.queryKey(),
		trpc.finance.getReceivePaymentData.queryKey(),
		trpc.finance.getStudentPayments.queryKey(),
		trpc.finance.getCharges.queryKey(),
		trpc.finance.getStreams.queryKey(),
		trpc.finance.getWorkspaceSummary.queryKey(),
		trpc.finance.getAccounts.queryKey(),
		trpc.finance.searchStudentsForPayment.queryKey(),
	];
	return Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey })));
}
