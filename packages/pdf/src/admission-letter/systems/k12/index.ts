import { ClassicAdmissionLetterTemplate } from "./templates/classic";
import { ModernAdmissionLetterTemplate } from "./templates/modern";
import type { AdmissionLetterTemplateDefinition } from "../../types";

export const k12AdmissionLetterTemplates: AdmissionLetterTemplateDefinition[] = [
  {
    description: "A formal, print-friendly admission letter with a passport photo block.",
    id: "admission-classic-v1",
    label: "Admission Classic",
    render: ClassicAdmissionLetterTemplate,
    schoolSystem: "k12",
    version: 1,
  },
  {
    description: "A cleaner admission letter with stronger payment and next-step sections.",
    id: "admission-modern-v1",
    label: "Admission Modern",
    render: ModernAdmissionLetterTemplate,
    schoolSystem: "k12",
    version: 1,
  },
];
