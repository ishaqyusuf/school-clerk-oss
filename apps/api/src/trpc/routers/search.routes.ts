import { z } from "@hono/zod-openapi";
import { Prisma } from "@school-clerk/db";
import { authenticatedProcedure, createTRPCRouter } from "../init";

const globalSearchSchema = z.object({
	limit: z.number().int().min(1).max(20).default(8),
	query: z.string().trim().max(100).default(""),
});

type GlobalSearchItem = {
	id: string;
	type: "student" | "staff";
	group: "Students" | "Staff";
	title: string;
	subtitle: string | null;
	href: string;
	rank: number;
};

function normalizeSearchQuery(value: string) {
	return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function clampSimilarityThreshold(query: string) {
	if (query.length >= 10) return 0.2;
	if (query.length >= 6) return 0.24;
	return 0.28;
}

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

export const searchRouter = createTRPCRouter({
	global: authenticatedProcedure
		.input(globalSearchSchema)
		.query(async ({ ctx, input }) => {
			const schoolId = ctx.profile.schoolId;
			const query = normalizeSearchQuery(input.query);

			if (!schoolId || query.length < 2) {
				return [] as GlobalSearchItem[];
			}

			const role = ctx.currentUser?.role ?? null;
			const similarityThreshold = clampSimilarityThreshold(query);
			const peopleTake = Math.min(input.limit, 8);

			const [students, staff] = await Promise.all([
				ctx.db.$queryRaw<
					Array<{ id: string; full_name: string; rank: number }>
				>(
					buildStudentSearchSql({
						query,
						schoolId,
						similarityThreshold,
						take: peopleTake,
					}),
				),
				role === "Teacher" || role === "Admin" || role === "HR"
					? ctx.db.$queryRaw<
							Array<{
								id: string;
								name: string;
								email: string | null;
								rank: number;
							}>
						>(
							buildStaffSearchSql({
								query,
								schoolId,
								similarityThreshold,
								take: peopleTake,
							}),
						)
					: Promise.resolve([]),
			]);

			const results: GlobalSearchItem[] = [
				...students.map((student) => ({
					id: student.id,
					type: "student" as const,
					group: "Students" as const,
					title: student.full_name,
					subtitle: "Student record",
					href: `/students/${student.id}`,
					rank: Number(student.rank) || 0,
				})),
				...staff.map((member) => ({
					id: member.id,
					type: "staff" as const,
					group: "Staff" as const,
					title: member.name,
					subtitle: member.email || "Staff record",
					href: `/staff/${member.id}`,
					rank: Number(member.rank) || 0,
				})),
			];

			return results
				.sort((a, b) => b.rank - a.rank || a.title.localeCompare(b.title))
				.slice(0, input.limit);
		}),
});
