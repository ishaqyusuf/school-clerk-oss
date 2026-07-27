import { afterEach, describe, expect, test } from "bun:test";
import { getEmailDeliveryRoutes } from "./envs";

const originalEnv = { ...process.env };

afterEach(() => {
	process.env = { ...originalEnv };
});

describe("SchoolClerk hybrid email routing", () => {
	test("routes mapped QA recipients through the provider in console mode", () => {
		process.env.EMAIL_DELIVERY_MODE = "console";
		process.env.EMAIL_QA_DOMAIN_ROUTES = '{"school.test":"tester@example.com"}';

		expect(getEmailDeliveryRoutes("owner@school.test")).toEqual([
			{
				originalRecipient: "owner@school.test",
				recipient: "tester@example.com",
				transport: "provider",
				qaRouted: true,
			},
		]);
	});

	test("fails closed for an unmapped test domain", () => {
		process.env.EMAIL_QA_DOMAIN_ROUTES = '{"school.test":"tester@example.com"}';
		expect(() => getEmailDeliveryRoutes("owner@unknown.test")).toThrow(
			"No QA email route",
		);
	});

	test("routes mixed recipients independently", () => {
		process.env.EMAIL_DELIVERY_MODE = "console";
		process.env.EMAIL_QA_DOMAIN_ROUTES = '{"school.test":"tester@example.com"}';

		expect(
			getEmailDeliveryRoutes(["owner@school.test", "parent@example.com"]),
		).toEqual([
			expect.objectContaining({ qaRouted: true, transport: "provider" }),
			expect.objectContaining({ qaRouted: false, transport: "console" }),
		]);
	});
});
