ALTER TABLE "SchoolProfile"
ADD COLUMN "institutionType" TEXT,
ADD COLUMN "studentCountEstimate" INTEGER,
ADD COLUMN "country" TEXT,
ADD COLUMN "educationSystem" TEXT,
ADD COLUMN "curriculumType" TEXT,
ADD COLUMN "languageOfInstruction" TEXT,
ADD COLUMN "onboardingCompletedAt" TIMESTAMP(0);
