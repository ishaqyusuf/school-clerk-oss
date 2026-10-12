import { expect, test } from "bun:test";
import { requestFingerprint } from "./runs";
test("proposal revision fingerprints retain timestamps and normalized object values", () => {
	expect(requestFingerprint({ updatedAt: new Date("2026-01-01") })).not.toBe(
		requestFingerprint({ updatedAt: new Date("2026-01-02") }),
	);
	expect(requestFingerprint({ b: 2, a: 1 })).toBe(
		requestFingerprint({ a: 1, b: 2 }),
	);
});
