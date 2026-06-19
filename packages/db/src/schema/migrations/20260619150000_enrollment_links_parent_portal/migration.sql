-- CreateEnum
CREATE TYPE "EnrollmentLinkStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EnrollmentCapacityMode" AS ENUM ('TOTAL', 'PER_CLASSROOM');

-- CreateEnum
CREATE TYPE "EnrollmentApplicationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "EnrollmentDocumentReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Guardians" ADD COLUMN "userId" TEXT;

-- CreateTable
CREATE TABLE "EnrollmentLink" (
    "id" TEXT NOT NULL,
    "schoolProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "EnrollmentLinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "capacityMode" "EnrollmentCapacityMode" NOT NULL DEFAULT 'TOTAL',
    "totalCapacity" INTEGER,
    "instructions" TEXT,
    "opensAt" TIMESTAMP(0),
    "closesAt" TIMESTAMP(0),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "EnrollmentLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentLinkClassroom" (
    "id" TEXT NOT NULL,
    "enrollmentLinkId" TEXT NOT NULL,
    "classRoomDepartmentId" TEXT NOT NULL,
    "capacity" INTEGER,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "EnrollmentLinkClassroom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentLinkDocumentRequirement" (
    "id" TEXT NOT NULL,
    "enrollmentLinkId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "uploadRequired" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "EnrollmentLinkDocumentRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentApplication" (
    "id" TEXT NOT NULL,
    "schoolProfileId" TEXT NOT NULL,
    "enrollmentLinkId" TEXT NOT NULL,
    "classRoomDepartmentId" TEXT NOT NULL,
    "studentFirstName" TEXT NOT NULL,
    "studentSurname" TEXT NOT NULL,
    "studentOtherName" TEXT,
    "studentDob" TIMESTAMP(0),
    "studentGender" "Gender" NOT NULL,
    "additionalNotes" TEXT,
    "status" "EnrollmentApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(0),
    "rejectionReason" TEXT,
    "acceptedStudentId" TEXT,
    "acceptedTermFormId" TEXT,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "EnrollmentApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentApplicationParent" (
    "id" TEXT NOT NULL,
    "enrollmentApplicationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relation" TEXT,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "phone2" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "linkedGuardianId" TEXT,
    "linkedUserId" TEXT,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "EnrollmentApplicationParent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentApplicationDocument" (
    "id" TEXT NOT NULL,
    "enrollmentApplicationId" TEXT NOT NULL,
    "requirementId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "storageProvider" TEXT,
    "storageKey" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "reviewStatus" "EnrollmentDocumentReviewStatus" NOT NULL DEFAULT 'PENDING',
    "uploadedAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "EnrollmentApplicationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentLink_code_key" ON "EnrollmentLink"("code");

-- CreateIndex
CREATE INDEX "EnrollmentLink_schoolProfileId_status_idx" ON "EnrollmentLink"("schoolProfileId", "status");

-- CreateIndex
CREATE INDEX "EnrollmentLink_schoolProfileId_createdAt_idx" ON "EnrollmentLink"("schoolProfileId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentLinkClassroom_enrollmentLinkId_classRoomDepartmentId_deletedAt_key" ON "EnrollmentLinkClassroom"("enrollmentLinkId", "classRoomDepartmentId", "deletedAt");

-- CreateIndex
CREATE INDEX "EnrollmentLinkClassroom_classRoomDepartmentId_idx" ON "EnrollmentLinkClassroom"("classRoomDepartmentId");

-- CreateIndex
CREATE INDEX "EnrollmentLinkDocumentRequirement_enrollmentLinkId_sortOrder_idx" ON "EnrollmentLinkDocumentRequirement"("enrollmentLinkId", "sortOrder");

-- CreateIndex
CREATE INDEX "EnrollmentApplication_schoolProfileId_status_createdAt_idx" ON "EnrollmentApplication"("schoolProfileId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "EnrollmentApplication_enrollmentLinkId_status_idx" ON "EnrollmentApplication"("enrollmentLinkId", "status");

-- CreateIndex
CREATE INDEX "EnrollmentApplication_classRoomDepartmentId_status_idx" ON "EnrollmentApplication"("classRoomDepartmentId", "status");

-- CreateIndex
CREATE INDEX "EnrollmentApplication_acceptedStudentId_idx" ON "EnrollmentApplication"("acceptedStudentId");

-- CreateIndex
CREATE INDEX "EnrollmentApplicationParent_enrollmentApplicationId_isPrimary_idx" ON "EnrollmentApplicationParent"("enrollmentApplicationId", "isPrimary");

-- CreateIndex
CREATE INDEX "EnrollmentApplicationParent_linkedGuardianId_idx" ON "EnrollmentApplicationParent"("linkedGuardianId");

-- CreateIndex
CREATE INDEX "EnrollmentApplicationParent_linkedUserId_idx" ON "EnrollmentApplicationParent"("linkedUserId");

-- CreateIndex
CREATE INDEX "EnrollmentApplicationParent_phone_idx" ON "EnrollmentApplicationParent"("phone");

-- CreateIndex
CREATE INDEX "EnrollmentApplicationDocument_enrollmentApplicationId_idx" ON "EnrollmentApplicationDocument"("enrollmentApplicationId");

-- CreateIndex
CREATE INDEX "EnrollmentApplicationDocument_requirementId_idx" ON "EnrollmentApplicationDocument"("requirementId");

-- CreateIndex
CREATE INDEX "EnrollmentApplicationDocument_reviewStatus_idx" ON "EnrollmentApplicationDocument"("reviewStatus");

-- CreateIndex
CREATE INDEX "Guardians_userId_idx" ON "Guardians"("userId");

-- AddForeignKey
ALTER TABLE "Guardians" ADD CONSTRAINT "Guardians_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentLink" ADD CONSTRAINT "EnrollmentLink_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentLinkClassroom" ADD CONSTRAINT "EnrollmentLinkClassroom_enrollmentLinkId_fkey" FOREIGN KEY ("enrollmentLinkId") REFERENCES "EnrollmentLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentLinkClassroom" ADD CONSTRAINT "EnrollmentLinkClassroom_classRoomDepartmentId_fkey" FOREIGN KEY ("classRoomDepartmentId") REFERENCES "ClassRoomDepartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentLinkDocumentRequirement" ADD CONSTRAINT "EnrollmentLinkDocumentRequirement_enrollmentLinkId_fkey" FOREIGN KEY ("enrollmentLinkId") REFERENCES "EnrollmentLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentApplication" ADD CONSTRAINT "EnrollmentApplication_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentApplication" ADD CONSTRAINT "EnrollmentApplication_enrollmentLinkId_fkey" FOREIGN KEY ("enrollmentLinkId") REFERENCES "EnrollmentLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentApplication" ADD CONSTRAINT "EnrollmentApplication_classRoomDepartmentId_fkey" FOREIGN KEY ("classRoomDepartmentId") REFERENCES "ClassRoomDepartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentApplicationParent" ADD CONSTRAINT "EnrollmentApplicationParent_enrollmentApplicationId_fkey" FOREIGN KEY ("enrollmentApplicationId") REFERENCES "EnrollmentApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentApplicationDocument" ADD CONSTRAINT "EnrollmentApplicationDocument_enrollmentApplicationId_fkey" FOREIGN KEY ("enrollmentApplicationId") REFERENCES "EnrollmentApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentApplicationDocument" ADD CONSTRAINT "EnrollmentApplicationDocument_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "EnrollmentLinkDocumentRequirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
