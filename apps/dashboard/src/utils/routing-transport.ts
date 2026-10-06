import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const routingEndpointPath = "/api/internal/tenant-routing";
export const routingSignatureHeader = "x-school-clerk-routing-signature";
export const routingBodyLimit = 65_536;
export const routingResponseLimit = 131_072;

const headerEntries = z
	.array(z.tuple([z.string().min(1).max(256), z.string().max(32_768)]))
	.max(128);
export const routingRequestSchema = z
	.object({
		version: z.literal(1),
		requestId: z.string().uuid(),
		issuedAt: z.number().int(),
		url: z.string().url().max(16_384),
		method: z.enum([
			"GET",
			"HEAD",
			"POST",
			"PUT",
			"PATCH",
			"DELETE",
			"OPTIONS",
		]),
		headers: headerEntries,
	})
	.strict();
export const routingResponseSchema = z
	.object({
		version: z.literal(1),
		status: z.number().int().min(200).max(399),
		headers: headerEntries,
	})
	.strict();
export type RoutingRequest = z.infer<typeof routingRequestSchema>;

export function signRoutingMessage(
	secret: string,
	purpose: "request" | "response",
	message: string,
) {
	if (!secret)
		throw new Error("Routing authentication configuration is unavailable");
	return createHmac("sha256", secret)
		.update(`school-clerk/tenant-routing/${purpose}/v1\n`)
		.update(message)
		.digest("hex");
}
export function verifyRoutingMessage(
	secret: string,
	purpose: "request" | "response",
	message: string,
	signature: string | null,
) {
	if (!secret || !signature || !/^[a-f0-9]{64}$/.test(signature)) return false;
	return timingSafeEqual(
		Buffer.from(signature, "hex"),
		Buffer.from(signRoutingMessage(secret, purpose, message), "hex"),
	);
}
export function parseRoutingRequest(
	body: string,
	signature: string | null,
	secret: string,
	now = Date.now(),
): RoutingRequest | null {
	if (
		Buffer.byteLength(body) > routingBodyLimit ||
		!verifyRoutingMessage(secret, "request", body, signature)
	)
		return null;
	try {
		const parsed = routingRequestSchema.safeParse(JSON.parse(body));
		if (!parsed.success || Math.abs(now - parsed.data.issuedAt) > 30_000)
			return null;
		const url = new URL(parsed.data.url);
		if (
			!["https:", "http:"].includes(url.protocol) ||
			url.username ||
			url.password ||
			url.hash
		)
			return null;
		return parsed.data;
	} catch {
		return null;
	}
}
export function serializeRoutingResponse(response: Response) {
	const entries = Array.from(response.headers.entries()).filter(
		([name]) => name !== "set-cookie",
	);
	for (const cookie of response.headers.getSetCookie())
		entries.push(["set-cookie", cookie]);
	return JSON.stringify(
		routingResponseSchema.parse({
			version: 1,
			status: response.status,
			headers: entries,
		}),
	);
}
export function parseRoutingResponse(
	body: string,
	signature: string | null,
	secret: string,
	requestSignature: string,
) {
	if (
		Buffer.byteLength(body) > routingResponseLimit ||
		!verifyRoutingMessage(
			secret,
			"response",
			`${requestSignature}\n${body}`,
			signature,
		)
	)
		throw new Error("Invalid routing response");
	return routingResponseSchema.parse(JSON.parse(body));
}

export function getRegionalRoutingEndpoint(
	requestUrl: string,
	config: {
		appRootDomain: string;
		vercelEnv?: string;
		vercelUrl?: string;
		authUrl?: string;
		dashboardUrl?: string;
	},
) {
	if (config.vercelEnv === "preview") {
		if (
			!config.vercelUrl ||
			!/^[a-z0-9.-]+\.vercel\.app$/i.test(config.vercelUrl)
		)
			throw new Error("Preview routing origin is unavailable");
		return new URL(routingEndpointPath, `https://${config.vercelUrl}`);
	}
	const request = new URL(requestUrl);
	const root = new URL(`https://${config.appRootDomain}`);
	if (
		request.username ||
		request.password ||
		!(
			request.protocol === "https:" ||
			(request.protocol === "http:" && root.hostname.endsWith(".localhost"))
		)
	)
		throw new Error("Invalid routing origin");
	// Only configured application-root hosts can determine an outbound origin.
	if (
		request.hostname === root.hostname ||
		request.hostname.endsWith(`.${root.hostname}`)
	) {
		return new URL(routingEndpointPath, request.origin);
	}
	// Custom domains resolve through a fixed server-configured application origin.
	const configured =
		config.authUrl || config.dashboardUrl || `https://app.${root.host}`;
	const origin = new URL(
		configured.includes("://") ? configured : `https://${configured}`,
	);
	if (
		origin.protocol !== "https:" ||
		origin.username ||
		origin.password ||
		origin.search ||
		origin.hash ||
		!["/", "/api/auth", "/api/auth/"].includes(origin.pathname)
	)
		throw new Error("Invalid configured routing origin");
	return new URL(routingEndpointPath, origin.origin);
}

export async function readRoutingBody(
	input: Request | Response,
	limit: number,
) {
	if (!input.body) return "";
	const reader = input.body.getReader();
	const chunks: Uint8Array[] = [];
	let length = 0;
	try {
		while (true) {
			const next = await reader.read();
			if (next.done) break;
			length += next.value.byteLength;
			if (length > limit) {
				await reader.cancel();
				throw new Error("Routing message exceeds limit");
			}
			chunks.push(next.value);
		}
		return Buffer.concat(chunks).toString("utf8");
	} finally {
		reader.releaseLock();
	}
}
