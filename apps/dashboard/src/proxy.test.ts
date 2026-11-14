import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { getTenantUrlHeaderNames } from "@school-clerk/tenant-url";
import { NextRequest } from "next/server";
import proxy from "./proxy";
import {
	parseRoutingRequest,
	routingSignatureHeader,
	signRoutingMessage,
} from "./utils/routing-transport";
import { getDashboardTenantUrlConfig } from "./utils/tenant-url-config";

const rootHost = "school-clerk-dashboard.localhost";
const secret = "routing-test-secret";
const port = "1355";
const origin = `https://${rootHost}:${port}`;

function request(
	path: string,
	options: { host?: string; method?: string; headers?: HeadersInit } = {},
) {
	const host = options.host ?? rootHost;
	const headers = new Headers(options.headers);
	if (!headers.has("host")) headers.set("host", `${host}:${port}`);
	return new NextRequest(`https://${host}:${port}${path}`, {
		method: options.method,
		headers,
	});
}

describe("dashboard Proxy root fast path", () => {
	const environment = {
		APP_ROOT_DOMAIN: process.env.APP_ROOT_DOMAIN,
		BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
		NODE_ENV: process.env.NODE_ENV,
		VERCEL_ENV: process.env.VERCEL_ENV,
		VERCEL_URL: process.env.VERCEL_URL,
	};

	function setEnvironment() {
		process.env.APP_ROOT_DOMAIN = rootHost;
		process.env.BETTER_AUTH_SECRET = secret;
		Object.assign(process.env, { NODE_ENV: "development" });
		process.env.VERCEL_ENV = "preview";
		process.env.VERCEL_URL = "schoolclerk-dashboard-preview.vercel.app";
	}

	afterEach(() => {
		for (const [name, value] of Object.entries(environment)) {
			if (value === undefined) delete process.env[name];
			else process.env[name] = value;
		}
	});

	test("GET and HEAD on the configured root redirect without a regional call", async () => {
		setEnvironment();
		const fetch = spyOn(globalThis, "fetch").mockRejectedValue(
			new Error("unexpected hop"),
		);
		try {
			for (const method of ["GET", "HEAD"]) {
				const response = await proxy(
					request("/academic/classes?view=all", { method }),
				);
				expect(response.status).toBe(307);
				expect(response.headers.get("location")).toBe(`${origin}/sign-up`);
			}
			expect(fetch).not.toHaveBeenCalled();
		} finally {
			fetch.mockRestore();
		}
	});

	test("root signup keeps request metadata while dropping spoofed identity and tenant headers", async () => {
		setEnvironment();
		const names = getTenantUrlHeaderNames(getDashboardTenantUrlConfig());
		const response = await proxy(
			request("/sign-up?ref=welcome", {
				headers: {
					cookie: "preference=example",
					"x-user-id": "spoofed-user",
					"x-session-token": "spoofed-session",
					"x-tenant-hostname": "spoofed.example",
					"x-tenant-subdomain": "school-b",
					"x-request-id": "spoofed-request-id",
					[names.domain]: "school-b",
					[names.accountId]: "spoofed-account",
					[names.pathname]: "/finance",
				},
			}),
		);
		expect(response.headers.get("x-middleware-next")).toBe("1");
		const forwarded = (name: string) =>
			response.headers.get(`x-middleware-request-${name}`);
		expect(forwarded("cookie")).toBe("preference=example");
		expect(forwarded("x-request-id")).toMatch(/^[\da-f-]{36}$/);
		expect(forwarded(names.pathname)).toBe("/sign-up");
		expect(forwarded(names.urlStyle)).toBe("root");
		for (const name of [
			"x-user-id",
			"x-session-token",
			"x-tenant-hostname",
			"x-tenant-subdomain",
			names.domain,
			names.accountId,
		]) {
			expect(forwarded(name)).toBeNull();
		}
	});

	test("tenant, custom domain, path-style and action requests retain the signed preview hop", async () => {
		setEnvironment();
		const requests = [
			request("/login", { host: `school-a.${rootHost}` }),
			request("/student-report", { host: `dashboard.school-b.${rootHost}` }),
			request("/finance", { host: "school.example" }),
			request("/finance", {
				host: "school.example",
				headers: { "x-forwarded-host": rootHost },
			}),
			request("/school-a/finance", { host: "localhost" }),
			request("/sign-up", {
				method: "POST",
				headers: { "next-action": "signup" },
			}),
			request("/finance", {
				headers: { "x-forwarded-host": `school-a.${rootHost}` },
			}),
			request("/finance", {
				headers: { host: "school.example", "x-forwarded-host": rootHost },
			}),
		];
		const fetch = spyOn(globalThis, "fetch").mockImplementation(
			Object.assign(
				async (url: RequestInfo | URL, init?: RequestInit) => {
					expect(String(url)).toBe(
						"https://schoolclerk-dashboard-preview.vercel.app/api/internal/tenant-routing",
					);
					const expected = requests.shift();
					const headers = new Headers(init?.headers);
					const proof = headers.get(routingSignatureHeader);
					const signed = parseRoutingRequest(String(init?.body), proof, secret);
					expect(signed?.url).toBe(expected?.url);
					expect(signed?.method ?? "").toBe(expected?.method ?? "");
					expect(signed?.headers).toEqual(Array.from(expected?.headers ?? []));
					const body = JSON.stringify({
						version: 1,
						status: 200,
						headers: [["x-middleware-next", "1"]],
					});
					return new Response(body, {
						headers: {
							"content-type": "application/json",
							[routingSignatureHeader]: signRoutingMessage(
								secret,
								"response",
								`${proof}\n${body}`,
							),
						},
					});
				},
				{ preconnect: globalThis.fetch.preconnect },
			),
		);
		try {
			for (const incoming of [...requests]) {
				expect((await proxy(incoming)).status).toBe(200);
			}
			expect(requests).toHaveLength(0);
		} finally {
			fetch.mockRestore();
		}
	});
});
