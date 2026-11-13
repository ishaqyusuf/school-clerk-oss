import { describe, expect, test } from "bun:test";

import {
	currentWithdrawal,
	evaluateStudentTermEligibility,
	isStudentActiveOn,
	isStudentOnActiveTermRoster,
	readmitStudentSchema,
	type StudentWithdrawalPeriod,
	withdrawStudentSchema,
} from "./student-withdrawal";

const d = (value: string) => new Date(`${value}T00:00:00`);

const firstTerm = { id: "t1", startDate: d("2026-01-05"), endDate: d("2026-04-03") };
const secondTerm = { id: "t2", startDate: d("2026-04-27"), endDate: d("2026-07-24") };
const thirdTerm = { id: "t3", startDate: d("2026-09-07"), endDate: d("2026-12-11") };
const unscheduled = { id: "t4", startDate: null, endDate: null };

const open: StudentWithdrawalPeriod = {
	id: "w1",
	withdrawalTermId: "t1",
	lastEnrolledDate: d("2026-02-13"),
	readmissionTermId: null,
	readmittedOn: null,
};

describe("evaluateStudentTermEligibility", () => {
	test("students without withdrawals are eligible for every term", () => {
		expect(evaluateStudentTermEligibility([], secondTerm)).toEqual({ eligible: true });
	});

	test("the withdrawal term and earlier terms remain eligible history", () => {
		expect(evaluateStudentTermEligibility([open], firstTerm).eligible).toBe(true);
		const earlier = { id: "t0", startDate: d("2025-09-08") };
		expect(evaluateStudentTermEligibility([open], earlier).eligible).toBe(true);
	});

	test("an open withdrawal blocks later and unscheduled terms", () => {
		expect(evaluateStudentTermEligibility([open], secondTerm)).toEqual({
			eligible: false,
			withdrawalId: "w1",
			reason: "WITHDRAWN",
		});
		expect(evaluateStudentTermEligibility([open], thirdTerm).eligible).toBe(false);
		expect(evaluateStudentTermEligibility([open], unscheduled).eligible).toBe(false);
	});

	test("a readmission reopens the readmission term and later terms only", () => {
		const closed = { ...open, readmissionTermId: "t3", readmittedOn: d("2026-09-07") };
		expect(evaluateStudentTermEligibility([closed], secondTerm).eligible).toBe(false);
		expect(evaluateStudentTermEligibility([closed], thirdTerm).eligible).toBe(true);
		expect(evaluateStudentTermEligibility([closed], unscheduled).eligible).toBe(true);
	});

	test("the readmission term is eligible even when it started before the readmission date", () => {
		const midTerm = { ...open, readmissionTermId: "t2", readmittedOn: d("2026-05-18") };
		expect(evaluateStudentTermEligibility([midTerm], secondTerm).eligible).toBe(true);
	});

	test("a term starting on the last enrolled day is not blocked", () => {
		const period = { ...open, lastEnrolledDate: d("2026-04-27") };
		expect(evaluateStudentTermEligibility([period], secondTerm).eligible).toBe(true);
	});

	test("any one covering period blocks across repeated withdrawals", () => {
		const first = { ...open, readmissionTermId: "t2", readmittedOn: d("2026-04-27") };
		const second: StudentWithdrawalPeriod = {
			id: "w2",
			withdrawalTermId: "t2",
			lastEnrolledDate: d("2026-06-01"),
			readmissionTermId: null,
			readmittedOn: null,
		};
		expect(evaluateStudentTermEligibility([first, second], secondTerm).eligible).toBe(true);
		expect(evaluateStudentTermEligibility([first, second], thirdTerm)).toMatchObject({ withdrawalId: "w2" });
	});
});

describe("isStudentActiveOn", () => {
	test("the student attends through the last enrolled day", () => {
		expect(isStudentActiveOn([open], d("2026-02-13"))).toBe(true);
		expect(isStudentActiveOn([open], new Date(d("2026-02-13").getTime() + 23 * 3600 * 1000))).toBe(true);
		expect(isStudentActiveOn([open], d("2026-02-14"))).toBe(false);
	});

	test("readmission restores attendance from the readmission date", () => {
		const closed = { ...open, readmissionTermId: "t2", readmittedOn: d("2026-05-04") };
		expect(isStudentActiveOn([closed], d("2026-05-03"))).toBe(false);
		expect(isStudentActiveOn([closed], d("2026-05-04"))).toBe(true);
	});
});

describe("isStudentOnActiveTermRoster", () => {
	test("leaves the active term roster after the last enrolled day", () => {
		expect(isStudentOnActiveTermRoster([open], firstTerm, d("2026-02-10"))).toBe(true);
		expect(isStudentOnActiveTermRoster([open], firstTerm, d("2026-03-01"))).toBe(false);
	});

	test("closed terms keep their historical roster", () => {
		expect(isStudentOnActiveTermRoster([open], { ...firstTerm, closed: true }, d("2026-10-01"))).toBe(true);
	});

	test("future terms covered by the withdrawal exclude the student", () => {
		expect(isStudentOnActiveTermRoster([open], secondTerm, d("2026-03-01"))).toBe(false);
	});

	test("a scheduled withdrawal keeps the student until the last day", () => {
		const scheduled = { ...open, lastEnrolledDate: d("2026-03-27") };
		expect(isStudentOnActiveTermRoster([scheduled], firstTerm, d("2026-03-01"))).toBe(true);
	});
});

describe("currentWithdrawal", () => {
	test("returns only an open period", () => {
		const closed = { ...open, readmissionTermId: "t2", readmittedOn: d("2026-05-04") };
		expect(currentWithdrawal([closed])).toBeNull();
		expect(currentWithdrawal([closed, { ...open, id: "w2" }])?.id).toBe("w2");
	});
});

describe("schemas", () => {
	test("withdrawal requires a reason", () => {
		const result = withdrawStudentSchema.safeParse({
			studentId: "s1",
			withdrawalTermId: "t1",
			lastEnrolledDate: "2026-02-13",
			reason: " ",
		});
		expect(result.success).toBe(false);
	});

	test("readmission accepts an optional classroom", () => {
		const result = readmitStudentSchema.parse({
			studentId: "s1",
			withdrawalId: "w1",
			readmissionTermId: "t2",
			readmittedOn: "2026-05-04",
		});
		expect(result.readmittedOn).toBeInstanceOf(Date);
		expect(result.classroomDepartmentId).toBeUndefined();
	});
});
