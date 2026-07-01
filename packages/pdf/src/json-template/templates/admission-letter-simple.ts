import { jsonDocumentTemplateSchema } from "../schema";

export const simpleAdmissionLetterJsonTemplate = jsonDocumentTemplateSchema.parse({
  documentType: "ADMISSION_LETTER",
  label: "Admission JSON Simple",
  pages: [
    {
      blocks: [
        {
          style: { align: "center", bold: true, fontSize: 20, marginBottom: 4 },
          text: "{{schoolName}}",
          type: "text",
        },
        {
          style: { align: "center", color: "#64748B", fontSize: 10, marginBottom: 22 },
          text: "{{schoolAddress}}",
          type: "text",
          visibleWhen: { bind: "schoolAddress", exists: true },
        },
        {
          style: { align: "center", bold: true, fontSize: 16, marginBottom: 18 },
          text: "Admission Letter",
          type: "text",
        },
        {
          items: [
            { bind: "studentName", label: "Student" },
            { bind: "classroomName", label: "Class" },
            { bind: "sessionLabel", label: "Session" },
            { bind: "applicationReference", label: "Reference" },
            { bind: "approvedAt", label: "Approved on" },
          ],
          style: { marginBottom: 18 },
          type: "keyValue",
        },
        {
          style: { marginBottom: 12 },
          text: "Dear {{parentName}},",
          type: "text",
        },
        {
          style: { marginBottom: 16 },
          text: "We are pleased to confirm that {{studentName}} has been offered admission into {{classroomName}}.",
          type: "text",
        },
        {
          items: [
            { bind: "payment.label", label: "Payment" },
            { bind: "payment.amount", label: "Amount" },
            { bind: "payment.dueAt", label: "Due date" },
            { bind: "payment.instructions", label: "Instructions" },
          ],
          style: { marginBottom: 18 },
          title: "Payment details",
          type: "keyValue",
          visibleWhen: { bind: "payment.required", equals: true },
        },
        {
          style: { marginBottom: 18 },
          text: "No admission payment is required before the next step.",
          type: "text",
          visibleWhen: { bind: "payment.required", equals: false },
        },
        {
          label: "Admission Officer",
          type: "signature",
        },
      ],
      margin: 42,
      size: "A4",
    },
  ],
  templateId: "admission-json-simple-v1",
  templateVersion: 1,
});
