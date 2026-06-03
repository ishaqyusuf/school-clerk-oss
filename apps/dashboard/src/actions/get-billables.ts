export type BillablePageItem = Awaited<ReturnType<typeof getBillables>>["data"][number];

export async function getBillables() {
	return {
		data: [],
		meta: {},
	};
}
