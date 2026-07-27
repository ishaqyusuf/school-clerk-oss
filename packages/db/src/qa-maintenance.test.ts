import { afterEach, describe, expect, test } from "bun:test";
import { getQaClassificationForOwner } from "./qa-maintenance";

const original = process.env.EMAIL_QA_DOMAIN_ROUTES;

afterEach(() => {
	if (original === undefined) process.env.EMAIL_QA_DOMAIN_ROUTES = undefined;
	else process.env.EMAIL_QA_DOMAIN_ROUTES = original;
});

describe("SchoolClerk QA account classification", () => {
	test("marks configured owners and leaves ordinary owners normal", () => {
		process.env.EMAIL_QA_DOMAIN_ROUTES = '{"school.test":"tester@example.com"}';
		expect(getQaClassificationForOwner("owner@school.test")).toMatchObject({
			dataClassification: "QA",
			qaSourceDomain: "school.test",
		});
		expect(getQaClassificationForOwner("owner@example.com")).toMatchObject({
			dataClassification: "NORMAL",
			qaSourceDomain: null,
		});
	});
});
