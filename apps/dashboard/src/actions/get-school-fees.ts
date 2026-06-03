export type SchoolFeePageItem = Awaited<ReturnType<typeof getSchoolFees>>["data"][number];

export async function getSchoolFees(..._args: any[]) {
	return {
		data: [],
		meta: {},
	};
}
