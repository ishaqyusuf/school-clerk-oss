import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import {
	getPerformanceRequestId,
	withPerformanceContext,
} from "@school-clerk/utils/server-performance";

export async function GET() {
	const requestId = getPerformanceRequestId(
		(await headers()).get("x-request-id"),
	);
	return withPerformanceContext(requestId, async () => {
		try {
			const profile = await getAuthCookie();
			if (!profile.auth.bearerToken) {
				return NextResponse.json(
					{ error: "Unauthorized" },
					{ status: 401, headers: { "Cache-Control": "private, no-store" } },
				);
			}
			return NextResponse.json(profile, {
				headers: { "Cache-Control": "private, no-store" },
			});
		} catch {
			console.error("Unable to load workspace profile");
			return NextResponse.json(
				{ error: "Workspace temporarily unavailable" },
				{ status: 503, headers: { "Cache-Control": "private, no-store" } },
			);
		}
	});
}
