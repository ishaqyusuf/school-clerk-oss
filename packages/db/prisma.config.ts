import { defineConfig, env } from "prisma/config";

/**
 * Connection string for Prisma CLI schema commands (db push/pull, migrate diff).
 * Neon URLs carry `channel_binding=require`, which Prisma's schema engine can't
 * negotiate (it reports P1001 "can't reach database" while psql connects fine),
 * and Neon recommends its direct endpoint rather than the `-pooler` one for
 * schema changes. The runtime client (pg adapter) still uses DATABASE_URL as is.
 */
function schemaEngineUrl(databaseUrl: string) {
	try {
		const url = new URL(databaseUrl);
		url.searchParams.delete("channel_binding");
		url.hostname = url.hostname.replace("-pooler.", ".");
		return url.toString();
	} catch {
		return databaseUrl;
	}
}

export default defineConfig({
	datasource: {
		url: schemaEngineUrl(env("DATABASE_URL")),
	},
	migrations: {
		path: "src/schema/migrations",
	},
	schema: "src/schema",
});
