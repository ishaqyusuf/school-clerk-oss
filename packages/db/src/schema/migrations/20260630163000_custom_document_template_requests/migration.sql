CREATE TYPE "CustomDocumentTemplateRequestStatus" AS ENUM (
    'SUBMITTED',
    'QUOTED',
    'PAID',
    'IN_BUILD',
    'READY',
    'REJECTED'
);

CREATE TABLE "CustomDocumentTemplateRequest" (
    "id" TEXT NOT NULL,
    "schoolProfileId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "status" "CustomDocumentTemplateRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "sourceFileName" TEXT,
    "sourceFileUrl" TEXT,
    "storageProvider" TEXT,
    "storageKey" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "quotedAmount" DECIMAL(14,2),
    "quotedCurrency" TEXT DEFAULT 'NGN',
    "builtTemplateId" TEXT,
    "builtTemplateVersion" INTEGER,
    "builtTemplateJson" JSONB,
    "operatorNotes" TEXT,
    "requestedByUserId" TEXT,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "CustomDocumentTemplateRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomDocumentTemplateRequest_schoolProfileId_documentType_status_idx"
ON "CustomDocumentTemplateRequest"("schoolProfileId", "documentType", "status");

CREATE INDEX "CustomDocumentTemplateRequest_builtTemplateId_idx"
ON "CustomDocumentTemplateRequest"("builtTemplateId");

ALTER TABLE "CustomDocumentTemplateRequest"
ADD CONSTRAINT "CustomDocumentTemplateRequest_schoolProfileId_fkey"
FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
