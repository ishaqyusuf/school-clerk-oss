import { expect, test } from "bun:test";
import {
	accountActionSubmission,
	assistantMoney,
	parseAccountActionCard,
} from "./account-actions";

test("account drafts accept Arabic and Persian amounts as exact naira values", () => {
	expect(assistantMoney.parse("٣٬٠٠٠٫٥٠")).toBe(3000.5);
	expect(assistantMoney.parse("۳۰۰۰")).toBe(3000);
	expect(assistantMoney.safeParse("3.001").success).toBe(false);
	expect(assistantMoney.safeParse("3e5").success).toBe(false);
});

test("a reviewed student collection validates its selected fee, amount, and original date", () => {
	const action = {
		action: "student_payment" as const,
		date: "2026-11-16",
		lines: [{ studentId: "student", chargeId: "fee", amount: "٣٠٠٠" }],
	};
	expect(accountActionSubmission.parse(action)).toMatchObject({
		lines: [{ amount: 3000 }],
	});
	expect(
		accountActionSubmission.safeParse({ ...action, date: "2026-02-29" })
			.success,
	).toBe(false);
	expect(
		accountActionSubmission.safeParse({ ...action, lines: [] }).success,
	).toBe(false);
});

test("account cards carry verified matches and registration fee amounts", () => {
	expect(
		parseAccountActionCard({
			action: "register_student",
			name: "Example",
			fees: [{ name: "Form", amount: "١٠٠٠" }],
		}),
	).toMatchObject({
		action: "register_student",
		fees: [{ name: "Form", amount: 1000 }],
	});
	expect(
		parseAccountActionCard({ action: "staff_payment", amount: 5000 }),
	).toBeNull();
});
