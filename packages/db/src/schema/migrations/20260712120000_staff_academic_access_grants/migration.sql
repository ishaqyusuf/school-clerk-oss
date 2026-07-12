CREATE TYPE "StaffAcademicAccessScope" AS ENUM ('CLASS', 'DEPARTMENT', 'CLASS_SUBJECT', 'DEPARTMENT_SUBJECT');

CREATE TABLE "StaffAcademicAccessGrant" (
    "id" TEXT NOT NULL,
    "scope" "StaffAcademicAccessScope" NOT NULL,
    "classRoomId" TEXT,
    "classRoomDepartmentId" TEXT,
    "subjectId" TEXT,
    "departmentSubjectId" TEXT,
    "staffTermProfileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "StaffAcademicAccessGrant_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StaffAcademicAccessGrant_staffTermProfileId_scope_idx"
ON "StaffAcademicAccessGrant"("staffTermProfileId", "scope");

CREATE INDEX "StaffAcademicAccessGrant_classRoomId_idx"
ON "StaffAcademicAccessGrant"("classRoomId");

CREATE INDEX "StaffAcademicAccessGrant_classRoomDepartmentId_idx"
ON "StaffAcademicAccessGrant"("classRoomDepartmentId");

CREATE INDEX "StaffAcademicAccessGrant_subjectId_idx"
ON "StaffAcademicAccessGrant"("subjectId");

CREATE INDEX "StaffAcademicAccessGrant_departmentSubjectId_idx"
ON "StaffAcademicAccessGrant"("departmentSubjectId");

ALTER TABLE "StaffAcademicAccessGrant"
ADD CONSTRAINT "StaffAcademicAccessGrant_classRoomId_fkey"
FOREIGN KEY ("classRoomId") REFERENCES "ClassRoom"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StaffAcademicAccessGrant"
ADD CONSTRAINT "StaffAcademicAccessGrant_classRoomDepartmentId_fkey"
FOREIGN KEY ("classRoomDepartmentId") REFERENCES "ClassRoomDepartment"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StaffAcademicAccessGrant"
ADD CONSTRAINT "StaffAcademicAccessGrant_subjectId_fkey"
FOREIGN KEY ("subjectId") REFERENCES "Subject"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StaffAcademicAccessGrant"
ADD CONSTRAINT "StaffAcademicAccessGrant_departmentSubjectId_fkey"
FOREIGN KEY ("departmentSubjectId") REFERENCES "DepartmentSubject"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StaffAcademicAccessGrant"
ADD CONSTRAINT "StaffAcademicAccessGrant_staffTermProfileId_fkey"
FOREIGN KEY ("staffTermProfileId") REFERENCES "StaffTermProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
