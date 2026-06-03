"use client";

import { EmptyState, NoResults } from "@/components/tables/core";

type EmptyStreamsProps = {
	onCreate: () => void;
};

export function EmptyStreams({ onCreate }: EmptyStreamsProps) {
	return (
		<EmptyState
			title="No account streams"
			description="Create tuition, book, service, or salary items to open their streams."
			actionLabel="Create stream"
			onAction={onCreate}
		/>
	);
}

export { NoResults };
