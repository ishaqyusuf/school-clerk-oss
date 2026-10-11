"use client";

import { useTRPC } from "@/trpc/client";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useDeferredValue, useMemo } from "react";
import { useAuth } from "./use-auth";

export function useStudentSuggestions(
	names: {
		name?: string | null;
		surname?: string | null;
		otherName?: string | null;
	},
	enabled: boolean,
) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const auth = useAuth();
	const input = useMemo(
		() => ({
			name: names.name?.trim() ?? "",
			surname: names.surname?.trim() ?? "",
			otherName: names.otherName?.trim() ?? "",
			pageSize: 5,
			viewScope: {
				schoolId: auth.profile?.schoolId ?? "",
				userId: auth.id ?? "",
				loginSessionId: auth.sessionId ?? "",
				sessionId: auth.profile?.sessionId ?? "",
				termId: auth.profile?.termId ?? "",
			},
		}),
		[
			names.name,
			names.surname,
			names.otherName,
			auth.profile?.schoolId,
			auth.id,
			auth.sessionId,
			auth.profile?.sessionId,
			auth.profile?.termId,
		],
	);
	const deferred = useDeferredValue(input);
	const hasName = [input.name, input.surname, input.otherName].some(
		(part) => part.length >= 2,
	);
	const workspaceReady =
		!auth.isPending &&
		!auth.isProfileLoading &&
		!auth.isProfileError &&
		!!auth.id &&
		!!auth.sessionId &&
		auth.profile?.auth?.userId === auth.id &&
		!!auth.profile?.schoolId &&
		!!auth.profile?.sessionId &&
		!!auth.profile?.termId;
	const query = useInfiniteQuery({
		...trpc.students.suggestions.infiniteQueryOptions(deferred, {
			getNextPageParam: (page) => page.meta.cursor,
		}),
		enabled: enabled && hasName && workspaceReady && input === deferred,
		retry: false,
		staleTime: 0,
	});
	const students = useMemo(
		() => [
			...new Map(
				query.data?.pages
					.flatMap((page) => page.data)
					.map((student) => [student.id, student]),
			).values(),
		],
		[query.data],
	);
	return {
		...query,
		students: enabled && workspaceReady && input === deferred ? students : [],
		hasName,
		workspaceReady,
		isUpdatingName: input !== deferred,
		count: query.data?.pages[0]?.meta.count ?? 0,
		matchingCount: query.data?.pages[0]?.meta.matchingCount ?? 0,
		stop: () => {
			void queryClient.cancelQueries({
				queryKey: trpc.students.suggestions.queryKey(),
			});
		},
		invalidate: () => {
			void queryClient.invalidateQueries({
				queryKey: trpc.students.suggestions.queryKey(),
			});
		},
	};
}
