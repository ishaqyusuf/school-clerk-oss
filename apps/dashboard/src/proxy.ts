import {
	measurePerformance,
	withPerformanceContext,
} from "@school-clerk/utils/server-performance";
import { type NextRequest, NextResponse } from "next/server";
import {
	getRegionalRoutingEndpoint,
	parseRoutingResponse,
	readRoutingBody,
	routingBodyLimit,
	routingRequestSchema,
	routingResponseLimit,
	routingSignatureHeader,
	signRoutingMessage,
} from "./utils/routing-transport";
import { getDashboardTenantUrlConfig } from "./utils/tenant-url-config";

export const config = {
	matcher: [
		"/((?!api/|_next/|_static/|__nextjs|_vercel|fonts/|[\\w-]+\\.\\w+).*)",
	],
};

export default async function proxy(req: NextRequest) {
	const requestId = crypto.randomUUID();
	return withPerformanceContext(requestId, () =>
		measurePerformance("proxy.total", async () => {
			try {
				const endpoint = getRegionalRoutingEndpoint(req.url, {
					appRootDomain: getDashboardTenantUrlConfig().appRootDomain,
					vercelEnv: process.env.VERCEL_ENV,
					vercelUrl: process.env.VERCEL_URL,
					authUrl: process.env.BETTER_AUTH_URL,
					dashboardUrl: process.env.DASHBOARD_APP_URL,
				});
				const secret = process.env.BETTER_AUTH_SECRET;
				if (!secret)
					throw new Error(
						"Routing authentication configuration is unavailable",
					);
				const body = JSON.stringify(
					routingRequestSchema.parse({
						version: 1,
						requestId,
						issuedAt: Date.now(),
						url: req.url,
						method: req.method,
						headers: Array.from(req.headers.entries()),
					}),
				);
				if (Buffer.byteLength(body) > routingBodyLimit)
					throw new Error("Routing request exceeds limit");
				const signature = signRoutingMessage(secret, "request", body);
				const requestHeaders = new Headers({
					"content-type": "application/json",
					[routingSignatureHeader]: signature,
					"x-request-id": requestId,
				});
				if (process.env.VERCEL_ENV === "preview") {
					// Reuse existing preview access; do not weaken deployment protection.
					const cookie = req.headers.get("cookie");
					if (cookie) requestHeaders.set("cookie", cookie);
					const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
					if (bypass) requestHeaders.set("x-vercel-protection-bypass", bypass);
				}
				const upstream = await measurePerformance(
					"proxy.regional-routing",
					() =>
						fetch(endpoint, {
							method: "POST",
							body,
							headers: requestHeaders,
							cache: "no-store",
							redirect: "manual",
							signal: AbortSignal.timeout(8_000),
						}),
				);
				if (
					!upstream.ok ||
					!upstream.headers.get("content-type")?.includes("application/json")
				)
					throw new Error("Regional routing unavailable");
				const responseBody = await readRoutingBody(
					upstream,
					routingResponseLimit,
				);
				if (Buffer.byteLength(responseBody) > routingResponseLimit)
					throw new Error("Routing response exceeds limit");
				const decision = parseRoutingResponse(
					responseBody,
					upstream.headers.get(routingSignatureHeader),
					secret,
					signature,
				);
				const responseHeaders = new Headers();
				for (const [name, value] of decision.headers)
					responseHeaders.append(name, value);
				// Better Auth may renew/clear its signed cookies in the regional handler.
				for (const cookie of upstream.headers.getSetCookie())
					responseHeaders.append("set-cookie", cookie);
				return new NextResponse(null, {
					status: decision.status,
					headers: responseHeaders,
				});
			} catch {
				console.error("Regional tenant routing temporarily unavailable", {
					requestId,
				});
				return new NextResponse(
					"School workspace temporarily unavailable. Please retry.",
					{
						status: 503,
						headers: {
							"Cache-Control": "private, no-store",
							"x-request-id": requestId,
						},
					},
				);
			}
		}),
	);
}
