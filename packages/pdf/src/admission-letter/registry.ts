import { k12AdmissionLetterTemplates } from "./systems/k12";
import type {
  AdmissionLetterSchoolSystem,
  AdmissionLetterTemplateDefinition,
  AdmissionLetterTemplatePayload,
} from "./types";

export const admissionLetterTemplateRegistry: AdmissionLetterTemplateDefinition[] = [
  ...k12AdmissionLetterTemplates,
];

export function getAdmissionLetterTemplatesBySchoolSystem(
  schoolSystem: AdmissionLetterSchoolSystem,
) {
  return admissionLetterTemplateRegistry.filter(
    (template) => template.schoolSystem === schoolSystem,
  );
}

export function getAdmissionLetterTemplateById(templateId: string) {
  const template = admissionLetterTemplateRegistry.find(
    (item) => item.id === templateId,
  );
  if (!template) {
    throw new Error(`Unknown admission letter template "${templateId}".`);
  }
  return template;
}

export function resolveAdmissionLetterTemplate(options: {
  preferredTemplateId?: string | null;
  schoolSystem: AdmissionLetterSchoolSystem;
}) {
  const available = getAdmissionLetterTemplatesBySchoolSystem(options.schoolSystem);

  if (!available.length) {
    throw new Error(
      `No admission letter templates registered for school system "${options.schoolSystem}".`,
    );
  }

  if (options.preferredTemplateId) {
    const preferred = available.find(
      (template) => template.id === options.preferredTemplateId,
    );
    if (preferred) return preferred;
  }

  return available[0]!;
}

export function renderAdmissionLetterTemplate(
  options: {
    preferredTemplateId?: string | null;
    schoolSystem: AdmissionLetterSchoolSystem;
  } & AdmissionLetterTemplatePayload,
) {
  const template = resolveAdmissionLetterTemplate({
    preferredTemplateId: options.preferredTemplateId,
    schoolSystem: options.schoolSystem,
  });

  return template.render(options);
}
