import { renderAdmissionLetterTemplate } from "./registry";
import type {
  AdmissionLetterSchoolSystem,
  AdmissionLetterTemplatePayload,
} from "./types";

type AdmissionLetterTemplateProps = Partial<AdmissionLetterTemplatePayload> & {
  preferredTemplateId?: string | null;
  schoolSystem?: AdmissionLetterSchoolSystem;
};

const previewPayload: AdmissionLetterTemplatePayload = {
  applicationReference: "ADM-2026",
  approvedAt: "30 Jun 2026",
  classroomName: "Primary 1",
  parentName: "Parent/Guardian",
  payment: {
    amount: "NGN 25,000.00",
    dueAt: "15 Jul 2026",
    instructions: "Pay at the school bursary or use the payment link in the email.",
    label: "Admission payment",
    required: true,
  },
  schoolAddress: "School address",
  schoolName: "School Clerk Academy",
  sessionLabel: "2026/2027 Academic Session",
  studentName: "Ada Student",
};

export function AdmissionLetterTemplate({
  preferredTemplateId,
  schoolSystem = "k12",
  ...payload
}: AdmissionLetterTemplateProps) {
  return renderAdmissionLetterTemplate({
    ...previewPayload,
    ...payload,
    preferredTemplateId,
    schoolSystem,
  });
}

export {
  admissionLetterTemplateRegistry,
  getAdmissionLetterTemplateById,
  getAdmissionLetterTemplatesBySchoolSystem,
  renderAdmissionLetterTemplate,
  resolveAdmissionLetterTemplate,
} from "./registry";
export type {
  AdmissionLetterPayment,
  AdmissionLetterSchoolSystem,
  AdmissionLetterTemplateDefinition,
  AdmissionLetterTemplatePayload,
} from "./types";
