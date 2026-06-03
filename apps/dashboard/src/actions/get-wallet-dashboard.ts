export async function getWalletDashboard() {
	return {
		summary: {
			activeStreams: 0,
			totalIn: 0,
			totalOut: 0,
			availableFunds: 0,
			pendingBills: 0,
			pendingFees: 0,
			owingAmount: 0,
			projectedBalance: 0,
		},
		pendingFeeByWalletType: [],
	};
}
