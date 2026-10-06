import { resolveTenantRouting } from "@/lib/tenant-routing";
import {
	parseRoutingRequest,
	readRoutingBody,
	routingBodyLimit,
	routingSignatureHeader,
	serializeRoutingResponse,
	signRoutingMessage,
} from "@/utils/routing-transport";
import {
	measurePerformance,
	withPerformanceContext,
} from "@school-clerk/utils/server-performance";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const preferredRegion = "iad1";
export const maxDuration = 15;

const privateHeaders = { "Cache-Control": "private, no-store" };

export async function POST(request: NextRequest) {
	const secret = process.env.BETTER_AUTH_SECRET;
	const contentLength = Number(request.headers.get("content-length"));
	if (!secret || contentLength > routingBodyLimit)
		return NextResponse.json(
			{ error: "Forbidden" },
			{ status: 403, headers: privateHeaders },
		);
	let body: string;
	try {
		body = await readRoutingBody(request, routingBodyLimit);
	} catch {
		return NextResponse.json(
			{ error: "Forbidden" },
			{ status: 403, headers: privateHeaders },
		);
	}
	const signature = request.headers.get(routingSignatureHeader);
	const input = parseRoutingRequest(body, signature, secret);
	if (!input || !signature)
		return NextResponse.json(
			{ error: "Forbidden" },
			{ status: 403, headers: privateHeaders },
		);
	return withPerformanceContext(input.requestId, () =>
		measurePerformance("routing.total", async () => {
			try {
				const incomingHeaders = new Headers();
				for (const [name, value] of input.headers)
					incomingHeaders.append(name, value);
				const incoming = new NextRequest(input.url, {
					method: input.method,
					headers: incomingHeaders,
				});
				const decision = await resolveTenantRouting(incoming, input.requestId);
				const responseBody = serializeRoutingResponse(decision);
				return new NextResponse(responseBody, {
					headers: {
						...privateHeaders,
						"Content-Type": "application/json",
						"x-request-id": input.requestId,
						[routingSignatureHeader]: signRoutingMessage(
							secret,
							"response",
							`${signature}\n${responseBody}`,
						),
					},
				});
			} catch {
				console.error("Regional tenant routing could not be resolved", {
					requestId: input.requestId,
				});
				return NextResponse.json(
					{ error: "Workspace temporarily unavailable" },
					{ status: 503, headers: privateHeaders },
				);
			}
		}),
	);
}
