export type PageItem = Awaited<ReturnType<typeof getTransactions>>["data"][number];

export async function getTransactions() {
	return {
		data: [],
		meta: {},
	};
}
