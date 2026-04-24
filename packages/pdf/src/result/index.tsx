import { renderResultTemplate } from "./registry";
import type { ResultSchoolSystem, ResultTemplatePayload } from "./types";

type ResultTemplateProps = Partial<ResultTemplatePayload> & {
  schoolSystem?: ResultSchoolSystem;
  preferredTemplateId?: string | null;
};

const previewPayload: ResultTemplatePayload = {
  schoolName: "School Clerk Academy",
  schoolAddress: "Result sheet preview",
  termLabel: "Current Term",
  returnDate: "28/03/26",
  reports: [
    {
      studentName: "Preview Student",
      classroomName: "Primary 1",
      percentage: 92,
      position: 1,
      totalStudents: 24,
      commentArabic: "أداء ممتاز",
      commentEnglish: "Excellent performance.",
      tables: [
        {
          columns: [
            { label: "Subject" },
            { label: "Test" },
            { label: "Exam" },
            { label: "Total" },
          ],
          rows: [
            {
              columns: [
                { value: "Mathematics" },
                { value: 18 },
                { value: 72 },
                { value: 90 },
              ],
            },
            {
              columns: [
                { value: "English" },
                { value: 19 },
                { value: 74 },
                { value: 93 },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export function ResultTemplate({
  schoolSystem = "k12",
  preferredTemplateId,
  ...payload
}: ResultTemplateProps) {
  return renderResultTemplate({
    ...previewPayload,
    ...payload,
    schoolSystem,
    preferredTemplateId,
  });
}

export {
  getResultTemplateById,
  getResultTemplatesBySchoolSystem,
  renderResultTemplate,
  resolveResultTemplate,
  resultTemplateRegistry,
} from "./registry";
export type {
  ResultReport,
  ResultReportTable,
  ResultSchoolSystem,
  ResultTemplateDefinition,
  ResultTemplatePayload,
} from "./types";
