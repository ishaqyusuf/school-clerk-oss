CREATE TYPE "StaffClassroomSubjectAccessMode" AS ENUM ('SELECTED', 'ALL');

ALTER TABLE "StaffClassroomDepartmentTermProfiles"
ADD COLUMN "subjectAccessMode" "StaffClassroomSubjectAccessMode" NOT NULL DEFAULT 'SELECTED';
