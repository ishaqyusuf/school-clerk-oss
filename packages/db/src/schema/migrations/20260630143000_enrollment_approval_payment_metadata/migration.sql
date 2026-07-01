-- AlterTable
ALTER TABLE "EnrollmentApplication" ADD COLUMN "admissionPaymentRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "admissionPaymentLabel" TEXT,
ADD COLUMN "admissionPaymentAmount" DECIMAL(14,2),
ADD COLUMN "admissionPaymentCurrency" TEXT DEFAULT 'NGN',
ADD COLUMN "admissionPaymentInstructions" TEXT,
ADD COLUMN "admissionPaymentLink" TEXT,
ADD COLUMN "admissionPaymentDueAt" TIMESTAMP(0),
ADD COLUMN "admissionApprovalEmailSentAt" TIMESTAMP(0);

-- CreateIndex
CREATE INDEX "EnrollmentApplication_schoolProfileId_admissionPaymentRequired_idx" ON "EnrollmentApplication"("schoolProfileId", "admissionPaymentRequired");
