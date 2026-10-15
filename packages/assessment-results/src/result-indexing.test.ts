import { expect, test } from "bun:test";
import {
	type ResultSubject,
	buildResultRows,
	getSubjectFillingProgress,
} from "./index";

const students = [{ id: "a" }, { id: "b" }, { id: "c" }];
const first = { id: 1, studentTermFormId: "a", obtained: null };
const math: ResultSubject = {
	id: "math",
	subject: { title: "Math" },
	assessments: [
		{
			id: 1,
			title: "Exam",
			obtainable: 50,
			percentageObtainable: 100,
			assessmentResults: [
				first,
				{ id: 2, studentTermFormId: "a", obtained: 20 },
				{ id: 3, studentTermFormId: "b", obtained: 0 },
				{ id: 4, studentTermFormId: "outside", obtained: 50 },
				{ id: 5, studentTermFormId: null, obtained: 50 },
			],
		},
		{
			id: 2,
			title: "Pages",
			obtainable: null,
			percentageObtainable: 0,
			assessmentResults: [
				{ studentTermFormId: "a", obtained: 200 },
				{ studentTermFormId: "b", obtained: 0 },
			],
		},
	],
};
const subjects = [math];

test("progress counts zero and any filled duplicate, only within the roster", () => {
	expect(getSubjectFillingProgress({ subjects, students }).get("math")).toEqual(
		{
			completed: 2,
			total: 3,
		},
	);
});

test("subjects without assessments or results have no completed students", () => {
	const emptySubjects = [
		{ id: "none", subject: { title: "None" } },
		{
			id: "missing",
			subject: { title: "Missing" },
			assessments: [{ id: 3, title: "Exam", obtainable: 10 }],
		},
	];
	const progress = getSubjectFillingProgress({
		subjects: emptySubjects,
		students,
	});
	expect([...progress.values()]).toEqual([
		{ completed: 0, total: 3 },
		{ completed: 0, total: 3 },
	]);
	expect([
		...getSubjectFillingProgress({ subjects, students: [] }).values(),
	]).toEqual([{ completed: 0, total: 0 }]);
});

test("row lookups retain the first duplicate and distinguish blank from zero", () => {
	const rows = buildResultRows({ subjects, students });
	expect(rows[0]?.subjectTotals[0]?.cells[0]?.result).toBe(first);
	expect(rows[0]?.subjectTotals[0]?.cells[0]?.obtained).toBeNull();
	expect(rows[1]?.subjectTotals[0]?.cells[0]?.obtained).toBe(0);
	expect(rows[2]?.subjectTotals[0]?.cells[0]?.result).toBeUndefined();
	expect(rows[2]?.subjectTotals[0]?.cells[0]?.obtained).toBeNull();
});

test("indexed row lookup preserves weighted totals and informational scores", () => {
	const weighted = [
		{
			...math,
			assessments: math.assessments.map((assessment) => ({
				...assessment,
				assessmentResults: assessment.assessmentResults?.filter(
					(result) => result !== first,
				),
			})),
		},
	];
	const row = buildResultRows({
		subjects: weighted,
		students: [{ id: "a" }],
	})[0];
	expect(row?.subjectTotals[0]?.cells.map((cell) => cell.score)).toEqual([
		40, 0,
	]);
	expect(row?.grandTotal).toBe(40);
	expect(row?.percentage).toBe(40);
});
