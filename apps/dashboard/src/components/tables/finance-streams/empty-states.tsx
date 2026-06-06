"use client";

import { EmptyState, NoResults } from "@/components/tables/core";

type EmptyStreamsProps = {
	onCreate: () => void;
};

export function EmptyStreams({ onCreate }: EmptyStreamsProps) {
	return (
		<EmptyState
			title="No finance accounts"
			description="Create tuition, book, service, or salary items to open their linked accounts."
			actionLabel="Set up fee structures"
			onAction={onCreate}
		/>
	);
}

export { NoResults };
