CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Students_active_schoolProfileId_idx"
ON "Students" ("schoolProfileId")
WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "Students_search_name_trgm_idx"
ON "Students"
USING GIN (
  lower(trim(concat_ws(' ', "name", "otherName", "surname"))) gin_trgm_ops
)
WHERE "deletedAt" IS NULL
  AND "schoolProfileId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "StaffProfile_active_schoolProfileId_idx"
ON "StaffProfile" ("schoolProfileId")
WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "StaffProfile_search_name_trgm_idx"
ON "StaffProfile"
USING GIN (lower(COALESCE("name", '')) gin_trgm_ops)
WHERE "deletedAt" IS NULL
  AND "schoolProfileId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "StaffProfile_search_email_trgm_idx"
ON "StaffProfile"
USING GIN (lower(COALESCE("email", '')) gin_trgm_ops)
WHERE "deletedAt" IS NULL
  AND "schoolProfileId" IS NOT NULL;
