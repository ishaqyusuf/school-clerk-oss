// @ts-expect-error Bun test types are not included by this app tsconfig.
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
	buildReceivePaymentOptionsInput,
	createEmptyTermScopedPaymentSelection,
	createPaidForTermChange,
} from "./receive-payment-term-model";
import {
	PaymentTermSummary,
	buildTermScopedOptionLabel,
	getEmptyTermPaymentOptionsMessage,
} from "./receive-payment-term-summary";

describe("receive payment term summary", () => {
	test("adds the full paid-for term to payment option labels", () => {
		expect(
			buildTermScopedOptionLabel("Tuition Fee", "1446/1447 · 1st Term"),
		).toBe("Tuition Fee — 1446/1447 · 1st Term");
	});

	test("shows paid-for and collected-in labels for a previous-term payment", () => {
		const html = renderToStaticMarkup(
			<PaymentTermSummary
				paidForLabel="1446/1447 · 1st Term"
				collectedInLabel="1447/1448 · 2nd Term"
			/>,
		);

		expect(html).toContain("Paid for:");
		expect(html).toContain("1446/1447 · 1st Term");
		expect(html).toContain("Collected in:");
		expect(html).toContain("1447/1448 · 2nd Term");
	});

	test("collapses matching paid-for and collected-in terms to one label", () => {
		const html = renderToStaticMarkup(
			<PaymentTermSummary
				paidForLabel="1447/1448 · 2nd Term"
				collectedInLabel="1447/1448 · 2nd Term"
			/>,
		);

		expect(html).toContain("Term:");
		expect(html.match(/1447\/1448 · 2nd Term/g)).toHaveLength(1);
		expect(html).not.toContain("Collected in:");
	});

	test("provides a complete reset for term-scoped fields", () => {
		expect(createEmptyTermScopedPaymentSelection()).toEqual({
			selectedPaymentTypeId: "",
			customPaymentTypeTitle: "",
			selectedDescriptionId: "",
			customDescriptionTitle: "",
			amountDue: "",
			amountPaid: "",
			note: "",
			receiptState: null,
		});
	});

	test("switches the options query and resets every dependent payment field", () => {
		expect(
			buildReceivePaymentOptionsInput(
				"student-1",
				"term-form-previous",
			),
		).toEqual({
			studentId: "student-1",
			paidForStudentTermFormId: "term-form-previous",
		});
		expect(createPaidForTermChange("term-form-previous")).toEqual({
			paidForStudentTermFormId: "term-form-previous",
			selectedPaymentTypeId: "",
			customPaymentTypeTitle: "",
			selectedDescriptionId: "",
			customDescriptionTitle: "",
			amountDue: "",
			amountPaid: "",
			note: "",
			receiptState: null,
		});
	});

	test("names the selected term when no saved payment options exist", () => {
		expect(
			getEmptyTermPaymentOptionsMessage("1446/1447 · 1st Term"),
		).toBe(
			"Type a payment type and description below to record a custom collection for 1446/1447 · 1st Term.",
		);
	});
});
