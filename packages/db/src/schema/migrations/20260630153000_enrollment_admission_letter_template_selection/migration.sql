ALTER TABLE "EnrollmentApplication"
ADD COLUMN "admissionLetterTemplateId" TEXT,
ADD COLUMN "admissionLetterTemplateVersion" INTEGER;

CREATE INDEX "EnrollmentApplication_schoolProfileId_admissionLetterTemplateId_idx"
ON "EnrollmentApplication"("schoolProfileId", "admissionLetterTemplateId");
