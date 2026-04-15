import { k12ResultTemplates } from "./systems/k12";
import type { ResultSchoolSystem, ResultTemplateDefinition, ResultTemplatePayload } from "./types";

export const resultTemplateRegistry: ResultTemplateDefinition[] = [
  ...k12ResultTemplates,
];

export function getResultTemplatesBySchoolSystem(schoolSystem: ResultSchoolSystem) {
  return resultTemplateRegistry.filter((template) => template.schoolSystem === schoolSystem);
}

export function getResultTemplateById(templateId: string) {
  const template = resultTemplateRegistry.find((item) => item.id === templateId);
  if (!template) {
    throw new Error(`Unknown result template "${templateId}".`);
  }
  return template;
}

export function resolveResultTemplate(options: {
  schoolSystem: ResultSchoolSystem;
  preferredTemplateId?: string | null;
}) {
  const { schoolSystem, preferredTemplateId } = options;
  const available = getResultTemplatesBySchoolSystem(schoolSystem);

  if (!available.length) {
    throw new Error(`No result templates registered for school system "${schoolSystem}".`);
  }

  if (preferredTemplateId) {
    const preferred = available.find((template) => template.id === preferredTemplateId);
    if (preferred) return preferred;
  }

  return available[0]!;
}

export function renderResultTemplate(
  options: {
    schoolSystem: ResultSchoolSystem;
    preferredTemplateId?: string | null;
  } & ResultTemplatePayload,
) {
  const template = resolveResultTemplate({
    schoolSystem: options.schoolSystem,
    preferredTemplateId: options.preferredTemplateId,
  });

  return template.render(options);
}
