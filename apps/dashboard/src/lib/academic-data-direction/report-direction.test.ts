// @ts-expect-error Bun test types are not included by this app tsconfig.
import { describe, expect, test } from "bun:test";

import { resolveReportDataDirection } from "./report-direction";

describe("resolveReportDataDirection", () => {
	test("uses an individual report cookie before the school direction", () => {
		expect(resolveReportDataDirection("ltr", "rtl")).toBe("ltr");
		expect(resolveReportDataDirection("rtl", "ltr")).toBe("rtl");
	});

	test("defaults reports to the resolved academic data direction", () => {
		expect(resolveReportDataDirection(undefined, "rtl")).toBe("rtl");
		expect(resolveReportDataDirection(null, "ltr")).toBe("ltr");
	});

	test("falls back safely when neither direction is available", () => {
		expect(resolveReportDataDirection(undefined, undefined)).toBe("ltr");
	});
});
