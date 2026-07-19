import type { SaveAssessementSchema } from "@school-clerk/assessment-results";

export function getAssessmentFormValues(
  values?: Partial<SaveAssessementSchema>,
): SaveAssessementSchema {
  return {
    departmentSubjectId: "",
    id: undefined,
    index: undefined,
    obtainable: null,
    percentageObtainable: 0,
    title: "",
    isGroup: false,
    printMode: "expanded",
    parentAssessmentId: null,
    childAssessments: [],
    ...values,
  };
}

export function isUncappedAssessmentConfiguration(
  values: Pick<
    SaveAssessementSchema,
    "isGroup" | "obtainable" | "percentageObtainable"
  >,
) {
  return (
    !values.isGroup &&
    values.obtainable == null &&
    (values.percentageObtainable ?? 0) === 0
  );
}
