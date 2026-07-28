"use client";

import { useSortParams } from "@/hooks/use-sort-params";
import { useCallback } from "react";

export function useSortQuery() {
	const { params, setParams } = useSortParams();
	const [sortColumn, sortValue] = params.sort ?? [];

	const createSortQuery = useCallback(
		(name: string) => {
			if (sortColumn !== name) {
				setParams({ sort: [name, "asc"] });
				return;
			}

			if (sortValue === "asc") {
				setParams({ sort: [name, "desc"] });
			} else if (sortValue === "desc") {
				setParams({ sort: null });
			} else {
				setParams({ sort: [name, "asc"] });
			}
		},
		[setParams, sortColumn, sortValue],
	);

	return {
		sortColumn,
		sortValue,
		createSortQuery,
	};
}
