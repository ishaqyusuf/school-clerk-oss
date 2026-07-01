CREATE TABLE "SchoolDocumentTemplatePreference" (
    "id" TEXT NOT NULL,
    "schoolProfileId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateVersion" INTEGER NOT NULL DEFAULT 1,
    "source" TEXT NOT NULL DEFAULT 'code',
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "SchoolDocumentTemplatePreference_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SchoolDocumentTemplatePreference_schoolProfileId_documentType_idx"
ON "SchoolDocumentTemplatePreference"("schoolProfileId", "documentType");

CREATE INDEX "SchoolDocumentTemplatePreference_templateId_idx"
ON "SchoolDocumentTemplatePreference"("templateId");

CREATE UNIQUE INDEX "SchoolDocumentTemplatePreference_active_default_key"
ON "SchoolDocumentTemplatePreference"("schoolProfileId", "documentType")
WHERE "deletedAt" IS NULL;

ALTER TABLE "SchoolDocumentTemplatePreference"
ADD CONSTRAINT "SchoolDocumentTemplatePreference_schoolProfileId_fkey"
FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
