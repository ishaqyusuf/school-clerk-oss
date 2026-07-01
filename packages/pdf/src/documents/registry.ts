import {
  admissionLetterTemplateRegistry,
  renderAdmissionLetterTemplate,
} from "../admission-letter";
import {
  renderJsonDocumentTemplateToPdf,
  simpleAdmissionLetterJsonTemplate,
} from "../json-template";
import { renderResultTemplate, resultTemplateRegistry } from "../result";
import {
  admissionLetterPayloadSchema,
  resultTemplatePayloadSchema,
} from "./schemas";
import type {
  AnySchoolDocumentTemplateDefinition,
  RenderSchoolDocumentTemplateInput,
  ResolveSchoolDocumentTemplateInput,
  SchoolDocumentPayloadByType,
  SchoolDocumentTemplateDefinition,
  SchoolDocumentType,
} from "./types";

export const DEFAULT_SCHOOL_DOCUMENT_TEMPLATE_IDS = {
  ADMISSION_LETTER: "admission-classic-v1",
  RESULT_SHEET: "k12-scholar",
} as const;

const admissionLetterDocumentTemplates =
  admissionLetterTemplateRegistry.map<SchoolDocumentTemplateDefinition<"ADMISSION_LETTER">>(
    (template) => ({
      description: template.description,
      documentType: "ADMISSION_LETTER",
      label: template.label,
      payloadSchema: admissionLetterPayloadSchema,
      preview: {
        accentColor:
          template.id === "admission-modern-v1" ? "#0F766E" : "#1F2937",
        tags: ["admission", "letter", "pdf"],
      },
      render: (payload) =>
        renderAdmissionLetterTemplate({
          ...payload,
          preferredTemplateId: template.id,
          schoolSystem: template.schoolSystem,
        }),
      schoolSystem: template.schoolSystem,
      source: "code",
      templateId: template.id,
      templateVersion: template.version,
    }),
  );

const jsonAdmissionLetterDocumentTemplates: SchoolDocumentTemplateDefinition<"ADMISSION_LETTER">[] =
  [
    {
      description:
        "A configurable JSON admission letter rendered from a constrained layout schema.",
      documentType: "ADMISSION_LETTER",
      label: simpleAdmissionLetterJsonTemplate.label,
      payloadSchema: admissionLetterPayloadSchema,
      preview: {
        accentColor: "#475569",
        tags: ["admission", "letter", "json", "pdf"],
      },
      render: (payload) =>
        renderJsonDocumentTemplateToPdf(simpleAdmissionLetterJsonTemplate, payload),
      schoolSystem: "k12",
      source: "json",
      templateId: simpleAdmissionLetterJsonTemplate.templateId,
      templateVersion: simpleAdmissionLetterJsonTemplate.templateVersion,
    },
  ];

const resultDocumentTemplates =
  resultTemplateRegistry.map<SchoolDocumentTemplateDefinition<"RESULT_SHEET">>(
    (template) => ({
      description: template.description,
      documentType: "RESULT_SHEET",
      label: template.label,
      payloadSchema: resultTemplatePayloadSchema,
      preview: {
        accentColor: template.id === "k12-heritage" ? "#9A3412" : "#2563EB",
        tags: ["result", "report", "pdf"],
      },
      render: (payload) =>
        renderResultTemplate({
          ...payload,
          preferredTemplateId: template.id,
          schoolSystem: template.schoolSystem,
        }),
      schoolSystem: template.schoolSystem,
      source: "code",
      templateId: template.id,
      templateVersion: 1,
    }),
  );

export const schoolDocumentTemplateRegistry: AnySchoolDocumentTemplateDefinition[] = [
  ...admissionLetterDocumentTemplates,
  ...jsonAdmissionLetterDocumentTemplates,
  ...resultDocumentTemplates,
];

export function getSchoolDocumentTemplates<TType extends SchoolDocumentType>(
  input?: {
    documentType?: TType;
    schoolSystem?: string | null;
  },
) {
  return schoolDocumentTemplateRegistry.filter((template) => {
    if (input?.documentType && template.documentType !== input.documentType) {
      return false;
    }

    if (input?.schoolSystem && template.schoolSystem !== input.schoolSystem) {
      return false;
    }

    return true;
  }) as unknown as SchoolDocumentTemplateDefinition<TType>[];
}

export function getSchoolDocumentTemplateById(templateId: string) {
  const template = schoolDocumentTemplateRegistry.find(
    (item) => item.templateId === templateId,
  );
  if (!template) {
    throw new Error(`Unknown school document template "${templateId}".`);
  }
  return template;
}

export function resolveSchoolDocumentTemplate<TType extends SchoolDocumentType>(
  input: ResolveSchoolDocumentTemplateInput<TType>,
) {
  const available = getSchoolDocumentTemplates({
    documentType: input.documentType,
    schoolSystem: input.schoolSystem,
  });

  if (!available.length) {
    throw new Error(
      `No ${input.documentType} templates registered for school system "${input.schoolSystem}".`,
    );
  }

  if (input.preferredTemplateId) {
    const preferred = available.find(
      (template) => template.templateId === input.preferredTemplateId,
    );
    if (preferred) return preferred;
  }

  return available[0]!;
}

export function renderSchoolDocumentTemplate<TType extends SchoolDocumentType>(
  input: RenderSchoolDocumentTemplateInput<TType>,
) {
  const template = resolveSchoolDocumentTemplate(input);
  const payload = template.payloadSchema.parse(input.payload);
  return template.render(payload as SchoolDocumentPayloadByType[TType]);
}
