import { expect, test } from "bun:test";
import { hasAssistantRequestOrigin } from "./request";

test("assistant origin accepts public HTTPS behind an internal HTTP proxy", () => {
	const request = new Request("http://localhost:2200/api/assistant/chat", {
		headers: {
			origin: "https://school.example",
			"x-forwarded-host": "school.example",
			host: "localhost:2200",
		},
	});
	expect(hasAssistantRequestOrigin(request)).toBe(true);
});

test("assistant origin rejects sibling tenants, insecure and opaque origins", () => {
	for (const origin of [
		"https://other.example",
		"http://school.example",
		"null",
		"https://school.example/path",
	]) {
		expect(
			hasAssistantRequestOrigin(
				new Request("http://localhost:2200/api/assistant/chat", {
					headers: { origin, "x-forwarded-host": "school.example" },
				}),
			),
		).toBe(false);
	}
});

test("assistant origin supports direct HTTPS and authenticated non-browser clients", () => {
	expect(
		hasAssistantRequestOrigin(
			new Request("https://school.example/api/assistant/chat", {
				headers: { origin: "https://school.example" },
			}),
		),
	).toBe(true);
	expect(
		hasAssistantRequestOrigin(
			new Request("https://school.example/api/assistant/chat"),
		),
	).toBe(true);
});
