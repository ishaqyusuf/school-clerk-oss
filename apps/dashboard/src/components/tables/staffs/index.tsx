import { getStaffListAction } from "@/actions/get-staff-list";

import { EmptyState, NoResults } from "./empty-states";
import { DataTable } from "./table";

type Props = {
	//   page: number;
	//   query?: string | null;
	//   sort?: string[] | null;
	//   start?: string | null;
	//   end?: string | null;
	//   statuses?: string[] | null;
	//   customers?: string[] | null;
	query?;
};

const pageSize = 25;

export async function Table({ query }: Props) {
	const { sort, page = 0, search } = query;

	async function loadMore({ from, to }: { from: number; to: number }) {
		"use server";

		return getStaffListAction({
			// start
			// to,
			// from: from + 1,
			// searchQuery: query,
			sort,
			...query,
			// filter,
		});
	}
	const { data, meta } = await getStaffListAction({
		...query,
		// searchQuery: query,
		// sort,
		// filter,
		// to: pageSize,
	});

	const hasNextPage = Boolean(
		meta?.count && meta.count / (page + 1) > pageSize,
	);
	const hasActiveFilters = Boolean(search);

	if (!data?.length) {
		if (hasActiveFilters) {
			return <NoResults />;
		}

		return <EmptyState />;
	}
	return (
		<DataTable
			data={data}
			loadMore={loadMore}
			pageSize={pageSize}
			hasNextPage={hasNextPage}
			// page={page}
		/>
	);
}
