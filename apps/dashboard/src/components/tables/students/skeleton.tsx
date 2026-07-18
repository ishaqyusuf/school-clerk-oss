"use client";

import { TableSkeleton } from "@/components/tables/core";
import { STICKY_COLUMNS } from "@/utils/table-configs";
import type { TableSettings } from "@/utils/table-settings";

import { columns } from "./columns";
import { useAcademicDataDirection } from "@/components/academic-data-direction/provider";

type Props = {
	initialSettings?: Partial<TableSettings>;
	rowCount?: number;
	isEmpty?: boolean;
};

export function StudentsSkeleton({ initialSettings, rowCount, isEmpty }: Props) {
	const academicDataDirection = useAcademicDataDirection();

	return (
		<div dir={academicDataDirection}>
			<TableSkeleton
				direction={academicDataDirection}
				columns={columns}
				rowCount={rowCount}
				isEmpty={isEmpty}
				columnVisibility={initialSettings?.columns}
				columnSizing={initialSettings?.sizing}
				columnOrder={initialSettings?.order}
				stickyColumnIds={STICKY_COLUMNS.students.map(({ id }) => id)}
			/>
		</div>
	);
}

export { StudentsSkeleton as ClassesSkeleton };
