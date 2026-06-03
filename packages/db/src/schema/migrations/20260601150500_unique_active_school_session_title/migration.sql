CREATE UNIQUE INDEX IF NOT EXISTS "SchoolSession_schoolId_title_active_key"
ON "SchoolSession" ("schoolId", LOWER("title"))
WHERE "deletedAt" IS NULL;
