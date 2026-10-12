import {
	readBoundedBody,
	hasAssistantRequestOrigin,
} from "@/lib/assistant/request";
import { after } from "next/server";
import { assistantRequestContext } from "@/lib/assistant/context";
import { streamAssistant } from "@api/assistant/stream";
import { AssistantRequestError } from "@school-clerk/db/assistant";
import { DashboardAccessError } from "@/lib/module-access";
import { TRPCError } from "@trpc/server";
export const maxDuration = 60;
export async function POST(request: Request) {
	try {
		if (!hasAssistantRequestOrigin(request))
			return Response.json({ error: "Invalid origin" }, { status: 403 });
		const raw = new TextDecoder().decode(await readBoundedBody(request, 64000));
		if (raw.length > 64000)
			return Response.json({ error: "Request is too large" }, { status: 413 });
		const result = await streamAssistant(
			await assistantRequestContext(),
			JSON.parse(raw),
		);
		if (result instanceof Response) return result;
		after(result.completion);
		return result.response;
	} catch (error) {
		const status =
			error instanceof DashboardAccessError
				? error.status
				: error instanceof AssistantRequestError
					? error.code === "TOO_MANY_REQUESTS"
						? 429
						: 409
					: error instanceof TRPCError
						? error.code === "UNAUTHORIZED"
							? 401
							: 403
						: 400;
		return Response.json(
			{
				error:
					status === 429
						? "Assistant usage limit reached."
						: "Assistant request unavailable. Check your connection and school access.",
			},
			{ status, headers: { "Cache-Control": "private, no-store" } },
		);
	}
}
