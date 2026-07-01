import type { ReactElement } from "react";

export type AdmissionLetterSchoolSystem = "k12";

export type AdmissionLetterPayment = {
  amount?: string | null;
  dueAt?: string | null;
  instructions?: string | null;
  label?: string | null;
  link?: string | null;
  required: boolean;
};

export type AdmissionLetterTemplatePayload = {
  applicationReference?: string | null;
  approvedAt?: string | null;
  classroomName?: string | null;
  parentName?: string | null;
  passportPhotoUrl?: string | null;
  payment?: AdmissionLetterPayment | null;
  schoolAddress?: string | null;
  schoolName: string;
  sessionLabel?: string | null;
  studentName: string;
};

export type AdmissionLetterTemplateDefinition = {
  description: string;
  id: string;
  label: string;
  render: (payload: AdmissionLetterTemplatePayload) => ReactElement;
  schoolSystem: AdmissionLetterSchoolSystem;
  version: number;
};
