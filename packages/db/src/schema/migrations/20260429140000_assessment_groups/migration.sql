ALTER TABLE "ClassroomSubjectAssessment"
ADD COLUMN     "isGroup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentAssessmentId" INTEGER,
ALTER COLUMN   "obtainable" SET DEFAULT 0;

ALTER TABLE "ClassroomSubjectAssessment"
ADD CONSTRAINT "ClassroomSubjectAssessment_parentAssessmentId_fkey"
FOREIGN KEY ("parentAssessmentId") REFERENCES "ClassroomSubjectAssessment"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ClassroomSubjectAssessment_parentAssessmentId_idx"
ON "ClassroomSubjectAssessment"("parentAssessmentId");
