export type PageItem = Awaited<ReturnType<typeof getStudentFees>>["data"][number];

export async function getStudentFees() {
	return {
		data: [],
		meta: {},
	};
}
