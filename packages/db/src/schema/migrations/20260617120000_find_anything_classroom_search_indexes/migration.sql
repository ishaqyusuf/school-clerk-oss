CREATE INDEX IF NOT EXISTS "ClassRoom_active_schoolProfileId_session_idx"
ON "ClassRoom" ("schoolProfileId", "schoolSessionId")
WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "ClassRoom_search_name_trgm_idx"
ON "ClassRoom"
USING GIN (lower(COALESCE("name", '')) gin_trgm_ops)
WHERE "deletedAt" IS NULL
  AND "schoolProfileId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "ClassRoomDepartment_active_schoolProfileId_idx"
ON "ClassRoomDepartment" ("schoolProfileId")
WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "ClassRoomDepartment_search_department_name_trgm_idx"
ON "ClassRoomDepartment"
USING GIN (lower(COALESCE("departmentName", '')) gin_trgm_ops)
WHERE "deletedAt" IS NULL
  AND "schoolProfileId" IS NOT NULL;
