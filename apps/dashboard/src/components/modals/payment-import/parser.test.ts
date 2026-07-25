// @ts-expect-error Bun test types are not included by this app tsconfig.
import { describe, expect, test } from "bun:test";
import { parsePaymentImportCsv } from "./parser";

describe("parsePaymentImportCsv", () => {
	test("parses the minimal Arabic student payment format", () => {
		const result = parsePaymentImportCsv(
			[
				"date,student_name,payment_type,amount,source_note",
				'2026-06-13,"عبد الملك عبد الكبير",SCHOOL_FEE,1000,"Partial balance"',
				',"مريم عبد الكبير",entrance form,"1,000",',
			].join("\n"),
			"STUDENT",
		);

		expect(result.errors).toEqual([]);
		expect(result.rows).toEqual([
			{
				lineNumber: 2,
				paymentDate: "2026-06-13",
				counterpartyName: "عبد الملك عبد الكبير",
				paymentType: "SCHOOL_FEE",
				amount: 1000,
				sourceNote: "Partial balance",
				counterpartyId: null,
				streamId: null,
				itemId: null,
				allowDuplicate: false,
				skip: false,
			},
			{
				lineNumber: 3,
				paymentDate: null,
				counterpartyName: "مريم عبد الكبير",
				paymentType: "ENTRANCE_FORM",
				amount: 1000,
				sourceNote: null,
				counterpartyId: null,
				streamId: null,
				itemId: null,
				allowDuplicate: false,
				skip: false,
			},
		]);
	});

	test("parses staff payments without source_note", () => {
		const result = parsePaymentImportCsv(
			[
				"date,staff_name,payment_type,amount",
				'2026-06-25,"أ. مبارك",WAGE,15000',
			].join("\n"),
			"STAFF",
		);

		expect(result.errors).toEqual([]);
		expect(result.rows[0]?.paymentType).toBe("WAGE");
		expect(result.rows[0]?.amount).toBe(15000);
	});

	test("rejects the wrong mode and invalid dates", () => {
		const result = parsePaymentImportCsv(
			[
				"date,student_name,payment_type,amount,source_note",
				"2026-02-31,Teacher,WAGE,5000,",
			].join("\n"),
			"STUDENT",
		);

		expect(result.rows).toEqual([]);
		expect(result.errors.map((error) => error.message)).toEqual([
			"Date must use YYYY-MM-DD.",
			"WAGE belongs in a staff payment import.",
		]);
	});

	test("requires the mode-specific name column", () => {
		const result = parsePaymentImportCsv(
			"date,student_name,payment_type,amount\n2026-01-01,A,WAGE,1",
			"STAFF",
		);

		expect(result.rows).toEqual([]);
		expect(result.errors[0]?.message).toBe(
			"Missing required column: staff_name.",
		);
	});

	test("rejects operational columns that do not belong in the minimal CSV", () => {
		const result = parsePaymentImportCsv(
			"date,student_name,payment_type,amount,term\n2026-01-01,A,SCHOOL_FEE,1,T1",
			"STUDENT",
		);

		expect(result.rows).toEqual([]);
		expect(result.errors[0]?.message).toBe("Unsupported column: term.");
	});
});
