import type { ReactElement } from "react";

export type ResultSchoolSystem = "k12";

export type ResultReportTable = {
  columns: {
    label?: string;
    subLabel?: string;
  }[];
  rows: {
    columns: {
      value?: string | number | null;
    }[];
  }[];
};

export type ResultReport = {
  studentName: string;
  classroomName?: string | null;
  percentage: number;
  position: number;
  totalStudents: number;
  commentArabic?: string | null;
  commentEnglish?: string | null;
  tables: ResultReportTable[];
};

export type ResultTemplatePayload = {
  schoolName: string;
  schoolAddress?: string | null;
  termLabel?: string | null;
  returnDate?: string | null;
  reports: ResultReport[];
  commentLabelArabic?: string;
  teacherSignatureLabel?: string;
  directorSignatureLabel?: string;
};

export type ResultTemplateDefinition = {
  id: string;
  label: string;
  schoolSystem: ResultSchoolSystem;
  description: string;
  render: (payload: ResultTemplatePayload) => ReactElement;
};
