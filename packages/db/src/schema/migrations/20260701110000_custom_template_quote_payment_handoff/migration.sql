ALTER TABLE "CustomDocumentTemplateRequest"
ADD COLUMN "quotePaymentInstructions" TEXT,
ADD COLUMN "quotePaymentLink" TEXT,
ADD COLUMN "quotePaymentDueAt" TIMESTAMP(0);
