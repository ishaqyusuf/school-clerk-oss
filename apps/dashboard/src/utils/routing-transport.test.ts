// @ts-expect-error Bun test types are not included by this app tsconfig.
import { describe, expect, test } from "bun:test";
import { NextResponse } from "next/server";
import {
	getRegionalRoutingEndpoint,
	parseRoutingRequest,
	parseRoutingResponse,
	readRoutingBody,
	routingBodyLimit,
	serializeRoutingResponse,
	signRoutingMessage,
	verifyRoutingMessage,
} from "./routing-transport";

const secret = "test-routing-secret";
const now = 1_800_000_000_000;
const input = {
	version: 1,
	requestId: "123e4567-e89b-42d3-a456-426614174000",
	issuedAt: now,
	url: "https://school-a.school-clerk.com/academic/classes?view=all",
	method: "POST",
	headers: [
		["cookie", "identity=test-session"],
		["next-action", "test-action"],
	],
};
const body = JSON.stringify(input);
const proof = signRoutingMessage(secret, "request", body);

describe("regional routing trust boundary", () => {
	test("authenticates exact request metadata including action method and cookies", () => {
		expect(parseRoutingRequest(body, proof, secret, now)).toEqual(input);
	});
	test("missing, wrong and malformed signatures deny access", () => {
		for (const value of [null, "invalid", "00".repeat(32), proof.toUpperCase()])
			expect(parseRoutingRequest(body, value, secret, now)).toBeNull();
		expect(parseRoutingRequest(body, proof, "other-secret", now)).toBeNull();
	});
	test("changing the tenant, path, method or identity invalidates proof", () => {
		for (const patch of [
			{ url: "https://school-b.school-clerk.com/finance" },
			{ method: "GET" },
			{ headers: [["cookie", "identity=other-session"]] },
		])
			expect(
				parseRoutingRequest(
					JSON.stringify({ ...input, ...patch }),
					proof,
					secret,
					now,
				),
			).toBeNull();
	});
	test("stale and future requests cannot be replayed outside the freshness window", () => {
		expect(parseRoutingRequest(body, proof, secret, now + 30_001)).toBeNull();
		expect(parseRoutingRequest(body, proof, secret, now - 30_001)).toBeNull();
	});
	test("request proofs cannot authenticate responses", () => {
		expect(verifyRoutingMessage(secret, "response", body, proof)).toBeFalse();
	});
	test("unconfigured signing fails closed", () => {
		expect(verifyRoutingMessage("", "request", body, proof)).toBeFalse();
		expect(() => signRoutingMessage("", "request", body)).toThrow();
	});
	test("even signed malformed or oversized metadata is denied", () => {
		for (const text of [
			"not-json",
			JSON.stringify({ ...input, requestId: "bad" }),
			JSON.stringify({ ...input, url: "file:///etc/passwd" }),
			JSON.stringify({
				...input,
				url: "https://user:pass@school-a.school-clerk.com/",
			}),
			JSON.stringify({ ...input, extra: true }),
			"x".repeat(routingBodyLimit + 1),
		])
			expect(
				parseRoutingRequest(
					text,
					signRoutingMessage(secret, "request", text),
					secret,
					now,
				),
			).toBeNull();
	});
	test("response proof is bound to the exact requesting proof", () => {
		const result = JSON.stringify({
			version: 1,
			status: 200,
			headers: [["x-middleware-next", "1"]],
		});
		const signed = signRoutingMessage(
			secret,
			"response",
			`${proof}\n${result}`,
		);
		expect(parseRoutingResponse(result, signed, secret, proof).status).toBe(
			200,
		);
		expect(() =>
			parseRoutingResponse(result, signed, secret, "other-request"),
		).toThrow();
		expect(() =>
			parseRoutingResponse(result.replace("200", "201"), signed, secret, proof),
		).toThrow();
	});
	test("redirect status, destination and separate cookies survive transport", () => {
		const response = NextResponse.redirect(
			new URL(
				"https://school-a.school-clerk.com/login?return_to=academic%2Fclasses",
			),
		);
		response.cookies.set("workspace", "canonical", {
			httpOnly: true,
			secure: true,
			sameSite: "lax",
			path: "/",
		});
		response.cookies.set("expired", "", { expires: new Date(0), path: "/" });
		const result = serializeRoutingResponse(response);
		const decision = parseRoutingResponse(
			result,
			signRoutingMessage(secret, "response", `${proof}\n${result}`),
			secret,
			proof,
		);
		expect(decision.status).toBe(307);
		expect(decision.headers.find(([key]) => key === "location")?.[1]).toContain(
			"/login?return_to=",
		);
		const cookies = decision.headers
			.filter(([key]) => key === "set-cookie")
			.map(([, value]) => value);
		expect(cookies).toHaveLength(2);
		expect(cookies[0]).toContain("HttpOnly");
		expect(cookies[0]).toContain("Secure");
		expect(cookies[1]).toContain("Thu, 01 Jan 1970");
	});
	test("rewrite and canonical forwarded headers survive transport", () => {
		const response = NextResponse.rewrite(
			new URL("https://school-a.school-clerk.com/school-a/academic/classes"),
			{
				request: {
					headers: new Headers({
						cookie: "workspace=canonical",
						"x-tenant-subdomain": "school-a",
					}),
				},
			},
		);
		const result = JSON.parse(serializeRoutingResponse(response));
		const headers = new Headers(result.headers);
		expect(headers.get("x-middleware-rewrite")).toContain(
			"/school-a/academic/classes",
		);
		expect(headers.get("x-middleware-request-cookie")).toBe(
			"workspace=canonical",
		);
		expect(headers.get("x-middleware-request-x-tenant-subdomain")).toBe(
			"school-a",
		);
	});
	test("configured tenant URL remains same-origin without forwarding pathname/query to endpoint", () => {
		expect(
			getRegionalRoutingEndpoint(input.url, {
				appRootDomain: "school-clerk.com",
			}).href,
		).toBe("https://school-a.school-clerk.com/api/internal/tenant-routing");
	});
	test("custom or attacker hostname cannot select outbound destination", () => {
		expect(
			getRegionalRoutingEndpoint("https://attacker.example/", {
				appRootDomain: "school-clerk.com",
			}).origin,
		).toBe("https://app.school-clerk.com");
		expect(
			getRegionalRoutingEndpoint("https://school-clerk.com.attacker.example/", {
				appRootDomain: "school-clerk.com",
				authUrl: "https://app.school-clerk.com/api/auth",
			}).origin,
		).toBe("https://app.school-clerk.com");
		expect(() =>
			getRegionalRoutingEndpoint("http://school-a.school-clerk.com/", {
				appRootDomain: "school-clerk.com",
			}),
		).toThrow();
	});
	test("local explicit proxy port and preview deployment origin are retained", () => {
		expect(
			getRegionalRoutingEndpoint(
				"https://school-a.school-clerk-dashboard.localhost:1355/classes",
				{ appRootDomain: "school-clerk-dashboard.localhost" },
			).origin,
		).toBe("https://school-a.school-clerk-dashboard.localhost:1355");
		expect(
			getRegionalRoutingEndpoint(input.url, {
				appRootDomain: "school-clerk.com",
				vercelEnv: "preview",
				vercelUrl: "schoolclerk-dashboard-test.vercel.app",
			}).origin,
		).toBe("https://schoolclerk-dashboard-test.vercel.app");
		expect(() =>
			getRegionalRoutingEndpoint(input.url, {
				appRootDomain: "school-clerk.com",
				vercelEnv: "preview",
				vercelUrl: "attacker.example",
			}),
		).toThrow();
	});
	test("bounded body reader rejects oversized streamed messages", async () => {
		expect(await readRoutingBody(new Response("hello"), 5)).toBe("hello");
		await expect(readRoutingBody(new Response("too large"), 4)).rejects.toThrow(
			"exceeds limit",
		);
	});
});
