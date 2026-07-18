import { describe, expect, test } from "bun:test";

import {
	analyzeAcademicDirectionEvidence,
	applyAcademicDirectionMode,
	createAcademicDirectionFallback,
	detectInstructionLanguageDirection,
	detectStrongTextDirection,
} from "./academic-data-direction";

const emptyEvidence = () => ({
	students: [],
	classrooms: [],
	departments: [],
	subjects: [],
	school: [],
	language: [],
});

describe("academic data direction detection", () => {
	test("recognizes Arabic-family and Hebrew scripts", () => {
		expect(detectStrongTextDirection("أحمد محمد")).toBe("rtl");
		expect(detectStrongTextDirection("علی رضایی")).toBe("rtl");
		expect(detectStrongTextDirection("محمد علی")).toBe("rtl");
		expect(detectStrongTextDirection("דוד לוי")).toBe("rtl");
	});

	test("recognizes Latin text and ignores neutral numeric values", () => {
		expect(detectStrongTextDirection("Amina Yusuf")).toBe("ltr");
		expect(detectStrongTextDirection("2026 / 1447")).toBeNull();
		expect(detectStrongTextDirection("  ")).toBeNull();
	});

	test("uses the first strong character for mixed-script text", () => {
		expect(detectStrongTextDirection("أحمد - Grade 4")).toBe("rtl");
		expect(detectStrongTextDirection("Grade 4 - أحمد")).toBe("ltr");
	});

	test("recognizes RTL language names written with Latin letters", () => {
		expect(detectInstructionLanguageDirection("Arabic")).toBe("rtl");
		expect(detectInstructionLanguageDirection("Urdu")).toBe("rtl");
		expect(detectInstructionLanguageDirection("English")).toBe("ltr");
	});

	test("uses the weighted majority and falls back to LTR on a tie", () => {
		const rtlMajority = analyzeAcademicDirectionEvidence({
			...emptyEvidence(),
			students: ["أحمد", "فاطمة"],
			subjects: ["English"],
		});
		expect(rtlMajority.direction).toBe("rtl");

		const tie = analyzeAcademicDirectionEvidence({
			...emptyEvidence(),
			classrooms: ["الصف الأول", "Grade 2"],
		});
		expect(tie.direction).toBe("ltr");
	});

	test("forced modes override automatic analysis", () => {
		const analysis = analyzeAcademicDirectionEvidence({
			...emptyEvidence(),
			students: ["أحمد", "فاطمة"],
		});

		expect(applyAcademicDirectionMode("LTR", analysis).direction).toBe("ltr");
		expect(applyAcademicDirectionMode("RTL", analysis).direction).toBe("rtl");
		expect(applyAcademicDirectionMode("AUTO", analysis).direction).toBe("rtl");
	});

	test("empty and failure fallback results remain LTR", () => {
		expect(analyzeAcademicDirectionEvidence(emptyEvidence()).direction).toBe(
			"ltr",
		);
		expect(createAcademicDirectionFallback().direction).toBe("ltr");
	});
});
