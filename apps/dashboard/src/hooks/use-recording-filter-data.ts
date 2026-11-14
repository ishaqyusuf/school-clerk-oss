"use client";

import {
	type ProgressSnapshot,
	RECORDING_CACHE_GC_TIME,
	RECORDING_OPTIONS_STALE_TIME,
	RECORDING_PROGRESS_STALE_TIME,
	progressDepartmentIds,
	refreshDirtyRecordingProgress,
} from "@/components/assessment-recording/recording-cache";
import { useTRPC, useTRPCClient } from "@/trpc/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";

/**
 * Terms, classrooms and their subjects for the recording filter. Cached for
 * 30 minutes; structure-changing mutations mark it stale.
 */
export function useRecordingFilterOptions(
	termId: string | null,
	{ enabled = true }: { enabled?: boolean } = {},
) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const query = useQuery(
		trpc.assessments.getRecordingContextOptions.queryOptions(
			{ termId },
			{
				enabled,
				staleTime: RECORDING_OPTIONS_STALE_TIME,
				gcTime: RECORDING_CACHE_GC_TIME,
			},
		),
	);

	// The "no term yet" answer is also the answer for its default term, so
	// seed that key: the page's switch to `?termId=` then needs no request.
	const data = query.data;
	useEffect(() => {
		if (termId || !data?.defaultTermId) return;
		const key = trpc.assessments.getRecordingContextOptions.queryKey({
			termId: data.defaultTermId,
		});
		if (!queryClient.getQueryData(key)) {
			queryClient.setQueryData(key, data);
		}
	}, [data, queryClient, termId, trpc]);

	return query;
}

/** Per-classroom recorded/expected counts for one term. */
export function useRecordingProgress(
	termId: string | null | undefined,
	classroomIds: Array<string | null | undefined>,
	{ enabled = true }: { enabled?: boolean } = {},
) {
	const trpc = useTRPC();
	const departmentIds = useMemo(
		() => progressDepartmentIds(classroomIds),
		[classroomIds],
	);
	const query = useQuery(
		trpc.assessments.getRecordingProgress.queryOptions(
			{ termId: termId ?? "", departmentIds },
			{
				enabled: enabled && !!termId && departmentIds.length > 0,
				staleTime: RECORDING_PROGRESS_STALE_TIME,
				gcTime: RECORDING_CACHE_GC_TIME,
			},
		),
	);
	return {
		...query,
		progress: (query.data?.classrooms ?? {}) as Record<
			string,
			ProgressSnapshot
		>,
	};
}

/**
 * Brings the filter up to date when it opens: re-counts classrooms with new
 * scores and refetches whatever a mutation marked stale. Fresh data is left
 * alone, so opening the filter repeatedly costs nothing.
 */
export function useRefreshRecordingFilter() {
	const trpc = useTRPC();
	const trpcClient = useTRPCClient();
	const queryClient = useQueryClient();
	return useCallback(() => {
		void refreshDirtyRecordingProgress(queryClient, (input) =>
			trpcClient.assessments.getRecordingProgress.query(input),
		);
		void queryClient.refetchQueries({
			queryKey: trpc.assessments.getRecordingContextOptions.pathKey(),
			stale: true,
			type: "active",
		});
		void queryClient.refetchQueries({
			queryKey: trpc.assessments.getRecordingProgress.pathKey(),
			stale: true,
			type: "active",
		});
	}, [queryClient, trpc, trpcClient]);
}
