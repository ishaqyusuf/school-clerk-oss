import { describe, expect, test } from "bun:test";

import {
	DEFAULT_STUDENT_NAME_FORMAT,
	formatStudentName,
	getStudentNameParts,
	normalizeStudentNameFormat,
} from "./student-name";

const student = {
	name: "Amina",
	surname: "Bello",
	otherName: "Zainab",
};

describe("student name formatting", () => {
	test("formats every supported school preference", () => {
		expect(formatStudentName(student, "FIRST_SURNAME_OTHER")).toBe(
			"Amina Bello Zainab",
		);
		expect(formatStudentName(student, "SURNAME_FIRST_OTHER")).toBe(
			"Bello Amina Zainab",
		);
		expect(formatStudentName(student, "FIRST_OTHER_SURNAME")).toBe(
			"Amina Zainab Bello",
		);
	});

	test("uses firstName aliases and omits empty optional parts", () => {
		expect(
			getStudentNameParts(
				{
					firstName: "Amina",
					surname: "Bello",
					otherName: " ",
				},
				"FIRST_OTHER_SURNAME",
			),
		).toEqual(["Amina", "Bello"]);
	});

	test("falls back safely for missing or unknown persisted values", () => {
		expect(normalizeStudentNameFormat(undefined)).toBe(
			DEFAULT_STUDENT_NAME_FORMAT,
		);
		expect(normalizeStudentNameFormat("UNKNOWN")).toBe(
			DEFAULT_STUDENT_NAME_FORMAT,
		);
	});
});
