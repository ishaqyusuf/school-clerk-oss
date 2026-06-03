import { configs } from "@/configs";
import { sum } from "@/utils/utils";

export function sortClassroomStudents<T>(
  students: T[],
  sortBy: "name" | "grade",
): T[] {
  if (!students) return [] as any;
  const __students = [...students] as any;
  if (sortBy === "name") {
    return __students.sort((a, b) => {
      if (a.gender !== b.gender) {
        return a.gender === "M" ? -1 : 1;
      }
      return a.firstName.localeCompare(b.firstName);
    });
  } else if (sortBy === "grade") {
    return __students.sort(
      (a, b) => b.totalScore - a.totalScore,
      //     {
      //   const aTotal = sum(
      //     a.subjectAssessments.flatMap((sa) =>
      //       sa.assessments.map((ass) => ass.studentAssessment?.markObtained || 0),
      //     ),
      //   );
      //   const bTotal = sum(
      //     b.subjectAssessments.flatMap((sa) =>
      //       sa.assessments.map((ass) => ass.studentAssessment?.markObtained || 0),
      //     ),
      //   );
      //   return bTotal - aTotal;
      // }
    );
  }
  return students;
}
export const indices = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
];
export function toFixed(value) {
  const number = typeof value == "string" ? parseFloat(value) : value;
  if (isNaN(value) || !value) return value;
  return number.toFixed(2);
}
export const calculateScore = (obtained, obtainable, gradeScore) =>
  !obtained || !obtainable
    ? obtained
    : // :
      // ? obtained
      // round up
      Math.ceil((Number(obtained) / Number(obtainable)) * Number(gradeScore));
// : Math.ceil((Number(obtained) / Number(obtainable)) * Number(gradeScore));

export function namePrintFormat(...names) {
  return names?.filter(Boolean).map((name) => {
    return name
      ?.split(" ")
      ?.filter(Boolean)
      .map((s) => s.trim())
      .map((s) => {
        const cal = configs.caligraphs[s] || configs.caligraphs2[s];
        // if (!cal) unformattedNames[s] = s;
        return cal || s;
      })
      .join(" ");
  });
}
