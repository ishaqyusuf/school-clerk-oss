import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import {
	getPerformanceRequestId,
	withPerformanceContext,
} from "@school-clerk/utils/server-performance";

export const getServerRequestContext = cache(async () => {
	const requestHeaders = await headers();
	const requestId = getPerformanceRequestId(requestHeaders.get("x-request-id"));
	const profile = await withPerformanceContext(requestId, getAuthCookie);
	return { requestHeaders, requestId, profile };
});

export const getServerWorkspace = cache(
	async () => (await getServerRequestContext()).profile,
);
