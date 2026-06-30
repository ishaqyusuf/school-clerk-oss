-- AlterTable
ALTER TABLE "EnrollmentLink" ADD COLUMN "showOnWebsite" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "EnrollmentLinkClassroom" ADD COLUMN "minimumAgeMonths" INTEGER,
ADD COLUMN "maximumAgeMonths" INTEGER,
ADD COLUMN "ageCutoffDate" TIMESTAMP(0),
ADD COLUMN "requirementNotes" TEXT;

-- AlterTable
ALTER TABLE "EnrollmentLinkDocumentRequirement" ADD COLUMN "classRoomDepartmentId" TEXT;

-- CreateIndex
CREATE INDEX "EnrollmentLink_schoolProfileId_status_showOnWebsite_idx" ON "EnrollmentLink"("schoolProfileId", "status", "showOnWebsite");

-- CreateIndex
CREATE INDEX "EnrollmentLinkDocumentRequirement_enrollmentLinkId_classRoomDepartmentId_sortOrder_idx" ON "EnrollmentLinkDocumentRequirement"("enrollmentLinkId", "classRoomDepartmentId", "sortOrder");

-- CreateIndex
CREATE INDEX "EnrollmentLinkDocumentRequirement_classRoomDepartmentId_idx" ON "EnrollmentLinkDocumentRequirement"("classRoomDepartmentId");

-- AddForeignKey
ALTER TABLE "EnrollmentLinkDocumentRequirement" ADD CONSTRAINT "EnrollmentLinkDocumentRequirement_classRoomDepartmentId_fkey" FOREIGN KEY ("classRoomDepartmentId") REFERENCES "ClassRoomDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
