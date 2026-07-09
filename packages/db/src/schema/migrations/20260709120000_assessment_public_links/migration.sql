CREATE TYPE "AssessmentPublicLinkStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'REVOKED');

ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'assessment_public_link_created';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'assessment_public_link_requested';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'assessment_public_link_approved';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'assessment_public_link_rejected';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'assessment_public_link_revoked';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'assessment_public_link_score_recorded';

CREATE TABLE "AssessmentPublicLink" (
    "id" TEXT NOT NULL,
    "status" "AssessmentPublicLinkStatus" NOT NULL DEFAULT 'PENDING',
    "tokenHash" TEXT,
    "requestedDurationHours" INTEGER NOT NULL DEFAULT 24,
    "selectedDepartmentSubjectIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "selectedStudentTermFormIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reason" TEXT,
    "rejectionNote" TEXT,
    "requesterUserId" TEXT,
    "requesterName" TEXT,
    "requesterEmail" TEXT,
    "createdByUserId" TEXT,
    "createdByName" TEXT,
    "approvedByUserId" TEXT,
    "approvedByName" TEXT,
    "rejectedByUserId" TEXT,
    "rejectedByName" TEXT,
    "revokedByUserId" TEXT,
    "revokedByName" TEXT,
    "approvedAt" TIMESTAMP(0),
    "rejectedAt" TIMESTAMP(0),
    "revokedAt" TIMESTAMP(0),
    "expiresAt" TIMESTAMP(0),
    "lastUsedAt" TIMESTAMP(0),
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "schoolProfileId" TEXT NOT NULL,
    "sessionTermId" TEXT NOT NULL,
    "classRoomDepartmentId" TEXT NOT NULL,

    CONSTRAINT "AssessmentPublicLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssessmentPublicLink_tokenHash_key" ON "AssessmentPublicLink"("tokenHash");
CREATE INDEX "AssessmentPublicLink_schoolProfileId_status_idx" ON "AssessmentPublicLink"("schoolProfileId", "status");
CREATE INDEX "AssessmentPublicLink_schoolProfileId_sessionTermId_classRoomDepartmentId_idx" ON "AssessmentPublicLink"("schoolProfileId", "sessionTermId", "classRoomDepartmentId");
CREATE INDEX "AssessmentPublicLink_requesterUserId_idx" ON "AssessmentPublicLink"("requesterUserId");

ALTER TABLE "AssessmentPublicLink"
ADD CONSTRAINT "AssessmentPublicLink_schoolProfileId_fkey"
FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssessmentPublicLink"
ADD CONSTRAINT "AssessmentPublicLink_sessionTermId_fkey"
FOREIGN KEY ("sessionTermId") REFERENCES "SessionTerm"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssessmentPublicLink"
ADD CONSTRAINT "AssessmentPublicLink_classRoomDepartmentId_fkey"
FOREIGN KEY ("classRoomDepartmentId") REFERENCES "ClassRoomDepartment"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
