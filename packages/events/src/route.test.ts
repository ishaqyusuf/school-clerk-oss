import { afterEach, expect, test } from "bun:test";
import { POST } from "./route";
const originalFetch = globalThis.fetch;
const oldVercel = process.env.VERCEL;
const oldCollector = process.env.LOGLY_COLLECTOR_URL;
const oldKey = process.env.LOGLY_PROJECT_KEY;
const oldProject = process.env.NEXT_PUBLIC_LOGLY_PROJECT;
const oldDomain = process.env.PLATFORM_ROOT_DOMAIN;

afterEach(() => {
	globalThis.fetch = originalFetch;
	for (const [key, value] of Object.entries({
		VERCEL: oldVercel,
		LOGLY_COLLECTOR_URL: oldCollector,
		LOGLY_PROJECT_KEY: oldKey,
		NEXT_PUBLIC_LOGLY_PROJECT: oldProject,
		PLATFORM_ROOT_DOMAIN: oldDomain,
	})) {
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
});
function configure() {
	process.env.LOGLY_COLLECTOR_URL = "https://collector.example";
	process.env.LOGLY_PROJECT_KEY = "test-only-key";
	process.env.NEXT_PUBLIC_LOGLY_PROJECT = "schoolclerk-web";
	process.env.PLATFORM_ROOT_DOMAIN = "school-clerk.com";
}
function request(origin = "https://tenant.school-clerk.com") {
	return new Request("https://tenant.school-clerk.com/api/analytics", {
		method: "POST",
		headers: { origin, "content-type": "application/json" },
		body: JSON.stringify({
			sentAt: new Date().toISOString(),
			sdk: { name: "@ishaqyusuf/logly-core", version: "0.2.0" },
			events: [
				{
					eventId: crypto.randomUUID(),
					project: "different-project",
					name: "page_view",
					version: 1,
					source: "browser",
					occurredAt: new Date().toISOString(),
					route: "/members/private-id",
					properties: { email: "private@example.com" },
				},
			],
		}),
	});
}
test("fails closed when no collector credential is configured", async () => {
	process.env.LOGLY_PROJECT_KEY = "";
	expect((await POST(request())).status).toBe(503);
});
test("rejects a foreign browser origin before forwarding", async () => {
	configure();
	expect((await POST(request("https://evil.example"))).status).toBe(403);
});
test("forwards only safe project-scoped events and propagates failures", async () => {
	configure();
	globalThis.fetch = (async (url, init) => {
		expect(String(url)).toBe("https://collector.example/v1/events");
		const body = JSON.parse(String(init?.body));
		expect(body.events[0]).toMatchObject({
			project: "schoolclerk-web",
			route: "/members",
			properties: {},
		});
		expect(new Headers(init?.headers).get("x-logly-origin")).toBe(
			"https://school-clerk.com",
		);
		return new Response("{}", { status: 429 });
	}) as typeof fetch;
	expect((await POST(request())).status).toBe(429);
});

test("forwards only product-edge country metadata on Vercel", async () => {
	configure();
	for (const [vercel, country, expected] of [
		["1", "NG", "NG"],
		["0", "NG", null],
		["1", "invalid", null],
		["1", "", null],
	] as const) {
		process.env.VERCEL = vercel;
		const input = request();
		input.headers.set("x-vercel-ip-country", country);
		input.headers.set("x-logly-country", "US");
		input.headers.set("x-forwarded-for", "192.0.2.1");
		globalThis.fetch = (async (_url, init) => {
			const headers = new Headers(init?.headers);
			expect(headers.get("x-logly-country")).toBe(expected);
			expect(headers.get("x-forwarded-for")).toBeNull();
			return Response.json({ accepted: 1 }, { status: 202 });
		}) as typeof fetch;
		expect((await POST(input)).status).toBe(202);
	}
});
