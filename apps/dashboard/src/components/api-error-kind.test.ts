import { describe, expect, test } from "bun:test";
import { classifyDashboardError } from "./api-error-kind";

describe("classifyDashboardError", () => {
	test("reads tRPC client error codes", () => {
		expect(classifyDashboardError({ message: "x", data: { code: "FORBIDDEN" } })).toBe("forbidden");
		expect(classifyDashboardError({ message: "x", data: { code: "UNAUTHORIZED" } })).toBe("unauthorized");
		expect(classifyDashboardError({ message: "x", shape: { data: { code: "NOT_FOUND" } } })).toBe("not_found");
	});

	test("falls back to the message", () => {
		expect(
			classifyDashboardError(new Error("Withdrawing a student requires administrator or registrar access.")),
		).toBe("forbidden");
		expect(classifyDashboardError(new Error("Failed to fetch"))).toBe("network");
		expect(classifyDashboardError(new Error("Cannot read properties of undefined"))).toBe("unknown");
		expect(classifyDashboardError(undefined)).toBe("unknown");
	});
});
