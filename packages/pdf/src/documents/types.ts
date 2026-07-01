import type { ReactElement } from "react";
import type { z } from "zod";
import type {
  AdmissionLetterSchoolSystem,
  AdmissionLetterTemplatePayload,
} from "../admission-letter";
import type { ResultSchoolSystem, ResultTemplatePayload } from "../result";

export type SchoolDocumentType =
  | "ADMISSION_FORM"
  | "ADMISSION_LETTER"
  | "RESULT_SHEET";

export type SchoolDocumentSchoolSystem =
  | AdmissionLetterSchoolSystem
  | ResultSchoolSystem;

export type SchoolDocumentPayloadByType = {
  ADMISSION_FORM: Record<string, unknown>;
  ADMISSION_LETTER: AdmissionLetterTemplatePayload;
  RESULT_SHEET: ResultTemplatePayload;
};

export type SchoolDocumentTemplateSource = "code" | "custom" | "json";

export type SchoolDocumentTemplatePreview = {
  accentColor?: string;
  tags?: string[];
  thumbnailUrl?: string | null;
};

export type SchoolDocumentTemplateDefinition<
  TType extends SchoolDocumentType = SchoolDocumentType,
> = {
  description: string;
  documentType: TType;
  label: string;
  payloadSchema: z.ZodType<SchoolDocumentPayloadByType[TType]>;
  preview: SchoolDocumentTemplatePreview;
  render: (payload: SchoolDocumentPayloadByType[TType]) => ReactElement;
  schoolSystem: SchoolDocumentSchoolSystem;
  source: SchoolDocumentTemplateSource;
  templateId: string;
  templateVersion: number;
};

export type AnySchoolDocumentTemplateDefinition = {
  [TType in SchoolDocumentType]: SchoolDocumentTemplateDefinition<TType>;
}[SchoolDocumentType];

export type ResolveSchoolDocumentTemplateInput<TType extends SchoolDocumentType> = {
  documentType: TType;
  preferredTemplateId?: string | null;
  schoolSystem: SchoolDocumentSchoolSystem;
};

export type RenderSchoolDocumentTemplateInput<TType extends SchoolDocumentType> =
  ResolveSchoolDocumentTemplateInput<TType> & {
    payload: SchoolDocumentPayloadByType[TType];
  };
