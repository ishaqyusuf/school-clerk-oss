export type PageItem = Awaited<ReturnType<typeof getBills>>["data"][number];

export async function getBills() {
	return {
		data: [],
		meta: {},
	};
}
