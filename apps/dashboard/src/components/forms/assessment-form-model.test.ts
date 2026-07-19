// @ts-expect-error Bun test types are not included by this app tsconfig.
import { describe, expect, test } from "bun:test";

import { saveAssessementSchema } from "@school-clerk/assessment-results";
import {
  getAssessmentFormValues,
  isUncappedAssessmentConfiguration,
} from "./assessment-form-model";

describe("assessment form configurations", () => {
  test("creates and edits standalone uncapped assessments as null maximums", () => {
    const created = getAssessmentFormValues({
      departmentSubjectId: "subject-1",
      index: 0,
      title: "Pages revised",
    });
    const edited = getAssessmentFormValues({
      ...created,
      id: 279,
      obtainable: null,
    });

    expect(created.obtainable).toBeNull();
    expect(edited.obtainable).toBeNull();
    expect(isUncappedAssessmentConfiguration(created)).toBe(true);
    expect(isUncappedAssessmentConfiguration(edited)).toBe(true);
    expect(saveAssessementSchema.safeParse(created).success).toBe(true);
    expect(saveAssessementSchema.safeParse(edited).success).toBe(true);
  });

  test("accepts capped weighted standalone assessments and blocks uncapped weighted ones", () => {
    const capped = getAssessmentFormValues({
      departmentSubjectId: "subject-1",
      index: 0,
      title: "Exam",
      obtainable: 100,
      percentageObtainable: 100,
    });
    const invalidUncapped = { ...capped, obtainable: null };

    expect(isUncappedAssessmentConfiguration(capped)).toBe(false);
    expect(saveAssessementSchema.safeParse(capped).success).toBe(true);
    expect(saveAssessementSchema.safeParse(invalidUncapped).success).toBe(
      false,
    );
  });

  test("requires every grouped child to have a positive maximum", () => {
    const grouped = getAssessmentFormValues({
      departmentSubjectId: "subject-1",
      index: 0,
      title: "Exam",
      isGroup: true,
      childAssessments: [
        {
          title: "Oral",
          obtainable: 20,
          percentageObtainable: 20,
        },
      ],
    });
    const invalidChild = {
      ...grouped,
      childAssessments: [{ ...grouped.childAssessments[0]!, obtainable: 0 }],
    };

    expect(saveAssessementSchema.safeParse(grouped).success).toBe(true);
    expect(saveAssessementSchema.safeParse(invalidChild).success).toBe(false);
  });
});
