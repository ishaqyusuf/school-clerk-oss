// @ts-expect-error Bun test types are not included by this app tsconfig.
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AdmissionTypeCell } from "./admission-type-cell";

describe("AdmissionTypeCell", () => {
	test("renders the term-specific operator labels", () => {
		expect(
			renderToStaticMarkup(<AdmissionTypeCell admissionType="NEW_ADMISSION" />),
		).toContain("New admission");
		expect(
			renderToStaticMarkup(<AdmissionTypeCell admissionType="RETURNING" />),
		).toContain("Returning");
		expect(
			renderToStaticMarkup(<AdmissionTypeCell admissionType="UNCLASSIFIED" />),
		).toContain("Needs classification");
	});
});
