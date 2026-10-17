// @ts-expect-error Bun test types are not included by this app tsconfig.
import { describe, expect, test } from "bun:test";
import { allocateReceivedAmount, parseAmount } from "./student-payment-allocation";

const charges = [
	{ id: "arrears", outstanding: 15_000 },
	{ id: "fees", outstanding: 55_000 },
	{ id: "uniform", outstanding: 12_500 },
];

describe("allocateReceivedAmount", () => {
	test("clears charges in the given order", () => {
		expect(allocateReceivedAmount(60_000, charges)).toEqual({
			allocations: { arrears: 15_000, fees: 45_000 },
			excess: 0,
		});
	});

	test("caps at outstanding and reports the excess", () => {
		expect(allocateReceivedAmount(90_000, charges)).toEqual({
			allocations: { arrears: 15_000, fees: 55_000, uniform: 12_500 },
			excess: 7_500,
		});
	});

	test("allocates nothing for zero or negative amounts", () => {
		expect(allocateReceivedAmount(0, charges).allocations).toEqual({});
		expect(allocateReceivedAmount(-5, charges).allocations).toEqual({});
	});
});

describe("parseAmount", () => {
	test("reads typed amounts with separators", () => {
		expect(parseAmount("85,000")).toBe(85_000);
		expect(parseAmount("")).toBe(0);
		expect(parseAmount("abc")).toBe(0);
	});
});
