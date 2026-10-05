import { Prisma } from "./generated/client";

function buildStudentSearchSql(params: {
	query: string;
	schoolId: string;
	similarityThreshold: number;
	take: number;
}) {
	const prefixQuery = `${params.query}%`;

	return Prisma.sql`
    WITH candidates AS (
      SELECT
        s.id,
        trim(concat_ws(' ', s."name", s."otherName", s.surname)) AS full_name,
        lower(trim(concat_ws(' ', s."name", s."otherName", s.surname))) AS search_text,
        COALESCE(s."createdAt", NOW()) AS created_at
      FROM "Students" s
      WHERE s."schoolProfileId" = ${params.schoolId}
        AND s."deletedAt" IS NULL
    )
    SELECT
      id,
      full_name,
      CASE
        WHEN search_text = ${params.query} THEN 400
        WHEN search_text LIKE ${prefixQuery} THEN 250
        WHEN similarity(search_text, ${params.query}) >= ${params.similarityThreshold}
          THEN similarity(search_text, ${params.query}) * 100
        ELSE 0
      END AS rank
    FROM candidates
    WHERE search_text LIKE ${prefixQuery}
      OR similarity(search_text, ${params.query}) >= ${params.similarityThreshold}
    ORDER BY
      rank DESC,
      full_name ASC,
      created_at DESC
    LIMIT ${params.take}
  `;
}

function buildStaffSearchSql(params: {
	query: string;
	schoolId: string;
	similarityThreshold: number;
	take: number;
}) {
	const prefixQuery = `${params.query}%`;

	return Prisma.sql`
    WITH candidates AS (
      SELECT
        sp.id,
        sp.name,
        sp.email,
        lower(COALESCE(sp.name, '')) AS search_name,
        lower(COALESCE(sp.email, '')) AS search_email,
        COALESCE(sp."createdAt", NOW()) AS created_at
      FROM "StaffProfile" sp
      WHERE sp."schoolProfileId" = ${params.schoolId}
        AND sp."deletedAt" IS NULL
    )
    SELECT
      id,
      name,
      email,
      GREATEST(
        CASE
          WHEN search_name = ${params.query} THEN 400
          WHEN search_name LIKE ${prefixQuery} THEN 250
          WHEN similarity(search_name, ${params.query}) >= ${params.similarityThreshold}
            THEN similarity(search_name, ${params.query}) * 100
          ELSE 0
        END,
        CASE
          WHEN search_email = ${params.query} THEN 320
          WHEN search_email LIKE ${prefixQuery} THEN 180
          WHEN similarity(search_email, ${params.query}) >= ${params.similarityThreshold}
            THEN similarity(search_email, ${params.query}) * 80
          ELSE 0
        END
      ) AS rank
    FROM candidates
    WHERE search_name LIKE ${prefixQuery}
      OR search_email LIKE ${prefixQuery}
      OR similarity(search_name, ${params.query}) >= ${params.similarityThreshold}
      OR similarity(search_email, ${params.query}) >= ${params.similarityThreshold}
    ORDER BY
      rank DESC,
      name ASC,
      created_at DESC
    LIMIT ${params.take}
  `;
}

function buildClassroomSearchSql(params: {
	includeStudentCounts: boolean;
	query: string;
	schoolId: string;
	sessionId?: string | null;
	similarityThreshold: number;
	take: number;
}) {
	const prefixQuery = `${params.query}%`;

	return Prisma.sql`
    WITH candidates AS (
      SELECT
        cd.id,
        cd."departmentName" AS department_name,
        cr.name AS class_name,
        ss.title AS session_title,
        lower(trim(concat_ws(' ', cr.name, cd."departmentName"))) AS search_text,
        COALESCE(cd."createdAt", cr."createdAt", NOW()) AS created_at,
        CASE WHEN ${params.includeStudentCounts} THEN COUNT(DISTINCT student.id)::int ELSE NULL END AS student_count
      FROM "ClassRoomDepartment" cd
      JOIN "ClassRoom" cr ON cr.id = cd."classRoomsId"
      JOIN "SchoolSession" ss ON ss.id = cr."schoolSessionId"
        AND ss."schoolId" = ${params.schoolId} AND ss."deletedAt" IS NULL
      LEFT JOIN "StudentSessionForm" ssf ON ${params.includeStudentCounts} AND ssf."classroomDepartmentId" = cd.id
        AND ssf."schoolProfileId" = ${params.schoolId} AND ssf."schoolSessionId" = ss.id
        AND ssf."deletedAt" IS NULL
      LEFT JOIN "Students" student ON student.id = ssf."studentId"
        AND student."deletedAt" IS NULL AND student."schoolProfileId" = ${params.schoolId}
      WHERE cd."schoolProfileId" = ${params.schoolId}
        AND cd."deletedAt" IS NULL
        AND cr."schoolProfileId" = ${params.schoolId}
        AND cr."deletedAt" IS NULL
        AND (${params.sessionId ?? null}::text IS NULL OR cr."schoolSessionId" = ${params.sessionId ?? null})
      GROUP BY
        cd.id,
        cd."departmentName",
        cr.name,
        ss.title,
        cr."createdAt"
    )
    SELECT
      id,
      department_name,
      class_name,
      session_title,
      student_count,
      CASE
        WHEN search_text = ${params.query} THEN 400
        WHEN search_text LIKE ${prefixQuery} THEN 250
        WHEN similarity(search_text, ${params.query}) >= ${params.similarityThreshold}
          THEN similarity(search_text, ${params.query}) * 100
        ELSE 0
      END AS rank
    FROM candidates
    WHERE search_text LIKE ${prefixQuery}
      OR similarity(search_text, ${params.query}) >= ${params.similarityThreshold}
    ORDER BY
      rank DESC,
      class_name ASC,
      department_name ASC,
      created_at DESC
    LIMIT ${params.take}
  `;
}


export type SearchReadPolicy = { students: boolean; staff: boolean; classrooms: boolean; classroomStudents: boolean };
export async function searchGlobalRecords(db: Pick<Prisma.TransactionClient, "$queryRaw">, input: {
  schoolId: string; sessionId: string | null; query: string; limit: number; policy: SearchReadPolicy;
}) {
  const similarityThreshold = input.query.length >= 10 ? 0.2 : input.query.length >= 6 ? 0.24 : 0.28;
  const params = { query: input.query, schoolId: input.schoolId, similarityThreshold, take: Math.min(input.limit, 8) };
  const [students, classrooms, staff] = await Promise.all([
    input.policy.students ? db.$queryRaw<Array<{ id: string; full_name: string; rank: number }>>(buildStudentSearchSql(params)) : [],
    input.policy.classrooms ? db.$queryRaw<Array<{ id: string; department_name: string | null; class_name: string | null;
      session_title: string | null; student_count: number | null; rank: number }>>(
        buildClassroomSearchSql({ ...params, sessionId: input.sessionId, includeStudentCounts: input.policy.classroomStudents })) : [],
    input.policy.staff ? db.$queryRaw<Array<{ id: string; name: string; email: string | null; rank: number }>>(buildStaffSearchSql(params)) : [],
  ]);
  return { students, classrooms, staff };
}
