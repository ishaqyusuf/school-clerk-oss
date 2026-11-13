import { describe, expect, test } from "bun:test";
import {
	summarizeActivityCategory,
	summarizeActivityRule,
} from "./rule-summary";

const base = {
	enabled: true,
	inApp: true,
	email: false,
	roles: [],
	userIds: [],
};

describe("summarizeActivityRule", () => {
	test("off rules read Off", () => {
		expect(
			summarizeActivityRule({ ...base, enabled: false, roles: ["admin"] }),
		).toEqual({
			on: false,
			warn: false,
			text: "Off",
		});
	});

	test("warns when on with nobody selected", () => {
		expect(summarizeActivityRule(base)).toMatchObject({
			warn: true,
			text: "On · no one selected",
		});
	});

	test("warns when on with no delivery channel", () => {
		expect(
			summarizeActivityRule({ ...base, inApp: false, roles: ["admin"] }),
		).toMatchObject({ warn: true, text: "On · no delivery" });
	});

	test("counts roles and members", () => {
		expect(
			summarizeActivityRule({
				...base,
				roles: ["admin", "accountant"],
				userIds: ["u1"],
			}).text,
		).toBe("Notifying 2 roles · 1 member");
	});
});

describe("summarizeActivityCategory", () => {
	test("reports silent and partial categories", () => {
		expect(summarizeActivityCategory([{ ...base, enabled: false }])).toBe(
			"All silent",
		);
		expect(summarizeActivityCategory([base, { ...base, enabled: false }])).toBe(
			"1 of 2 notify",
		);
	});
});
