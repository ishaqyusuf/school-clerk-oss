-- AlterTable
ALTER TABLE "EnrollmentLinkDocumentRequirement" ADD COLUMN "documentType" TEXT NOT NULL DEFAULT 'GENERAL';

-- AlterTable
ALTER TABLE "EnrollmentApplicationDocument" ADD COLUMN "documentType" TEXT NOT NULL DEFAULT 'GENERAL';

-- CreateIndex
CREATE INDEX "EnrollmentLinkDocumentRequirement_enrollmentLinkId_documentType_idx" ON "EnrollmentLinkDocumentRequirement"("enrollmentLinkId", "documentType");

-- CreateIndex
CREATE INDEX "EnrollmentApplicationDocument_enrollmentApplicationId_documentType_idx" ON "EnrollmentApplicationDocument"("enrollmentApplicationId", "documentType");
