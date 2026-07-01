export {
  DEFAULT_SCHOOL_DOCUMENT_TEMPLATE_IDS,
  getSchoolDocumentTemplateById,
  getSchoolDocumentTemplates,
  renderSchoolDocumentTemplate,
  resolveSchoolDocumentTemplate,
  schoolDocumentTemplateRegistry,
} from "./registry";
export {
  admissionLetterPayloadSchema,
  resultTemplatePayloadSchema,
} from "./schemas";
export type {
  AnySchoolDocumentTemplateDefinition,
  RenderSchoolDocumentTemplateInput,
  ResolveSchoolDocumentTemplateInput,
  SchoolDocumentPayloadByType,
  SchoolDocumentSchoolSystem,
  SchoolDocumentTemplateDefinition,
  SchoolDocumentTemplatePreview,
  SchoolDocumentTemplateSource,
  SchoolDocumentType,
} from "./types";
