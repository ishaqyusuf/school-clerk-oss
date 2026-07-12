CREATE TYPE "ClassroomSubjectAssessmentPrintMode" AS ENUM ('EXPANDED', 'TOTAL');

ALTER TABLE "ClassroomSubjectAssessment"
ADD COLUMN "printMode" "ClassroomSubjectAssessmentPrintMode" NOT NULL DEFAULT 'EXPANDED';
