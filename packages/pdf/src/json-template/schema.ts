import { z } from "zod";

const bindingPathPattern = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/;

export const jsonDocumentBindingSchema = z
  .string()
  .regex(bindingPathPattern, "Binding must be a dotted data path.");

const jsonDocumentStyleSchema = z.object({
  align: z.enum(["left", "center", "right"]).optional(),
  backgroundColor: z.string().optional(),
  bold: z.boolean().optional(),
  borderColor: z.string().optional(),
  color: z.string().optional(),
  fontSize: z.number().min(6).max(48).optional(),
  height: z.number().min(1).max(720).optional(),
  marginBottom: z.number().min(0).max(96).optional(),
  width: z.number().min(1).max(720).optional(),
});

const visibleWhenSchema = z.object({
  bind: jsonDocumentBindingSchema,
  equals: z.union([z.string(), z.number(), z.boolean()]).optional(),
  exists: z.boolean().optional(),
});

const blockBaseSchema = z.object({
  style: jsonDocumentStyleSchema.optional(),
  visibleWhen: visibleWhenSchema.optional(),
});

const textBlockSchema = blockBaseSchema.extend({
  bind: jsonDocumentBindingSchema.optional(),
  text: z.string().optional(),
  type: z.literal("text"),
});

const imageBlockSchema = blockBaseSchema.extend({
  alt: z.string().optional(),
  bind: jsonDocumentBindingSchema.optional(),
  src: z.string().url().optional(),
  type: z.literal("image"),
});

const keyValueBlockSchema = blockBaseSchema.extend({
  items: z.array(
    z.object({
      bind: jsonDocumentBindingSchema.optional(),
      label: z.string().min(1),
      value: z.string().optional(),
      visibleWhen: visibleWhenSchema.optional(),
    }),
  ),
  title: z.string().optional(),
  type: z.literal("keyValue"),
});

const tableBlockSchema = blockBaseSchema.extend({
  columns: z.array(
    z.object({
      bind: jsonDocumentBindingSchema,
      label: z.string().min(1),
    }),
  ),
  rowsBind: jsonDocumentBindingSchema.optional(),
  title: z.string().optional(),
  type: z.literal("table"),
});

const signatureBlockSchema = blockBaseSchema.extend({
  label: z.string().optional(),
  type: z.literal("signature"),
});

const spacerBlockSchema = blockBaseSchema.extend({
  size: z.number().min(1).max(160).default(16),
  type: z.literal("spacer"),
});

export const jsonDocumentBlockSchema = z.discriminatedUnion("type", [
  textBlockSchema,
  imageBlockSchema,
  keyValueBlockSchema,
  tableBlockSchema,
  signatureBlockSchema,
  spacerBlockSchema,
]);

export const jsonDocumentTemplateSchema = z
  .object({
    documentType: z.enum(["ADMISSION_FORM", "ADMISSION_LETTER", "RESULT_SHEET"]),
    label: z.string().min(1),
    pages: z
      .array(
        z.object({
          blocks: z.array(jsonDocumentBlockSchema),
          margin: z.number().min(0).max(120).default(36),
          size: z.enum(["A4", "LETTER"]).default("A4"),
        }),
      )
      .min(1),
    templateId: z.string().min(1),
    templateVersion: z.number().int().positive(),
  })
  .superRefine((template, ctx) => {
    template.pages.forEach((page, pageIndex) => {
      page.blocks.forEach((block, blockIndex) => {
        if (block.type === "text" && !block.text && !block.bind) {
          ctx.addIssue({
            code: "custom",
            message: "Text blocks need text or bind.",
            path: ["pages", pageIndex, "blocks", blockIndex],
          });
        }

        if (block.type === "image" && !block.src && !block.bind) {
          ctx.addIssue({
            code: "custom",
            message: "Image blocks need src or bind.",
            path: ["pages", pageIndex, "blocks", blockIndex],
          });
        }

        if (block.type === "text" && block.text) {
          const bindings = block.text.matchAll(/\{\{\s*([^}]+)\s*\}\}/g);
          for (const match of bindings) {
            const binding = match[1]?.trim() ?? "";
            if (!bindingPathPattern.test(binding)) {
              ctx.addIssue({
                code: "custom",
                message: `Invalid interpolation binding "${binding}".`,
                path: ["pages", pageIndex, "blocks", blockIndex, "text"],
              });
            }
          }
        }
      });
    });
  });

export type JsonDocumentBlock = z.infer<typeof jsonDocumentBlockSchema>;
export type JsonDocumentTemplate = z.infer<typeof jsonDocumentTemplateSchema>;
